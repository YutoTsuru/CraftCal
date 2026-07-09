"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { generateSchedule } from "@/lib/schedule";
import { createSeedData } from "@/lib/seed-data";
import { INBOX_PROJECT_ID, createEmptyState, loadState, saveState } from "@/lib/storage";
import type {
  DevCalendarContextValue,
  DevCalendarState,
  Project,
  ScheduleDay,
  Sprint,
  Task,
  TaskFormInput,
  TaskStatus
} from "@/types/dev-calendar";

const AppContext = createContext<DevCalendarContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprint, setSprintState] = useState<Sprint | null>(null);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const state = loadState();
    setTasks(state.tasks);
    setSprintState(state.sprint);
    setSchedule(state.schedule);
    setProjects(state.projects ?? []);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const state: DevCalendarState = {
      tasks,
      sprint,
      schedule,
      projects
    };

    saveState(state);
  }, [hydrated, tasks, sprint, schedule, projects]);

  const value = useMemo<DevCalendarContextValue>(() => {
    const addTask = (input: TaskFormInput) => {
      const projectId = input.projectId ?? projects[0]?.id ?? INBOX_PROJECT_ID;

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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setTasks((current) => [task, ...current]);
    };

    const deleteTask = (id: string) => {
      setTasks((current) => current.filter((task) => task.id !== id));
      setSchedule((current) =>
        current.map((day) => ({
          ...day,
          taskIds: day.taskIds.filter((taskId) => taskId !== id)
        }))
      );
    };

    const updateTaskStatus = (id: string, status: TaskStatus) => {
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, status, updatedAt: new Date().toISOString() } : task))
      );
    };

    const updateTask = (id: string, input: TaskFormInput) => {
      setTasks((current) =>
        current.map((task) =>
          task.id === id
            ? {
                ...task,
                projectId: input.projectId ?? task.projectId,
                title: input.title,
                memo: input.memo,
                weight: input.weight,
                priority: input.priority ?? task.priority,
                dueDate: input.dueDate ?? null,
                scheduledDate: input.scheduledDate ?? null,
                estimatedMinutes: typeof input.estimatedMinutes === "number" ? input.estimatedMinutes : task.estimatedMinutes,
                updatedAt: new Date().toISOString()
              }
            : task
        )
      );
    };

    const rescheduleTask = (id: string, scheduledDate: string | null) => {
      setTasks((current) =>
        current.map((task) =>
          task.id === id ? { ...task, scheduledDate, updatedAt: new Date().toISOString() } : task
        )
      );
    };

    const completeTask = (id: string, note?: string | null, url?: string | null) => {
      const now = new Date().toISOString();
      setTasks((current) =>
        current.map((task) =>
          task.id === id
            ? { ...task, status: "done", completedAt: now, completionNote: note ?? null, completionUrl: url ?? null, updatedAt: now }
            : task
        )
      );
    };

    const setSprint = (nextSprint: Sprint) => {
      setSprintState(nextSprint);
    };

    const generateSprintSchedule = () => {
      // If sprint has projectId, only include that project's tasks
      const targetTasks = sprint?.projectId
        ? tasks.filter((t) => t.projectId === sprint.projectId && t.status !== "done")
        : tasks.filter((t) => t.status !== "done");
      setSchedule(generateSchedule(targetTasks, sprint));
    };

    const addProject = (p: Omit<Project, "id" | "createdAt" | "updatedAt"> & { id?: string }) => {
      const project: Project = {
        id: p.id ?? crypto.randomUUID(),
        name: p.name,
        description: p.description ?? null,
        overviewUrl: p.overviewUrl ?? null,
        color: p.color ?? null,
        status: p.status,
        goal: p.goal ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setProjects((cur) => [project, ...cur]);
    };

    const updateProject = (id: string, patch: Partial<Project>) => {
      setProjects((cur) => cur.map((pr) => (pr.id === id ? { ...pr, ...patch, updatedAt: new Date().toISOString() } : pr)));
    };

    const deleteProject = (id: string) => {
      // Reassign tasks to inbox
      setTasks((cur) => cur.map((t) => (t.projectId === id ? { ...t, projectId: INBOX_PROJECT_ID } : t)));
      setProjects((cur) => cur.filter((p) => p.id !== id));
    };

    const resetAll = () => {
      const empty = createEmptyState();
      setTasks(empty.tasks);
      setSprintState(empty.sprint);
      setSchedule(empty.schedule);
      setProjects(empty.projects ?? []);
    };

    // サンプルデータの投入。ダッシュボード (app/page.tsx) の
    // 「サンプルデータを読み込む」ボタンから呼ばれる。
    // 既存タスクがある場合は誤って混ざらないよう何もしない（ボタン側でも非表示にしている）
    const seedSampleData = () => {
      if (tasks.length > 0) {
        return;
      }

      const seed = createSeedData();
      setProjects((cur) => [...seed.projects, ...cur]); // Inbox は既存を残し、その前にサンプル2件を追加
      setTasks(seed.tasks);
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
      resetAll
    };
  }, [tasks, sprint, schedule, projects]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useDevCalendar() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useDevCalendar must be used within AppProvider");
  }

  return context;
}
