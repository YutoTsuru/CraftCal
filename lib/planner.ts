import type { Project, Task } from "@/types/dev-calendar";

export type PlannerRole = "user" | "assistant";

export type PlannerSuggestion = {
  time: string;
  taskName: string;
  projectName: string;
  estimatedMinutes: number;
  reason: string;
};

export type PlannerMessage = {
  id: string;
  role: PlannerRole;
  content: string;
  suggestions?: PlannerSuggestion[];
};

export type MockPlanResult = {
  content: string;
  suggestions: PlannerSuggestion[];
};

const FALLBACK_TASKS: Task[] = [
  {
    id: "mock-1",
    projectId: "inbox",
    title: "MVP作成",
    memo: "",
    weight: "heavy",
    priority: "high",
    dueDate: null,
    scheduledDate: null,
    estimatedMinutes: 60,
    status: "todo",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "mock-2",
    projectId: "inbox",
    title: "README整理",
    memo: "",
    weight: "light",
    priority: "medium",
    dueDate: null,
    scheduledDate: null,
    estimatedMinutes: 30,
    status: "todo",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "mock-3",
    projectId: "inbox",
    title: "UI調整",
    memo: "",
    weight: "medium",
    priority: "medium",
    dueDate: null,
    scheduledDate: null,
    estimatedMinutes: 40,
    status: "doing",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function normalizeMessage(message: string) {
  return message.toLowerCase();
}

function resolveProjectName(projectId: string, projects: Project[]) {
  return projects.find((project) => project.id === projectId)?.name ?? "Inbox";
}

function estimateTaskMinutes(task: Task) {
  if (typeof task.estimatedMinutes === "number" && task.estimatedMinutes > 0) {
    return task.estimatedMinutes;
  }

  if (task.weight === "light") return 30;
  if (task.weight === "heavy") return 90;
  return 60;
}

function scoreTask(task: Task, query: string) {
  let score = 0;
  const minutes = estimateTaskMinutes(task);

  if (task.priority === "high") score += 30;
  if (task.priority === "medium") score += 12;
  if (task.status === "doing") score += 22;
  if (task.status === "todo") score += 10;

  if (query.includes("軽め") || query.includes("軽く") || query.includes("light")) {
    score += task.weight === "light" || minutes <= 45 ? 40 : -20;
  }

  if (query.includes("締切") || query.includes("due")) {
    score += task.dueDate ? 20 : 0;
  }

  if (query.includes("1時間") || query.includes("60分")) {
    score += minutes <= 60 ? 35 : -30;
  }

  if (query.includes("今日") || query.includes("今夜")) {
    score += 8;
  }

  return score;
}

function formatSlot(startHour: number, offsetMinutes: number, durationMinutes: number) {
  const start = startHour * 60 + offsetMinutes;
  const end = start + durationMinutes;

  const format = (totalMinutes: number) => {
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  return `${format(start)}〜${format(end)}`;
}

function getBaseStartHour(query: string) {
  if (query.includes("明日")) return 9;
  if (query.includes("朝")) return 9;
  if (query.includes("昼")) return 12;
  return 19;
}

export function generateMockPlan(message: string, tasks: Task[], projects: Project[]): MockPlanResult {
  const query = normalizeMessage(message);
  const baseTasks = tasks.filter((task) => task.status !== "done");
  const candidates = (baseTasks.length > 0 ? baseTasks : FALLBACK_TASKS)
    .slice()
    .sort((left, right) => scoreTask(right, query) - scoreTask(left, query))
    .slice(0, 3);

  const startHour = getBaseStartHour(query);
  const breakMinutes = 10;
  let offsetMinutes = 0;

  const suggestions = candidates.map((task, index) => {
    const estimatedMinutes = estimateTaskMinutes(task);
    const time = formatSlot(startHour, offsetMinutes, estimatedMinutes);
    offsetMinutes += estimatedMinutes + breakMinutes;

    const reason =
      index === 0
        ? "進行中・優先度高めのため先に配置"
        : task.weight === "light" || estimatedMinutes <= 45
        ? "短時間で進めやすいタスク"
        : "空き時間に収まりやすい候補";

    return {
      time,
      taskName: task.title,
      projectName: resolveProjectName(task.projectId, projects),
      estimatedMinutes,
      reason
    } satisfies PlannerSuggestion;
  });

  const timeWindow = startHour === 9 ? "09:00〜12:30" : "19:00〜22:00";
  const contentLines = [
    `今日の空き時間は${timeWindow}の想定です。`,
    "未完了タスクの中から、作業時間と優先度を見て以下の予定を提案します。",
    "",
    ...suggestions.map((suggestion) => `${suggestion.time} ${suggestion.taskName}`),
    "",
    "この予定をカレンダーに反映しますか？"
  ];

  return {
    content: contentLines.join("\n"),
    suggestions
  };
}

export function createInitialPlannerMessage(): PlannerMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      "こんにちは。今日や今週の空き時間に合わせて、CraftCalのタスクを割り振ります。\n例: 『今日の夜に軽めのタスクを入れて』『明日の空き時間でCraftCalを進めたい』"
  };
}
