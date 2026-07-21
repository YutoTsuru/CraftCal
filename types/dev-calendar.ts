export type TaskWeight = "light" | "medium" | "heavy";

export type TaskPriority = "low" | "medium" | "high";

export type TaskStatus = "todo" | "doing" | "done" | "expired" | "paused" | "cancelled";

export type Task = {
  id: string;
  projectId: string; // 新規: 所属プロジェクト
  title: string;
  memo: string;
  weight: TaskWeight;
  priority: TaskPriority;
  dueDate?: string | null;
  scheduledDate?: string | null;
  estimatedMinutes?: number | null;
  status: TaskStatus;
  completedAt?: string | null;
  completionNote?: string | null;
  completionUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type DailyLog = {
  id: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  did: string;
  blocked: string;
  next: string;
  doneToday: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectStatus = "active" | "paused" | "done";

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  overviewUrl?: string | null;
  color?: string | null;
  status: ProjectStatus;
  goal?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type Sprint = {
  startDate: string;
  endDate: string;
  projectId?: string | null; // sprint はプロジェクト単位で実行する
};

export type ScheduleDay = {
  date: string;
  // タスク本体は tasks 配列が唯一の保存先。schedule は ID 参照のみ持つ
  taskIds: string[];
};

export type TaskFormInput = {
  title: string;
  memo: string;
  weight: TaskWeight;
  priority?: TaskPriority;
  dueDate?: string | null;
  scheduledDate?: string | null;
  projectId?: string | null;
  estimatedMinutes?: number | null;
};

export type DevCalendarState = {
  tasks: Task[];
  sprint: Sprint | null;
  schedule: ScheduleDay[];
  projects?: Project[];
};

// Issue #48: Context を「state」と「actions」に分割したことで生まれた型。
// state 側だけを購読したいコンポーネント (useDevCalendarState) が受け取る値。
export type DevCalendarStateValue = DevCalendarState & {
  projects: Project[];
  // Supabase からの初回読み込み中は true（画面側でローディング表示に使える）
  dataLoading: boolean;
  // サーバーが空で、旧 localStorage にデータが残っているとき true（ホームに取り込みカードを出す）
  canImportLocalData: boolean;
};

// Issue #48: actions 側だけを購読したいコンポーネント (useDevCalendarActions) が受け取る値。
// ここに並ぶ関数は AppProvider 内で useMemo(..., []) により同一性が固定されているため、
// 依存配列に入れても再実行の原因にならない。
export type DevCalendarActions = {
  addTask: (input: TaskFormInput) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  updateTask: (id: string, input: TaskFormInput) => void;
  // 予定日だけを付け替える (null で未配置に戻す)
  rescheduleTask: (id: string, scheduledDate: string | null) => void;
  completeTask: (id: string, note?: string | null, url?: string | null) => void;
  setSprint: (sprint: Sprint) => void;
  generateSprintSchedule: () => void;
  addProject: (p: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  // サンプルデータ投入 (lib/seed-data.ts)。タスクが1件もないときだけ動く
  seedSampleData: () => void;
  resetAll: () => void;
  // 旧 localStorage のデータを Supabase へ取り込む（成功後 localStorage は削除して二重取り込みを防ぐ）
  importLocalData: () => void;
};

// 既存互換の型。useDevCalendar() は今までどおりこの形（state + actions のマージ）を返す
export type DevCalendarContextValue = DevCalendarState & {
  addTask: (input: TaskFormInput) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  updateTask: (id: string, input: TaskFormInput) => void;
  // 予定日だけを付け替える (null で未配置に戻す)
  rescheduleTask: (id: string, scheduledDate: string | null) => void;
  completeTask: (id: string, note?: string | null, url?: string | null) => void;
  setSprint: (sprint: Sprint) => void;
  generateSprintSchedule: () => void;
  projects: Project[];
  addProject: (p: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  // サンプルデータ投入 (lib/seed-data.ts)。タスクが1件もないときだけ動く
  seedSampleData: () => void;
  resetAll: () => void;
  // Supabase からの初回読み込み中は true（画面側でローディング表示に使える）
  dataLoading: boolean;
  // サーバーが空で、旧 localStorage にデータが残っているとき true（ホームに取り込みカードを出す）
  canImportLocalData: boolean;
  // 旧 localStorage のデータを Supabase へ取り込む（成功後 localStorage は削除して二重取り込みを防ぐ）
  importLocalData: () => void;
};
