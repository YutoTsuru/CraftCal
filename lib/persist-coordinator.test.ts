import { describe, expect, it, vi } from "vitest";
import { createPersistCoordinator, type PersistCoordinatorDeps } from "@/lib/persist-coordinator";

/**
 * persist-coordinator のユニットテスト (Issue #48 レビュー指摘対応)。
 *
 * 保存の完了順序を厳密に制御するため、手動で resolve/reject できる deferred Promise を使う。
 * これにより「同一タスクの逆順完了」「再取得中の新規保存」といった、実運用では再現しにくい
 * 並行シナリオを決定的に検証できる。
 */

// サーバースナップショットの代用型（中身は識別用の文字列だけ）
type Snap = { snapshot: string };

// 手動で解決/拒否できる Promise。完了タイミングをテスト側から制御するために使う
type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// マイクロタスク/マクロタスクを一通り流すためのヘルパー。
// 直列化した Promise チェーンが進むのを待つのに使う
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

// テスト用の deps を作る。fetchServer は呼ばれるたびに deferred を積み、
// テスト側から任意のタイミングで解決できるようにする
function makeDeps() {
  const applyServer = vi.fn<(snapshot: Snap) => void>();
  const onSaveError = vi.fn<(error: unknown) => void>();
  const onFetchError = vi.fn<(error: unknown) => void>();
  const fetchDeferreds: Deferred<Snap>[] = [];
  const fetchServer = vi.fn<() => Promise<Snap>>(() => {
    const d = deferred<Snap>();
    fetchDeferreds.push(d);
    return d.promise;
  });
  let contextId: unknown = "user-1";

  const deps: PersistCoordinatorDeps<Snap> = {
    fetchServer,
    applyServer,
    onSaveError,
    onFetchError,
    getContextId: () => contextId
  };

  return {
    deps,
    applyServer,
    onSaveError,
    onFetchError,
    fetchServer,
    fetchDeferreds,
    setContextId: (id: unknown) => {
      contextId = id;
    }
  };
}

describe("createPersistCoordinator", () => {
  it("異なるタスクの失敗A＋成功Bでは、両方 settle 後に再取得が1回だけ走りサーバー内容が反映される", async () => {
    const ctx = makeDeps();
    const coordinator = createPersistCoordinator(ctx.deps);

    const dA = deferred<unknown>();
    const dB = deferred<unknown>();
    // A は keyX、B は keyY（別タスク）なので互いに待たず並行に飛ぶ
    coordinator.run(() => dA.promise, { queueKey: "X" });
    coordinator.run(() => dB.promise, { queueKey: "Y" });

    // B 成功、A 失敗
    dB.resolve(undefined);
    dA.reject(new Error("save failed"));
    await tick();

    // 片方が失敗しても、飛行中の保存が全部終わってから1回だけ再取得する
    expect(ctx.onSaveError).toHaveBeenCalledTimes(1);
    expect(ctx.fetchServer).toHaveBeenCalledTimes(1);
    expect(ctx.applyServer).not.toHaveBeenCalled();

    // 再取得完了 → サーバースナップショット（成功 B を含む最新）が反映される
    ctx.fetchDeferreds[0].resolve({ snapshot: "server-latest" });
    await tick();

    expect(ctx.applyServer).toHaveBeenCalledTimes(1);
    expect(ctx.applyServer).toHaveBeenCalledWith({ snapshot: "server-latest" });
  });

  it("再取得の途中で新しい保存が始まると、その取得結果は破棄され、もう一度取得し直す", async () => {
    const ctx = makeDeps();
    const coordinator = createPersistCoordinator(ctx.deps);

    // 失敗 → 再取得が始まる（fetch はまだ未解決）
    const dFail = deferred<unknown>();
    coordinator.run(() => dFail.promise, { queueKey: "X" });
    dFail.reject(new Error("save failed"));
    await tick();
    expect(ctx.fetchServer).toHaveBeenCalledTimes(1);

    // 再取得の待機中に新しい保存（成功）が始まる → 世代が進む
    const dOk = deferred<unknown>();
    coordinator.run(() => dOk.promise, { queueKey: "Y" });
    dOk.resolve(undefined);
    await tick();

    // 1回目の再取得が完了しても、待機中に新規保存が入った＝取得結果は古いので反映しない
    ctx.fetchDeferreds[0].resolve({ snapshot: "stale" });
    await tick();
    expect(ctx.applyServer).not.toHaveBeenCalled();

    // 破棄した分をやり直すため、2回目の再取得が走る
    expect(ctx.fetchServer).toHaveBeenCalledTimes(2);

    // 2回目は世代が一致するので反映される
    ctx.fetchDeferreds[1].resolve({ snapshot: "fresh" });
    await tick();
    expect(ctx.applyServer).toHaveBeenCalledTimes(1);
    expect(ctx.applyServer).toHaveBeenCalledWith({ snapshot: "fresh" });
  });

  it("複数の失敗が連続しても、再取得は1回にまとめられる（coalescing）", async () => {
    const ctx = makeDeps();
    const coordinator = createPersistCoordinator(ctx.deps);

    // 3件を別キーで並行に飛ばし、すべて失敗させる
    const dA = deferred<unknown>();
    const dB = deferred<unknown>();
    const dC = deferred<unknown>();
    coordinator.run(() => dA.promise, { queueKey: "A" });
    coordinator.run(() => dB.promise, { queueKey: "B" });
    coordinator.run(() => dC.promise, { queueKey: "C" });

    dA.reject(new Error("a"));
    dB.reject(new Error("b"));
    dC.reject(new Error("c"));
    await tick();

    // 失敗は3回通知されるが、再取得は全部が終わってから1回だけ
    expect(ctx.onSaveError).toHaveBeenCalledTimes(3);
    expect(ctx.fetchServer).toHaveBeenCalledTimes(1);

    ctx.fetchDeferreds[0].resolve({ snapshot: "server" });
    await tick();
    // 反映後も過剰な再取得は起きない
    expect(ctx.fetchServer).toHaveBeenCalledTimes(1);
    expect(ctx.applyServer).toHaveBeenCalledTimes(1);
  });

  it("同一 queueKey の保存は送信順に直列化され、直前が settle するまで次は開始しない", async () => {
    const ctx = makeDeps();
    const coordinator = createPersistCoordinator(ctx.deps);

    const startOrder: string[] = [];
    const d1 = deferred<unknown>();
    const d2 = deferred<unknown>();

    // 同じタスク（keyT）への2連続保存
    coordinator.run(
      () => {
        startOrder.push("op1-start");
        return d1.promise;
      },
      { queueKey: "T" }
    );
    coordinator.run(
      () => {
        startOrder.push("op2-start");
        return d2.promise;
      },
      { queueKey: "T" }
    );

    await tick();
    // op1 は開始しているが、op1 が未 settle の間 op2 は開始しない（＝直列化）
    expect(startOrder).toEqual(["op1-start"]);

    // op1 を（あえて後から）解決すると、初めて op2 が開始する。
    // これにより「逆順完了で旧が新を上書きする」ことが構造的に起きえないことを示す
    d1.resolve(undefined);
    await tick();
    expect(startOrder).toEqual(["op1-start", "op2-start"]);

    d2.resolve(undefined);
    await tick();
  });

  it("同一 key の insert 直後 delete は、insert が delete より先に開始する", async () => {
    const ctx = makeDeps();
    const coordinator = createPersistCoordinator(ctx.deps);

    const startOrder: string[] = [];
    coordinator.run(
      () => {
        startOrder.push("insert");
        return Promise.resolve();
      },
      { queueKey: "T" }
    );
    coordinator.run(
      () => {
        startOrder.push("delete");
        return Promise.resolve();
      },
      { queueKey: "T" }
    );

    await tick();
    expect(startOrder).toEqual(["insert", "delete"]);
  });

  it("異なる queueKey の保存は直列化されず、片方が未 settle でも他方は開始する", async () => {
    const ctx = makeDeps();
    const coordinator = createPersistCoordinator(ctx.deps);

    const startOrder: string[] = [];
    const d1 = deferred<unknown>();

    // keyA は未解決のまま止めておく
    coordinator.run(
      () => {
        startOrder.push("opA-start");
        return d1.promise;
      },
      { queueKey: "A" }
    );
    // keyB は別タスク。opA を待たずに開始できるはず
    coordinator.run(
      () => {
        startOrder.push("opB-start");
        return Promise.resolve();
      },
      { queueKey: "B" }
    );

    await tick();
    // opA が未 settle でも opB は開始している＝別タスクを不必要に直列化していない
    expect(startOrder).toContain("opA-start");
    expect(startOrder).toContain("opB-start");

    d1.resolve(undefined);
    await tick();
  });

  it("再取得の途中でコンテキスト（userId）が変わったら、取得結果は反映しない", async () => {
    const ctx = makeDeps();
    const coordinator = createPersistCoordinator(ctx.deps);

    const dFail = deferred<unknown>();
    coordinator.run(() => dFail.promise, { queueKey: "X" });
    dFail.reject(new Error("save failed"));
    await tick();
    expect(ctx.fetchServer).toHaveBeenCalledTimes(1);

    // 再取得の待機中にログアウト／ユーザー切替が起きる
    ctx.setContextId("user-2");
    ctx.fetchDeferreds[0].resolve({ snapshot: "other-user" });
    await tick();

    // 別ユーザーのデータで現在の画面を上書きしないよう、反映しない
    expect(ctx.applyServer).not.toHaveBeenCalled();
  });

  it("保存失敗時に restoreOnFailure が呼ばれ、memory-only state を復元できる", async () => {
    const ctx = makeDeps();
    const coordinator = createPersistCoordinator(ctx.deps);

    const restoreOnFailure = vi.fn();
    const dFail = deferred<unknown>();
    coordinator.run(() => dFail.promise, { queueKey: "X", restoreOnFailure });
    dFail.reject(new Error("save failed"));
    await tick();

    expect(restoreOnFailure).toHaveBeenCalledTimes(1);
  });
});
