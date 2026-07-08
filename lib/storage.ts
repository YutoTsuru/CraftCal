import type {
  DevCalendarState,
  Project,
  ScheduleDay,
  Sprint,
  Task
} from "@/types/dev-calendar";

export const STORAGE_KEY = "craftcal-state";
export const INBOX_PROJECT_ID = "inbox";

// 過去バージョンで保存された可能性のあるフィールドを含むタスク
type LegacyTaskRecord = Partial<Task> & {
  plannedDate?: string | null;
  estimateHours?: number | null;
  project?: string | null;
};

// 旧形式 (tasks にタスク複製を保存) と新形式 (taskIds のみ) の両方を受ける
type LegacyScheduleDay = {
  date?: string;
  taskIds?: unknown;
  tasks?: LegacyTaskRecord[];
};

type PersistedState = {
  tasks?: LegacyTaskRecord[];
  sprint?: Sprint | null;
  schedule?: LegacyScheduleDay[];
  projects?: Partial<Project>[];
};

export function createInboxProject(): Project {
  const now = new Date().toISOString();
  return {
    id: INBOX_PROJECT_ID,
    name: "Inbox",
    description: "未分類のタスク",
    overviewUrl: null,
    color: "#10b981",
    status: "active",
    goal: null,
    createdAt: now,
    updatedAt: now
  };
}

export function ensureInboxProject(projects: Project[]): Project[] {
  if (projects.some((p) => p.id === INBOX_PROJECT_ID)) {
    return projects;
  }

  return [createInboxProject(), ...projects];
}

function migrateProject(p: Partial<Project>): Project {
  const now = new Date().toISOString();
  return {
    id: p.id ?? crypto.randomUUID(),
    name: p.name ?? "",
    description: p.description ?? null,
    overviewUrl: p.overviewUrl ?? null,
    color: p.color ?? null,
    status: p.status ?? "active",
    goal: p.goal ?? null,
    createdAt: p.createdAt ?? now,
    updatedAt: p.updatedAt ?? p.createdAt ?? now
  };
}

export function migrateTask(t: LegacyTaskRecord, fallbackProjectId: string): Task {
  const now = new Date().toISOString();
  const scheduledDate = t.scheduledDate ?? t.plannedDate ?? null;
  const estimatedMinutes =
    typeof t.estimatedMinutes === "number"
      ? t.estimatedMinutes
      : typeof t.estimateHours === "number"
      ? Math.round(t.estimateHours * 60)
      : null;

  return {
    id: t.id ?? crypto.randomUUID(),
    projectId: t.projectId ?? t.project ?? fallbackProjectId,
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
    createdAt: t.createdAt ?? now,
    updatedAt: t.updatedAt ?? t.createdAt ?? now
  };
}

export function migrateScheduleDay(day: LegacyScheduleDay): ScheduleDay {
  // 新形式: taskIds をそのまま利用
  if (Array.isArray(day.taskIds)) {
    return {
      date: day.date ?? "",
      taskIds: day.taskIds.filter((id): id is string => typeof id === "string")
    };
  }

  // 旧形式: 複製されたタスクから ID だけ取り出す
  return {
    date: day.date ?? "",
    taskIds: (day.tasks ?? [])
      .map((t) => t.id)
      .filter((id): id is string => typeof id === "string")
  };
}

export function migrateState(parsed: PersistedState): DevCalendarState {
  const projects = ensureInboxProject((parsed.projects ?? []).map(migrateProject));
  const fallbackProjectId = projects[0]?.id ?? INBOX_PROJECT_ID;
  const tasks = (parsed.tasks ?? []).map((t) => migrateTask(t, fallbackProjectId));
  const knownTaskIds = new Set(tasks.map((t) => t.id));
  const schedule = (parsed.schedule ?? [])
    .map(migrateScheduleDay)
    .map((day) => ({ ...day, taskIds: day.taskIds.filter((id) => knownTaskIds.has(id)) }));

  return {
    tasks,
    sprint: parsed.sprint ?? null,
    schedule,
    projects
  };
}

export function createEmptyState(): DevCalendarState {
  return {
    tasks: [],
    sprint: null,
    schedule: [],
    projects: ensureInboxProject([])
  };
}

export function loadState(): DevCalendarState {
  if (typeof window === "undefined") {
    return createEmptyState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyState();
  }

  try {
    return migrateState(JSON.parse(raw) as PersistedState);
  } catch {
    // 壊れたデータで画面全体が落ちるのを防ぐ。既存データは上書きせず残す
    return createEmptyState();
  }
}

export function saveState(state: DevCalendarState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 容量超過などで保存に失敗しても操作自体は継続できるようにする
  }
}
