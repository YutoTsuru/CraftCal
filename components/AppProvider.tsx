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
import { SplashScreen } from "@/components/SplashScreen";
import { generateSchedule } from "@/lib/schedule";
import { createSeedData } from "@/lib/seed-data";
import { createPersistCoordinator, type PersistRunOptions } from "@/lib/persist-coordinator";
import { INBOX_PROJECT_ID, STORAGE_KEY, createEmptyState, ensureInboxProject, loadState } from "@/lib/storage";
import { useAuth } from "@/components/AuthProvider";
import { deleteLogsForTask, restoreDailyLogs } from "@/lib/dailyLogs";
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
  listTasks,
  updateTask as updateTaskRow
} from "@/lib/services/tasks";
import { importUserData } from "@/lib/services/bulk-import";
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
  // Issue #48 (レビュー指摘対応): deleteTask / resetAll の保存失敗時に schedule を
  // 元へ戻すため、schedule もレンダー中に ref へ同期しておく（他の ref と同じ理由）。
  const scheduleRef = useRef(schedule);
  tasksRef.current = tasks;
  projectsRef.current = projects;
  sprintRef.current = sprint;
  userIdRef.current = userId;
  scheduleRef.current = schedule;

  // Issue #48 (レビュー指摘対応): 保存調整＋失敗時ロールバックのロジックは
  // lib/persist-coordinator.ts の純モジュールへ切り出した（ユニットテスト可能にするため）。
  // ここでは coordinator インスタンスを1つだけ生成して ref に保持する。
  // deps は AppProvider の setter/ref を参照するクロージャで渡す。
  // useRef の初期値を関数で1回だけ生成し（lazy init 相当）、以降は再生成しない。
  const coordinatorRef = useRef<ReturnType<typeof createPersistCoordinator> | null>(null);
  if (coordinatorRef.current === null) {
    coordinatorRef.current = createPersistCoordinator<{ projects: Project[]; tasks: Task[] }>({
      // 失敗検知後、飛行中の保存が全部終わってから最新をまとめて取得する
      fetchServer: async () => {
        const [dbProjects, dbTasks] = await Promise.all([listProjects(), listTasks()]);
        return { projects: ensureInboxProject(dbProjects), tasks: dbTasks };
      },
      // 取得したスナップショットを state へ反映する（旧 maybeRollback の反映処理をここへ移設）
      applyServer: ({ projects: nextProjects, tasks: nextTasks }) => {
        // Issue #48 (レビュー指摘対応): 未ログインなら反映しない。
        // 失敗が残ったままログアウトすると再取得が走りうるが、その結果でログアウト済みの
        // 空状態を上書きしないようにする（旧 maybeRollback の未ログイン early-return と同じ意図）。
        if (!userIdRef.current) {
          return;
        }
        setProjects(nextProjects);
        setTasks(nextTasks);

        // schedule はメモリのみだが、deleteTask が楽観的に taskId を落としている。
        // 削除が失敗してタスクが復活した場合に備え、サーバーに存在しない taskId だけを除去して整合させる
        const aliveTaskIds = new Set(nextTasks.map((task) => task.id));
        setSchedule((current) =>
          current.map((day) => ({
            ...day,
            taskIds: day.taskIds.filter((taskId) => aliveTaskIds.has(taskId))
          }))
        );

        // 取り込みカードの表示条件も初回 hydrate と同じロジックで計算し直す
        // （importLocalData が途中で失敗したときに表示が実態とズレるのを防ぐ）。
        // ensureInboxProject で Inbox を足す前の「DB に実在するプロジェクト数」で判定したいので、
        // Inbox を除いた件数で serverEmpty を求める
        const realProjectCount = nextProjects.filter((project) => project.id !== INBOX_PROJECT_ID).length;
        const serverEmpty = nextTasks.length === 0 && realProjectCount === 0;
        const local = loadState();
        setCanImportLocalData(serverEmpty && local.tasks.length >= 1);

        // ここまで来たら state はサーバーと一致している＝巻き戻しは完了。警告バナーを消す
        setPersistError(false);
      },
      // 保存が失敗するたびに警告バナーを出す（個人データ・トークンは出さない）
      onSaveError: () => setPersistError(true),
      // 再取得自体が失敗したときのログ（保存失敗と文言を分ける。個人データ・トークンは出さない）
      onFetchError: (error) => console.error("[CraftCal] 再取得に失敗:", error),
      // 現在のコンテキスト識別子。fetch 前後でユーザーが変わっていたら反映しない
      getContextId: () => userIdRef.current
    });
  }
  const coordinator = coordinatorRef.current;

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
    // Issue #48 (レビュー指摘対応): 保存調整＋失敗時ロールバックの本体は
    // coordinator（lib/persist-coordinator.ts）へ移設した。ここではその run を薄く呼ぶだけ。
    // options.queueKey を渡すと同一 key の保存が送信順に直列化され、
    // 「同一タスクの保存が逆順で完了して旧値が新値を上書きする」問題を防げる。
    const persist = (op: () => Promise<unknown>, options?: PersistRunOptions) => {
      coordinator.run(op, options);
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
        // Issue #51: scheduledDate に付ける任意の開始/終了時刻。フォームが送ってこなければ時刻なし
        scheduledStartTime: input.scheduledStartTime ?? null,
        scheduledEndTime: input.scheduledEndTime ?? null,
        estimatedMinutes: typeof input.estimatedMinutes === "number" ? input.estimatedMinutes : null,
        status: "todo",
        createdAt: now,
        updatedAt: now
      };

      // ローカル即時反映 → DB へ非同期保存。
      // Issue #48 (レビュー指摘対応): queueKey に task.id を渡し、同じタスクへの
      // insert → 直後の delete などが送信順で直列化されるようにする
      setTasks((current) => [task, ...current]);
      persist(() => insertTask(task), { queueKey: task.id });
    };

    const deleteTask = (id: string) => {
      // Issue #48 (レビュー指摘対応): schedule はメモリのみで DB 再取得では戻せないため、
      // 楽観的に taskId を落とす前に現在の schedule を控え、保存失敗時に復元する
      const scheduleSnapshot = scheduleRef.current;
      setTasks((current) => current.filter((task) => task.id !== id));
      setSchedule((current) =>
        current.map((day) => ({
          ...day,
          taskIds: day.taskIds.filter((taskId) => taskId !== id)
        }))
      );

      // Issue #91: そのタスクの作業ログも一緒に消す。残すと最近の作業ログに
      // 「(Unknown)」の行が並び、活動グリッドと達成バッジが存在しないタスクの
      // 記録を数え続ける。消したぶんは保存失敗時に書き戻す
      const removedLogs = deleteLogsForTask(id);

      persist(() => deleteTaskRow(id), {
        queueKey: id,
        restoreOnFailure: () => {
          setSchedule(scheduleSnapshot);
          restoreDailyLogs(removedLogs);
        }
      });
    };

    const updateTaskStatus = (id: string, status: TaskStatus) => {
      const now = new Date().toISOString();
      const target = tasksRef.current.find((task) => task.id === id);
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, status, updatedAt: now } : task))
      );
      if (target) {
        // Issue #48 (レビュー指摘対応): 同一タスクの更新を送信順に直列化する
        persist(() => updateTaskRow({ ...target, status, updatedAt: now }), { queueKey: id });
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
        // Issue #51: dueDate / scheduledDate と同じ単純代入パターンに揃える（フォームは常に値を送る想定）
        scheduledStartTime: input.scheduledStartTime ?? null,
        scheduledEndTime: input.scheduledEndTime ?? null,
        // undefined = 変更なし（既存値を維持） / null = クリア（未設定に戻す） / 数値 = その値に設定 (Issue #44)
        estimatedMinutes: input.estimatedMinutes === undefined ? target.estimatedMinutes : input.estimatedMinutes,
        updatedAt: now
      };
      setTasks((current) => current.map((task) => (task.id === id ? updated : task)));
      // Issue #48 (レビュー指摘対応): 同一タスクの更新を送信順に直列化する
      persist(() => updateTaskRow(updated), { queueKey: id });
    };

    // Issue #51: 予定日に加えて開始/終了時刻も付け替えられるよう options を追加。
    // scheduledDate が null（未配置に戻す）のときは時刻も一緒に null へクリアする
    // （時刻だけ残ると「未配置なのに時刻がある」という不整合な状態になるため）。
    // options を省略したとき（既存の呼び出し元 = カレンダーの配置/未配置操作）は
    // 時刻フィールドに触れず、既存の scheduledStartTime/scheduledEndTime をそのまま維持する。
    //
    // キーの有無で「省略」と「明示的な null」を区別する点に注意。
    // options?.startTime ?? 既存値 と書くと、時刻を消したくて null を渡しても既存値に
    // 戻ってしまい、一度入れた時刻を API から二度と消せなくなる。
    const rescheduleTask = (
      id: string,
      scheduledDate: string | null,
      options?: { startTime?: string | null; endTime?: string | null }
    ) => {
      const now = new Date().toISOString();
      const target = tasksRef.current.find((task) => task.id === id);
      const hasStartTime = options !== undefined && "startTime" in options;
      const hasEndTime = options !== undefined && "endTime" in options;
      const scheduledStartTime =
        scheduledDate === null ? null : hasStartTime ? options.startTime ?? null : target?.scheduledStartTime ?? null;
      const scheduledEndTime =
        scheduledDate === null ? null : hasEndTime ? options.endTime ?? null : target?.scheduledEndTime ?? null;
      setTasks((current) =>
        current.map((task) =>
          task.id === id ? { ...task, scheduledDate, scheduledStartTime, scheduledEndTime, updatedAt: now } : task
        )
      );
      if (target) {
        // Issue #48 (レビュー指摘対応): 同一タスクの更新を送信順に直列化する
        persist(
          () => updateTaskRow({ ...target, scheduledDate, scheduledStartTime, scheduledEndTime, updatedAt: now }),
          { queueKey: id }
        );
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
        // Issue #48 (レビュー指摘対応): 同一タスクの更新を送信順に直列化する
        persist(() => updateTaskRow({ ...target, ...patch }), { queueKey: id });
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
        iconPath: p.iconPath ?? null,
        color: p.color ?? null,
        status: p.status,
        goal: p.goal ?? null,
        createdAt: now,
        updatedAt: now
      };

      setProjects((cur) => [project, ...cur]);
      // Issue #48 (レビュー指摘対応): 同一プロジェクトの保存を送信順に直列化する
      persist(() => insertProject(project), { queueKey: project.id });
    };

    const updateProject = (id: string, patch: Partial<Project>) => {
      const now = new Date().toISOString();
      const target = projectsRef.current.find((pr) => pr.id === id);
      if (!target) {
        return;
      }
      const updated: Project = { ...target, ...patch, updatedAt: now };
      setProjects((cur) => cur.map((pr) => (pr.id === id ? updated : pr)));
      // Issue #48 (レビュー指摘対応): 同一プロジェクトの保存を送信順に直列化する
      persist(() => updateProjectRow(updated), { queueKey: id });
    };

    const deleteProject = (id: string) => {
      // ローカルは従来どおりタスクを Inbox へ付け替える。
      // DB 側は行削除のみ（FK ON DELETE SET NULL でタスクの project_id が null=Inbox になる）
      setTasks((cur) => cur.map((t) => (t.projectId === id ? { ...t, projectId: INBOX_PROJECT_ID } : t)));
      setProjects((cur) => cur.filter((p) => p.id !== id));
      // Issue #48 (レビュー指摘対応): 同一プロジェクトの保存を送信順に直列化する
      persist(() => deleteProjectRow(id), { queueKey: id });
    };

    const resetAll = () => {
      // Issue #48 (レビュー指摘対応): schedule / sprint はメモリのみで DB 再取得では戻せないため、
      // 楽観的に空へする前に現在値を控え、削除が失敗したら復元する
      const scheduleSnapshot = scheduleRef.current;
      const sprintSnapshot = sprintRef.current;
      const empty = createEmptyState();
      setTasks(empty.tasks);
      setSprintState(empty.sprint);
      setSchedule(empty.schedule);
      setProjects(empty.projects ?? []);
      setCanImportLocalData(false);
      // DB からも自分の tasks → projects の順で全削除する（FK 依存のため tasks が先）。
      // 一括操作なので queueKey は付けない（現状どおり並行）
      persist(
        async () => {
          await deleteAllTasks();
          await deleteAllProjects();
        },
        {
          restoreOnFailure: () => {
            setSchedule(scheduleSnapshot);
            setSprintState(sprintSnapshot);
          }
        }
      );
    };

    // サンプルデータ投入。既存タスクがあるときは何もしない（ボタン側でも非表示）。
    // createSeedData() の結果を DB に保存してから state に反映する
    const seedSampleData = () => {
      if (tasksRef.current.length > 0) {
        return;
      }

      const seed = createSeedData();
      persist(async () => {
        // Issue #76: projects と tasks を1トランザクションで投入する。
        // 以前は insertProjects → insertTasks の2回に分けており、テーブル内の部分適用は
        // Issue #53 で解消したものの、タスク側で失敗すると「プロジェクトだけ入った」状態が残った。
        // そのとき state のタスクは空のままなので上のガードに引っかからず、createSeedData は
        // 毎回新しい uuid を振るため、押すたびに同じ内容が重複して増えていた。
        // RPC 側が全部入れるか何も入れないかにしてくれるので、失敗後に押し直しても重複しない。
        //
        // なお「DB には入ったが応答が失われた」場合は、保存失敗をきっかけに
        // persist-coordinator がサーバー状態を取り直して state に反映する。
        // その時点でタスクが入るので、上のガードが効いて二重投入にはならない。
        await importUserData(seed.projects, seed.tasks);
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
        // Issue #76: seed と同じ理由で、2テーブルへの投入を1トランザクションにまとめる。
        // localStorage の削除はこの後なので、失敗したときは取り込み元が残って再取り込みできる
        // （この挙動は従来どおり）。RPC が失敗すれば DB 側は何も入っていない状態に戻る。
        await importUserData(importProjects, importTasks);
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
        {/* 初回データ読み込み中は children の代わりに起動画面を出す (Issue #59)。
            ここはセッション判定 (AuthGate) に続く「起動の続き」なので、
            ページ遷移中の LoadingScreen ではなく SplashScreen を使って表示を揃える。
            コンテキスト自体は提供し続けるので、読み込み完了後は再マウントなしで children が表示される */}
        {dataLoading ? <SplashScreen /> : children}
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
