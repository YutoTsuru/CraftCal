/**
 * persist-coordinator: 楽観更新の「保存調整」と「失敗時ロールバック」を担う純モジュール。
 *
 * Issue #48 (レビュー指摘対応):
 * もともとこのロジックは components/AppProvider.tsx の persist / maybeRollback と
 * 4つの useRef（pendingSavesRef, saveSeqRef, rollbackPendingRef, rollbackRunningRef）が
 * 担っていた。しかし React に密結合していたためユニットテストできず、
 * 独立レビュー（Codex）から「同一タスクの保存が逆順で完了すると旧い値が新しい値を
 * 上書きしうる」欠陥を指摘された。
 * そこで React 非依存の純モジュールへ切り出し、次の2点を実現する:
 *   1. 同一 queueKey の保存を「送信順」に直列化する（逆順完了バグの根治）
 *   2. 完了順序を deferred Promise で制御したユニットテストを可能にする
 *
 * なぜ useRef ではなくモジュール内クロージャ変数（let）で状態を持つか:
 *   楽観更新は同じ tick 内で複数の catch/finally が連続で走る。これらは
 *   「再レンダリングを待たずに即座に最新値を読み書きする」必要があり、React の
 *   state（次のレンダーまで反映されない）では扱えない。ref でも実現できるが、
 *   ref は React に依存するためテストできない。クロージャ変数なら ref と同じ
 *   「即時反映・同期読み書き」の性質を保ったまま、React から独立してテストできる。
 */

// createPersistCoordinator に注入する依存。React 側（AppProvider）の setter/ref を
// クロージャで包んで渡す。総称 S はサーバースナップショットの型（AppProvider では
// { projects, tasks }）。
export type PersistCoordinatorDeps<S> = {
  // 失敗検知後、飛行中の保存が全部終わったら呼ばれる。サーバーから最新を取得して返す
  fetchServer: () => Promise<S>;
  // 取得したスナップショットを state に反映する（React 側の setState 群）
  applyServer: (snapshot: S) => void;
  // 保存が失敗したとき（バナー表示）。毎回の失敗で呼ばれる
  onSaveError: (error: unknown) => void;
  // 再取得自体が失敗したとき（ログ用）。無限ループを避けるため巻き戻しは行わない
  onFetchError: (error: unknown) => void;
  // 現在のコンテキスト識別子（= userId）。fetch 前後で変わっていたら反映しない
  getContextId: () => unknown;
};

export type PersistRunOptions = {
  // 同じ queueKey の保存は「送信順」を保証する（＝直列化）。異なる key は並行のまま。
  // タスク更新は task.id、プロジェクト更新は project.id を渡す。
  // null/未指定は順序保証なし（並行実行）
  queueKey?: string | null;
  // 保存が失敗したときに memory-only な state（schedule/sprint）を元に戻すための復元処理
  restoreOnFailure?: () => void;
};

export type PersistCoordinator = {
  run: (op: () => Promise<unknown>, options?: PersistRunOptions) => void;
};

export function createPersistCoordinator<S>(deps: PersistCoordinatorDeps<S>): PersistCoordinator {
  // queueKey ごとの「直前の保存 Promise」。同じ key の保存はこの Promise が settle して
  // から実行することで送信順を保証する。異なる key は別エントリなので互いに待たない。
  const queues = new Map<string, Promise<unknown>>();

  // 飛行中の保存件数。0 になるまで再取得（ロールバック）を始めない。
  // queueKey 指定で待機中の保存も「飛行中」として数えるため、run の入口で +1 する。
  // こうしないと、待機中の保存が DB に届く前のスナップショットを読んでしまう。
  let pendingSaves = 0;
  // 保存が始まるたびに +1 する通し番号（世代）。再取得の前後で値が変わっていたら
  // 「待っている間に新しい保存が始まった」＝取得結果は古いので捨てる、の判定に使う。
  let saveSeq = 0;
  // 再取得が必要かどうか。失敗を検知した時点ではフラグを立てるだけにする。
  let rollbackPending = false;
  // 再取得の実行中フラグ。失敗が重なっても再取得は1本にまとめる（coalescing）。
  let rollbackRunning = false;

  // 楽観更新が失敗したときに、サーバーの内容で state を上書きして巻き戻す。
  // 呼ばれるのは「run の finally（保存が1件終わるたび）」と
  // 「この関数自身の finally（再取得が必要なまま残っていたとき）」の2か所。
  // 条件を満たさないときは何もせず戻り、あとで必ず呼び直される作りにしてある。
  const maybeRollback = async () => {
    // 再取得の必要がない
    if (!rollbackPending) {
      return;
    }
    // まだ保存が飛んでいる。最後の1件が終わったときに run の finally から再度呼ばれるので、
    // ここで取りに行くと「未反映の保存」を含まない古いスナップショットを読んでしまう
    if (pendingSaves > 0) {
      return;
    }
    // すでに再取得中。二重に走らせない（この関数の finally で必要なら呼び直される）
    if (rollbackRunning) {
      return;
    }

    // 実行を始める時点でフラグを下ろす。
    // 再取得中に新たな保存失敗が起きたら再び true になり、下の finally で拾い直せる
    rollbackPending = false;
    rollbackRunning = true;
    // 待っている間に新しい保存が始まっていないかを判定するための世代とコンテキスト
    const startedSeq = saveSeq;
    const startedContextId = deps.getContextId();

    try {
      const snapshot = await deps.fetchServer();

      // 待っている間にログアウト／ユーザー切替が起きていたら反映しない
      if (deps.getContextId() !== startedContextId) {
        return;
      }
      // 待っている間に新しい保存が始まっていたら、取得結果はすでに古い。
      // 反映すると新しい変更を画面から消してしまうので捨て、あとでやり直す
      if (saveSeq !== startedSeq) {
        rollbackPending = true;
        return;
      }

      deps.applyServer(snapshot);
    } catch (error) {
      // 再取得自体が失敗した場合はログのみ。rollbackPending を立て直さないことで
      // 「再取得失敗 → 即再取得 → また失敗」の無限ループを避ける
      deps.onFetchError(error);
    } finally {
      rollbackRunning = false;
      // 実行中に新たな失敗が起きた／結果を捨てた場合はここで拾い直す。
      // 「実行中だからスキップ」で終わらせると必要な再取得を取りこぼす（coalescing の取りこぼし防止）
      if (rollbackPending) {
        void maybeRollback();
      }
    }
  };

  const run = (op: () => Promise<unknown>, options?: PersistRunOptions) => {
    // 飛行中の保存として数え、世代を進める。
    // queueKey 指定で待機中でも入口で +1 するのが要点（上の pendingSaves の説明を参照）。
    pendingSaves += 1;
    saveSeq += 1;

    // op を実行し、失敗ハンドリングと後始末を包んだ本体。
    // 直列化する場合は「直前の Promise が settle してから」この wrapped を呼ぶ。
    const wrapped = () =>
      op()
        .catch((error) => {
          deps.onSaveError(error);
          // ここでは「再取得が必要」と印を付け、memory-only state を復元するだけ。
          // 他の保存がまだ飛んでいる可能性があるため、実際の再取得は finally 側に任せる
          rollbackPending = true;
          options?.restoreOnFailure?.();
        })
        .finally(() => {
          pendingSaves -= 1;
          // 自分が最後の1件なら、ここで初めて再取得が走る
          void maybeRollback();
        });

    const queueKey = options?.queueKey ?? null;

    // queueKey が無ければ即時実行（順序保証なし・並行）
    if (queueKey == null) {
      void wrapped();
      return;
    }

    // 同じ key の直前 Promise が settle してから wrapped を実行することで送信順を保証する。
    // prev の成否に関わらず続行したいので then(wrapped, wrapped) を使う。
    // 異なる key は別エントリなので互いに待たず、不必要な直列化をしない。
    const prev = queues.get(queueKey) ?? Promise.resolve();
    const next = prev.then(wrapped, wrapped);
    queues.set(queueKey, next);

    // Map が無限に育たないよう、その key の最新 Promise が settle したら削除する。
    // 途中で同じ key に新しい保存が積まれていたら（queues.get !== next）消さない
    void next.finally(() => {
      if (queues.get(queueKey) === next) {
        queues.delete(queueKey);
      }
    });
  };

  return { run };
}
