"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { generateSchedule } from "@/lib/schedule";
import type {
  DevCalendarContextValue,
  DevCalendarState,
  Sprint,
  Task,
  TaskFormInput,
  TaskStatus,
  Project
} from "@/types/dev-calendar";

const storageKey = "craftcal-state";

const initialState: DevCalendarState = {
  tasks: [],
  sprint: null,
  schedule: [],
  projects: []
};

const AppContext = createContext<DevCalendarContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(initialState.tasks);
  const [sprint, setSprintState] = useState<Sprint | null>(initialState.sprint);
  const [schedule, setSchedule] = useState(initialState.schedule);
  const [projects, setProjects] = useState<Project[]>(initialState.projects ?? []);
  const [hydrated, setHydrated] = useState(false);

  const INBOX_ID = "inbox";

  function createInboxIfMissing(existing: Project[] | undefined) {
    const list = existing ?? [];
    if (list.find((p) => p.id === INBOX_ID)) return list;

    const inbox: Project = {
      id: INBOX_ID,
      name: "Inbox",
      description: "未分類のタスク",
      overviewUrl: null,
      color: "#10b981",
      status: "active",
      goal: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return [inbox, ...list];
  }

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);

    if (raw) {
      const parsed = JSON.parse(raw) as DevCalendarState & { tasks?: any[]; projects?: any[] };

      // Projects migration / ensure inbox exists
      const parsedProjects = (parsed.projects ?? []) as any[];
      const migratedProjects: Project[] = createInboxIfMissing(
        parsedProjects.map((p) => ({
          id: p.id ?? crypto.randomUUID(),
          name: p.name ?? "",
          description: p.description ?? null,
          overviewUrl: p.overviewUrl ?? null,
          color: p.color ?? null,
          status: p.status ?? "active",
          goal: p.goal ?? null,
          createdAt: p.createdAt ?? new Date().toISOString(),
          updatedAt: p.updatedAt ?? p.createdAt ?? new Date().toISOString()
        }))
      );

      // Migrate legacy fields safely for tasks
      const migratedTasks = (parsed.tasks ?? []).map((t) => {
        const scheduledDate = t.scheduledDate ?? t.plannedDate ?? null;
        const estimatedMinutes =
          typeof t.estimatedMinutes === "number"
            ? t.estimatedMinutes
            : typeof t.estimateHours === "number"
            ? Math.round(t.estimateHours * 60)
            : t.estimatedMinutes ?? null;

        const projectId = t.projectId ?? t.project ?? migratedProjects[0]?.id ?? INBOX_ID;

        return {
          id: t.id ?? crypto.randomUUID(),
          projectId,
          title: t.title ?? "",
          memo: t.memo ?? "",
          weight: t.weight ?? "medium",
          priority: t.priority ?? "medium",
          dueDate: t.dueDate ?? null,
          scheduledDate,
          estimatedMinutes,
          status: t.status ?? "todo",
          completedAt: t.completedAt ?? null,
          completionNote: t.completionNote ?? null,
          completionUrl: t.completionUrl ?? null,
          createdAt: t.createdAt ?? new Date().toISOString(),
          updatedAt: t.updatedAt ?? t.createdAt ?? new Date().toISOString()
        };
      });

      setProjects(migratedProjects);
      setTasks(migratedTasks);
      setSprintState(parsed.sprint ?? null);

      // Migrate schedule tasks as well (ensure projectId)
      const migratedSchedule = (parsed.schedule ?? []).map((day: any) => ({
        ...day,
        tasks: (day.tasks ?? []).map((t: any) => {
          const scheduledDate = t.scheduledDate ?? t.plannedDate ?? null;
          const estimatedMinutes =
            typeof t.estimatedMinutes === "number"
              ? t.estimatedMinutes
              : typeof t.estimateHours === "number"
              ? Math.round(t.estimateHours * 60)
              : t.estimatedMinutes ?? null;

          const projectId = t.projectId ?? t.project ?? migratedProjects[0]?.id ?? INBOX_ID;

          return {
            id: t.id ?? crypto.randomUUID(),
            projectId,
            title: t.title ?? "",
            memo: t.memo ?? "",
            weight: t.weight ?? "medium",
            priority: t.priority ?? "medium",
            dueDate: t.dueDate ?? null,
            scheduledDate,
            estimatedMinutes,
            status: t.status ?? "todo",
            completedAt: t.completedAt ?? null,
            completionNote: t.completionNote ?? null,
            completionUrl: t.completionUrl ?? null,
            createdAt: t.createdAt ?? new Date().toISOString(),
            updatedAt: t.updatedAt ?? t.createdAt ?? new Date().toISOString()
          };
        })
      }));

      setSchedule(migratedSchedule);
    }

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

    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [hydrated, tasks, sprint, schedule, projects]);

    const value = useMemo<DevCalendarContextValue>(() => {
    const addTask = (input: TaskFormInput) => {
      const projectId = input.projectId ?? projects[0]?.id ?? INBOX_ID;

      const task: Task = {
        id: crypto.randomUUID(),
        projectId,
        title: input.title,
        memo: input.memo,
        weight: input.weight,
        priority: (input.priority as any) ?? "medium",
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
          tasks: day.tasks.filter((task) => task.id !== id)
        }))
      );
    };

    const updateTaskStatus = (id: string, status: TaskStatus) => {
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, status, updatedAt: new Date().toISOString() } : task))
      );

      setSchedule((current) =>
        current.map((day) => ({
          ...day,
          tasks: day.tasks.map((task) => (task.id === id ? { ...task, status } : task))
        }))
      );
    };

    const setSprint = (nextSprint: Sprint) => {
      setSprintState(nextSprint);
    };

    const generateSprintSchedule = () => {
      // If sprint has projectId, only include that project's tasks
      const targetTasks = sprint?.projectId ? tasks.filter((t) => t.projectId === sprint.projectId && t.status !== "done") : tasks.filter((t) => t.status !== "done");
      setSchedule(generateSchedule(targetTasks, sprint));
    };

    const addProject = (p: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
      const project: Project = {
        id: crypto.randomUUID(),
        name: p.name,
        description: p.description ?? null,
        overviewUrl: (p as any).overviewUrl ?? null,
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
                priority: (input.priority as any) ?? task.priority,
                dueDate: input.dueDate ?? null,
                scheduledDate: input.scheduledDate ?? null,
                estimatedMinutes: typeof input.estimatedMinutes === "number" ? input.estimatedMinutes : task.estimatedMinutes,
                updatedAt: new Date().toISOString()
              }
            : task
        )
      );

      setSchedule((current) =>
        current.map((day) => ({
          ...day,
          tasks: day.tasks.map((task) => (task.id === id ? { ...task, ...input } : task))
        }))
      );
    };

    const deleteProject = (id: string) => {
      // Reassign tasks to inbox
      setTasks((cur) => cur.map((t) => (t.projectId === id ? { ...t, projectId: INBOX_ID } : t)));
      setProjects((cur) => cur.filter((p) => p.id !== id));
    };

    const resetAll = () => {
      setTasks([]);
      setSprintState(null);
      setSchedule([]);
      setProjects(createInboxIfMissing([]));
      window.localStorage.removeItem(storageKey);
    };

    const completeTask = (id: string, note?: string | null, url?: string | null) => {
      const now = new Date().toISOString();
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, status: "done", completedAt: now, completionNote: note ?? null, completionUrl: url ?? null, updatedAt: now } : task))
      );

      setSchedule((current) =>
        current.map((day) => ({
          ...day,
          tasks: day.tasks.map((task) => (task.id === id ? { ...task, status: "done", completedAt: now, completionNote: note ?? null, completionUrl: url ?? null } : task))
        }))
      );
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
      setSprint,
      generateSprintSchedule,
      addProject,
      updateProject,
      deleteProject,
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
