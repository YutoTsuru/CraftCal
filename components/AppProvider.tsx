"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  DevCalendarContextValue,
  Project,
  ScheduleDay,
  Sprint,
  Task,
  TaskFormInput,
  TaskStatus
} from "@/types/dev-calendar";

const AppContext = createContext<DevCalendarContextValue | null>(null);

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

  const value = useMemo<DevCalendarContextValue>(() => {
    // 楽観更新の非同期部分。失敗したら警告バナーを出す（個人データ・トークンは出さない）
    const persist = (op: () => Promise<unknown>) => {
      void op().catch((error) => {
        console.error("[CraftCal] 保存に失敗:", error);
        setPersistError(true);
      });
    };

    const addTask = (input: TaskFormInput) => {
      const projectId = input.projectId ?? projects[0]?.id ?? INBOX_PROJECT_ID;
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
      const target = tasks.find((task) => task.id === id);
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, status, updatedAt: now } : task))
      );
      if (target) {
        persist(() => updateTaskRow({ ...target, status, updatedAt: now }));
      }
    };

    const updateTask = (id: string, input: TaskFormInput) => {
      const now = new Date().toISOString();
      const target = tasks.find((task) => task.id === id);
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
      const target = tasks.find((task) => task.id === id);
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, scheduledDate, updatedAt: now } : task))
      );
      if (target) {
        persist(() => updateTaskRow({ ...target, scheduledDate, updatedAt: now }));
      }
    };

    const completeTask = (id: string, note?: string | null, url?: string | null) => {
      const now = new Date().toISOString();
      const target = tasks.find((task) => task.id === id);
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
      const targetTasks = sprint?.projectId
        ? tasks.filter((t) => t.projectId === sprint.projectId && t.status !== "done")
        : tasks.filter((t) => t.status !== "done");
      setSchedule(generateSchedule(targetTasks, sprint));
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
      const target = projects.find((pr) => pr.id === id);
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
      if (tasks.length > 0) {
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
      tasks,
      sprint,
      schedule,
      projects,
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
      dataLoading,
      canImportLocalData,
      importLocalData
    };
  }, [tasks, sprint, schedule, projects, dataLoading, canImportLocalData]);

  return (
    <AppContext.Provider value={value}>
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
    </AppContext.Provider>
  );
}

export function useDevCalendar() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useDevCalendar must be used within AppProvider");
  }

  return context;
}
