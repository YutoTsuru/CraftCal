"use client";

/**
 * AppProvider: アプリ全体のデータ（tasks / projects / sprint / schedule）と
 * その更新アクションを供給するコンテキスト。
 *
 * Issue #48: 以前は state とアクションを1つの useMemo にまとめていたため、
 * タスク1件を編集しただけで context value 全体が作り直され、
 * useDevCalendar() を使う全コンポーネントが再レンダリングされていた。
 * そこで Context を次の2つに分割している:
 *   - StateContext   … tasks / projects / sprint / schedule / dataLoading / canImportLocalData
 *   - ActionsContext … 全アクション関数（useMemo(..., []) で同一性を固定＝一度も作り直さない）
 * アクションは最新の state を「ref 経由」で読むため、クロージャ依存がなくなり同一性を保てる。
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { generateSchedule } from "@/lib/schedule";
import { createSeedData } from "@/lib/seed-data";
import { INBOX_PROJECT_ID, STORAGE_KEY, createEmptyState, ensureInboxProject, loadState } from "@/lib/storage";
import { useAuth } from "@/components/AuthProvider";
import {
  deleteAllProjects,
  deleteProject as deleteProjectRow,
  insertProject,
  listProjects,
  updateProject as updateProjectRow
} from "@/lib/services/projects";
import {
  deleteAllTasks,
  deleteTask as deleteTaskRow,
  insertTask,
  insertTasks,
  listTasks,
  updateTask as updateTaskRow
} from "@/lib/services/tasks";
import type {
  DevCalendarActions,
  DevCalendarContextValue,
  DevCalendarStateValue,
  Project,
  ScheduleDay,
  Sprint,
  Task,
  TaskFormInput,
  TaskStatus
} from "@/types/dev-calendar";

// Issue #48: state 用とアクション用で Context を分ける。
// state が変わってもアクション側の value は変わらないので、
// useDevCalendarActions() だけを使うコンポーネントは再レンダリングされない。
const StateContext = createContext<DevCalendarStateValue | null>(null);
const ActionsContext = createContext<DevCalendarActions | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  // sprint / schedule はメモリのみ（Supabase にも localStorage にも保存しない）。
  // 旧スプリント機能の永続化は廃止し、その場の計算結果としてだけ保持する。
  const [sprint, setSprintState] = useState<Sprint | null>(null);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  // Supabase からの初回読み込み中フラグ
  const [dataLoading, setDataLoading] = useState(false);
  // サーバーが空 かつ 旧 localStorage にデータが残っているとき true（取り込みカードの表示条件）
  const [canImportLocalData, setCanImportLocalData] = useState(false);
  // サーバーへの保存に失敗したとき true。画面上部に警告バナーを出す
  const [persistError, setPersistError] = useState(false);

  // ログイン状態に応じて Supabase から hydrate する。
  // user が変わった（ログイン/ログアウト）ときだけ再実行したいので user.id を依存にする
  // （トークン更新で user オブジェクト参照が変わっても id は不変のため無駄な再取得を避ける）
  const userId = user?.id ?? null;

  // Issue #48: アクションが最新 state を読むための ref。
  // useEffect で同期すると「同じレンダー内で連続してアクションを呼んだとき」に古い値を読むため、
  // レンダー中に代入して確実に最新へ揃える（アクションはレンダー後のイベントでしか呼ばれない）。
  const tasksRef = useRef(tasks);
  const projectsRef = useRef(projects);
  const sprintRef = useRef(sprint);
  const userIdRef = useRef(userId);
  tasksRef.current = tasks;
  projectsRef.current = projects;
  sprintRef.current = sprint;
  userIdRef.current = userId;

  // Issue #48: 保存失敗時のサーバー再取得（ロールバック）を制御する4つの ref。
  // なぜ4つも必要か:
  //
  // 楽観更新は「先に画面を書き換えて、あとから DB へ送る」ので、
  // 保存が失敗したときは「サーバーの正しい内容を取り直して画面を上書きする」＝ロールバックが要る。
  // ところが保存は複数同時に飛ぶことがある（例: components/planner/usePlannerChat.ts の reflect() は
  // rescheduleTask を N 件まとめて呼ぶ）。そのうち1件だけ失敗したときに素朴に再取得すると、
  // 「まだ飛行中の他の保存」がサーバーに届く前のスナップショットを読んでしまい、
  // 成功したはずの変更まで画面上で古い値に戻ってしまう。
  // さらに悪いことに、戻った表示を土台にユーザーが再編集すると
  // （lib/db-mappers.ts の toDbTaskUpdate は全カラムを送るため）DB 側の変更を実際に消してしまう。
  // これを防ぐために「飛行中の保存が全部終わってから再取得する」「再取得中に新しい保存が
  // 始まっていたら結果を捨ててやり直す」の2点を保証する必要があり、それぞれに ref を使う。
  //
  // - pendingSavesRef   : 飛行中の保存件数。0 になるまで再取得を始めない
  // - saveSeqRef        : persist が呼ばれるたびに +1 する通し番号（世代）。
  //                       再取得の前後で値が変わっていたら「待っている間に新しい保存が始まった」＝結果は古いので捨てる
  // - rollbackPendingRef: 再取得が必要かどうか。失敗を検知した時点ではフラグを立てるだけにする
  // - rollbackRunningRef: 再取得の実行中フラグ。失敗が重なっても再取得は1本にまとめる
  //
  // state ではなく ref なのは、同じ tick 内に複数の catch/finally が連続で走っても
  // 再レンダリングを待たずに即座に最新値を読み書きできる必要があるため。
  const pendingSavesRef = useRef(0);
  const saveSeqRef = useRef(0);
  const rollbackPendingRef = useRef(false);
  const rollbackRunningRef = useRef(false);

  useEffect(() => {
    // 未ログイン: 空状態に戻す（保護ルート外への遷移時などの防御）
    if (!userId) {
      setTasks([]);
      setProjects([]);
      setSchedule([]);
      setSprintState(null);
      setCanImportLocalData(false);
      setPersistError(false);
      setDataLoading(false);
      return;
    }

    let cancelled = false;
    setDataLoading(true);

    (async () => {
      try {
        const [dbProjects, dbTasks] = await Promise.all([listProjects(), listTasks()]);
        if (cancelled) {
          return;
        }
        // 仮想 Inbox を合成して state に反映する
        setProjects(ensureInboxProject(dbProjects));
        setTasks(dbTasks);

        // ローカルデータ取り込み判定:
        // サーバーが tasks 0件 かつ projects 0件（Inbox は DB に存在しない）で、
        // 旧 localStorage に tasks が1件以上あれば取り込みカードを出せる
        const serverEmpty = dbTasks.length === 0 && dbProjects.length === 0;
        const local = loadState();
        setCanImportLocalData(serverEmpty && local.tasks.length >= 1);
      } catch (error) {
        if (cancelled) {
          return;
        }
        // 個人データ・トークンは出さない
        console.error("[CraftCal] 保存に失敗:", error);
        setPersistError(true);
      } finally {
        if (!cancelled) {
          setDataLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Issue #48: アクション群。依存配列は [] のまま固定し、この value は二度と作り直さない。
  // 現在値が必要な処理はすべて上の ref から読む。
  const actions = useMemo<DevCalendarActions>(() => {
    // 楽観更新が失敗したときに、サーバーの内容で state を上書きして巻き戻す (Issue #48)。
    // 逆操作を当てる方式は連続操作で不整合になりやすいため採らない。
    //
    // 呼ばれるのは「persist の finally（保存が1件終わるたび）」と
    // 「この関数自身の finally（再取得が必要なまま残っていたとき）」の2か所。
    // 条件を満たさないときは何もせず戻り、あとで必ず呼び直される作りにしてある。
    const maybeRollback = async () => {
      // 再取得の必要がない
      if (!rollbackPendingRef.current) {
        return;
      }
      // まだ保存が飛んでいる。最後の1件が終わったときに persist の finally から再度呼ばれるので、
      // ここで取りに行くと「未反映の保存」を含まない古いスナップショットを読んでしまう
      if (pendingSavesRef.current > 0) {
        return;
      }
      // すでに再取得中。二重に走らせない（この関数の finally で必要なら呼び直される）
      if (rollbackRunningRef.current) {
        return;
      }
      // 未ログインなら取りに行かない
      const currentUserId = userIdRef.current;
      if (!currentUserId) {
        return;
      }

      // 実行を始める時点でフラグを下ろす。
      // 再取得中に新たな保存失敗が起きたら再び true になり、下の finally で拾い直せる
      rollbackPendingRef.current = false;
      rollbackRunningRef.current = true;
      // 待っている間に新しい保存が始まっていないかを判定するための世代
      const startedSeq = saveSeqRef.current;

      try {
        const [dbProjects, dbTasks] = await Promise.all([listProjects(), listTasks()]);

        // 待っている間にログアウト／ユーザー切替が起きていたら反映しない
        if (userIdRef.current !== currentUserId) {
          return;
        }
        // 待っている間に新しい保存が始まっていたら、取得結果はすでに古い。
        // 反映すると新しい変更を画面から消してしまうので捨て、あとでやり直す
        if (saveSeqRef.current !== startedSeq) {
          rollbackPendingRef.current = true;
          return;
        }

        // 初回 hydrate と同じ扱い: 仮想 Inbox を合成してから state に入れる
        setProjects(ensureInboxProject(dbProjects));
        setTasks(dbTasks);

        // schedule はメモリのみだが、deleteTask が楽観的に taskId を落としている。
        // 削除が失敗してタスクが復活した場合に備え、サーバーに存在しない taskId だけを除去して整合させる
        const aliveTaskIds = new Set(dbTasks.map((task) => task.id));
        setSchedule((current) =>
          current.map((day) => ({
            ...day,
            taskIds: day.taskIds.filter((taskId) => aliveTaskIds.has(taskId))
          }))
        );

        // 取り込みカードの表示条件も初回 hydrate と同じロジックで計算し直す
        // （importLocalData が途中で失敗したときに表示が実態とズレるのを防ぐ）
        const serverEmpty = dbTasks.length === 0 && dbProjects.length === 0;
        const local = loadState();
        setCanImportLocalData(serverEmpty && local.tasks.length >= 1);

        // ここまで来たら state はサーバーと一致している＝巻き戻しは完了。警告バナーを消す
        setPersistError(false);
      } catch (error) {
        // 再取得自体が失敗した場合はバナーを出したまま state はそのまま（無限ループを避ける）。
        // 保存失敗と区別できるよう文言を分けている（個人データ・トークンは出さない）
        console.error("[CraftCal] 再取得に失敗:", error);
      } finally {
        rollbackRunningRef.current = false;
        // 実行中に新たな失敗が起きた／結果を捨てた場合はここで拾い直す。
        // 「実行中だからスキップ」で終わらせると必要な再取得を取りこぼす
        if (rollbackPendingRef.current) {
          void maybeRollback();
        }
      }
    };

    // 楽観更新の非同期部分。失敗したら警告バナーを出し、サーバーの内容へ巻き戻す
    // （個人データ・トークンは出さない）
    const persist = (op: () => Promise<unknown>) => {
      // 飛行中の保存として数え、世代を進める（再取得側がこの2つを見て待ち合わせる）
      pendingSavesRef.current += 1;
      saveSeqRef.current += 1;

      void op()
        .catch((error) => {
          console.error("[CraftCal] 保存に失敗:", error);
          setPersistError(true);
          // ここでは「再取得が必要」と印を付けるだけ。
          // 他の保存がまだ飛んでいる可能性があるため、実際の再取得は finally 側に任せる
          rollbackPendingRef.current = true;
        })
        .finally(() => {
          pendingSavesRef.current -= 1;
          // 自分が最後の1件なら、ここで初めて再取得が走る
          void maybeRollback();
        });
    };

    const addTask = (input: TaskFormInput) => {
      const projectId = input.projectId ?? projectsRef.current[0]?.id ?? INBOX_PROJECT_ID;
      const now = new Date().toISOString();

      const task: Task = {
        id: crypto.randomUUID(),
        projectId,
        title: input.title,
        memo: input.memo,
        weight: input.weight,
        priority: input.priority ?? "medium",
        dueDate: input.dueDate ?? null,
        scheduledDate: input.scheduledDate ?? null,
        estimatedMinutes: typeof input.estimatedMinutes === "number" ? input.estimatedMinutes : null,
        status: "todo",
        createdAt: now,
        updatedAt: now
      };

      // ローカル即時反映 → DB へ非同期保存
      setTasks((current) => [task, ...current]);
      persist(() => insertTask(task));
    };

    const deleteTask = (id: string) => {
      setTasks((current) => current.filter((task) => task.id !== id));
      setSchedule((current) =>
        current.map((day) => ({
          ...day,
          taskIds: day.taskIds.filter((taskId) => taskId !== id)
        }))
      );
      persist(() => deleteTaskRow(id));
    };

    const updateTaskStatus = (id: string, status: TaskStatus) => {
      const now = new Date().toISOString();
      const target = tasksRef.current.find((task) => task.id === id);
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, status, updatedAt: now } : task))
      );
      if (target) {
        persist(() => updateTaskRow({ ...target, status, updatedAt: now }));
      }
    };

    const updateTask = (id: string, input: TaskFormInput) => {
      const now = new Date().toISOString();
      const target = tasksRef.current.find((task) => task.id === id);
      if (!target) {
        return;
      }
      const updated: Task = {
        ...target,
        projectId: input.projectId ?? target.projectId,
        title: input.title,
        memo: input.memo,
        weight: input.weight,
        priority: input.priority ?? target.priority,
        dueDate: input.dueDate ?? null,
        scheduledDate: input.scheduledDate ?? null,
        // undefined = 変更なし（既存値を維持） / null = クリア（未設定に戻す） / 数値 = その値に設定 (Issue #44)
        estimatedMinutes: input.estimatedMinutes === undefined ? target.estimatedMinutes : input.estimatedMinutes,
        updatedAt: now
      };
      setTasks((current) => current.map((task) => (task.id === id ? updated : task)));
      persist(() => updateTaskRow(updated));
    };

    const rescheduleTask = (id: string, scheduledDate: string | null) => {
      const now = new Date().toISOString();
      const target = tasksRef.current.find((task) => task.id === id);
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, scheduledDate, updatedAt: now } : task))
      );
      if (target) {
        persist(() => updateTaskRow({ ...target, scheduledDate, updatedAt: now }));
      }
    };

    const completeTask = (id: string, note?: string | null, url?: string | null) => {
      const now = new Date().toISOString();
      const target = tasksRef.current.find((task) => task.id === id);
      const patch = {
        status: "done" as const,
        completedAt: now,
        completionNote: note ?? null,
        completionUrl: url ?? null,
        updatedAt: now
      };
      setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
      if (target) {
        persist(() => updateTaskRow({ ...target, ...patch }));
      }
    };

    const setSprint = (nextSprint: Sprint) => {
      setSprintState(nextSprint);
    };

    const generateSprintSchedule = () => {
      // sprint に projectId があればそのプロジェクトのタスクだけを対象にする
      const currentSprint = sprintRef.current;
      const currentTasks = tasksRef.current;
      const targetTasks = currentSprint?.projectId
        ? currentTasks.filter((t) => t.projectId === currentSprint.projectId && t.status !== "done")
        : currentTasks.filter((t) => t.status !== "done");
      setSchedule(generateSchedule(targetTasks, currentSprint));
    };

    const addProject = (p: Omit<Project, "id" | "createdAt" | "updatedAt"> & { id?: string }) => {
      const now = new Date().toISOString();
      const project: Project = {
        id: p.id ?? crypto.randomUUID(),
        name: p.name,
        description: p.description ?? null,
        overviewUrl: p.overviewUrl ?? null,
        color: p.color ?? null,
        status: p.status,
        goal: p.goal ?? null,
        createdAt: now,
        updatedAt: now
      };

      setProjects((cur) => [project, ...cur]);
      persist(() => insertProject(project));
    };

    const updateProject = (id: string, patch: Partial<Project>) => {
      const now = new Date().toISOString();
      const target = projectsRef.current.find((pr) => pr.id === id);
      if (!target) {
        return;
      }
      const updated: Project = { ...target, ...patch, updatedAt: now };
      setProjects((cur) => cur.map((pr) => (pr.id === id ? updated : pr)));
      persist(() => updateProjectRow(updated));
    };

    const deleteProject = (id: string) => {
      // ローカルは従来どおりタスクを Inbox へ付け替える。
      // DB 側は行削除のみ（FK ON DELETE SET NULL でタスクの project_id が null=Inbox になる）
      setTasks((cur) => cur.map((t) => (t.projectId === id ? { ...t, projectId: INBOX_PROJECT_ID } : t)));
      setProjects((cur) => cur.filter((p) => p.id !== id));
      persist(() => deleteProjectRow(id));
    };

    const resetAll = () => {
      const empty = createEmptyState();
      setTasks(empty.tasks);
      setSprintState(empty.sprint);
      setSchedule(empty.schedule);
      setProjects(empty.projects ?? []);
      setCanImportLocalData(false);
      // DB からも自分の tasks → projects の順で全削除する（FK 依存のため tasks が先）
      persist(async () => {
        await deleteAllTasks();
        await deleteAllProjects();
      });
    };

    // サンプルデータ投入。既存タスクがあるときは何もしない（ボタン側でも非表示）。
    // createSeedData() の結果を DB に保存してから state に反映する
    const seedSampleData = () => {
      if (tasksRef.current.length > 0) {
        return;
      }

      const seed = createSeedData();
      persist(async () => {
        // タスクは project_id で参照するため、プロジェクトを先に登録する
        for (const project of seed.projects) {
          await insertProject(project);
        }
        await insertTasks(seed.tasks);
        // DB 保存が成功してから state 反映（Inbox は既存を残し前にサンプル2件を足す）
        setProjects((cur) => [...seed.projects, ...cur.filter((p) => p.id !== INBOX_PROJECT_ID)]);
        setTasks(seed.tasks);
        setCanImportLocalData(false);
      });
    };

    // 旧 localStorage のデータを Supabase へ取り込む。
    // 成功したら localStorage を削除して二重取り込みを防ぎ、state にも反映する
    const importLocalData = () => {
      const local = loadState();
      // Inbox は DB に作らないため取り込み対象から除く
      const importProjects = (local.projects ?? []).filter((p) => p.id !== INBOX_PROJECT_ID);
      const importTasks = local.tasks;

      persist(async () => {
        for (const project of importProjects) {
          await insertProject(project);
        }
        await insertTasks(importTasks);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        setProjects(ensureInboxProject(importProjects));
        setTasks(importTasks);
        setCanImportLocalData(false);
      });
    };

    return {
      addTask,
      deleteTask,
      updateTaskStatus,
      completeTask,
      updateTask,
      rescheduleTask,
      setSprint,
      generateSprintSchedule,
      addProject,
      updateProject,
      deleteProject,
      seedSampleData,
      resetAll,
      importLocalData
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Issue #48: state 側の value。ここは今までどおり state が変わるたびに作り直される。
  const state = useMemo<DevCalendarStateValue>(
    () => ({ tasks, sprint, schedule, projects, dataLoading, canImportLocalData }),
    [tasks, sprint, schedule, projects, dataLoading, canImportLocalData]
  );

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>
        {/* サーバー保存失敗の警告バナー。
            Supabase への書き込みが失敗している間だけ画面最上部に固定表示する。
            全ページ共通で出すため、アプリ全体を包むこの Provider で描画している */}
        {persistError && (
          <div
            role="alert"
            className="fixed inset-x-0 top-0 z-[60] bg-rose-600 px-4 py-2 text-center text-sm font-medium text-white"
          >
            サーバーへの保存に失敗しました。通信状態を確認してページを再読み込みしてください
          </div>
        )}
        {/* 初回データ読み込み中は children の代わりにローディングを出す。
            コンテキスト自体は提供し続けるので、読み込み完了後は再マウントなしで children が表示される */}
        {dataLoading ? <LoadingScreen /> : children}
      </ActionsContext.Provider>
    </StateContext.Provider>
  );
}

// Issue #48: state だけを購読するフック。tasks / projects などが変わったときだけ再レンダリングされる
export function useDevCalendarState() {
  const context = useContext(StateContext);

  if (!context) {
    throw new Error("useDevCalendarState must be used within AppProvider");
  }

  return context;
}

// Issue #48: アクションだけを購読するフック。
// value は useMemo(..., []) で固定なので、state が変わっても再レンダリングされない
export function useDevCalendarActions() {
  const context = useContext(ActionsContext);

  if (!context) {
    throw new Error("useDevCalendarActions must be used within AppProvider");
  }

  return context;
}

// Issue #48: 既存互換フック。分割前と同じ「state + actions が混ざった1つのオブジェクト」を返す。
// 既存の利用箇所を一度に書き換えないために残している（新規コードでは上の2つを使うのが望ましい）
export function useDevCalendar(): DevCalendarContextValue {
  const state = useContext(StateContext);
  const actions = useContext(ActionsContext);

  if (!state || !actions) {
    throw new Error("useDevCalendar must be used within AppProvider");
  }

  // state が変わったときだけマージし直す（actions は同一性が固定されているため依存に入れても再計算されない）
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
