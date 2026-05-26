export type TaskWeight = "light" | "medium" | "heavy";

export type TaskPriority = "low" | "medium" | "high";

export type TaskStatus = "todo" | "doing" | "done";

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
  createdAt: string;
  updatedAt?: string;
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
  tasks: Task[];
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

export type DevCalendarContextValue = DevCalendarState & {
  addTask: (input: TaskFormInput) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  updateTask: (id: string, input: TaskFormInput) => void;
  setSprint: (sprint: Sprint) => void;
  generateSprintSchedule: () => void;
  projects: Project[];
  addProject: (p: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  resetAll: () => void;
};
