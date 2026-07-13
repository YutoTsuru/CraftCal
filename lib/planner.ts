import type { Project, Task } from "@/types/dev-calendar";

export type PlannerRole = "user" | "assistant";
export type PlannerTargetDate = "today" | "tomorrow" | "thisWeek";
export type PlannerTimeWindow = "morning" | "afternoon" | "evening" | "anytime";
export type PlannerDifficulty = "light" | "normal" | "heavy" | "any";
export type PlannerPriorityMode = "normal" | "dueDate" | "inProgress" | "short";

export type PlannerIntent = {
  targetDate: PlannerTargetDate;
  timeWindow: PlannerTimeWindow;
  difficulty: PlannerDifficulty;
  priorityMode: PlannerPriorityMode;
  durationLimitMinutes: number | null;
  projectName: string | null;
};

export type FreeSlot = {
  date: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

export type ScheduleSuggestion = {
  date: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  taskId: string;
  taskTitle: string;
  projectName: string;
  estimatedMinutes: number;
  reason: string;
};

export type PlannerMessage = {
  id: string;
  role: PlannerRole;
  content: string;
  suggestions?: ScheduleSuggestion[];
  // 確信度が低いときに「A案/B案」を選ばせる選択肢。チャット吹き出し下のボタンに対応する
  choices?: { label: string; suggestions: ScheduleSuggestion[] }[];
};

export type PlannerResult = {
  message: string;
  suggestions: ScheduleSuggestion[];
  intent: PlannerIntent;
  // スコアが拮抗しているときの代替案(B案)。確信度が高い場合は null
  alternative: ScheduleSuggestion[] | null;
};

export type MockPlanResult = PlannerResult;

type PlannerTask = Task & {
  projectName?: string | null;
  difficulty?: "light" | "normal" | "heavy" | null;
};

const BREAK_MINUTES = 10;
const MAX_SUGGESTIONS = 3;
// 1位と2位のスコア差がこれ未満なら「低確信」とみなし、A案/B案の2案を提示する
export const LOW_CONFIDENCE_SCORE_GAP = 12;
const MIN_BLOCK_MINUTES = 30;
const MAX_BLOCK_MINUTES = 90;

const TIME_WINDOWS: Record<PlannerTimeWindow, { start: string; end: string }> = {
  morning: { start: "09:00", end: "11:00" },
  afternoon: { start: "13:00", end: "16:00" },
  evening: { start: "19:00", end: "22:00" },
  anytime: { start: "19:00", end: "22:00" }
};

// 時系列順の時間帯ウィンドウ一覧。anytime(指定なし)のときに「その日の残り全部」を順番に使うために利用する
const ORDERED_WINDOWS = [TIME_WINDOWS.morning, TIME_WINDOWS.afternoon, TIME_WINDOWS.evening];

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

function formatDateLabel(dateString: string, now = new Date()) {
  const today = getLocalDateString(now);
  const tomorrow = addDays(today, 1);

  if (dateString === today) return "今日";
  if (dateString === tomorrow) return "明日";

  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateString;

  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

function parseClockTime(value: string) {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return 0;
  }

  return hour * 60 + minute;
}

function formatClockTime(totalMinutes: number) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function addMinutes(time: string, minutes: number) {
  return formatClockTime(parseClockTime(time) + minutes);
}

function isCompletedStatus(status: string | null | undefined) {
  const normalized = normalizeText(status ?? "");
  return ["done", "completed", "complete", "finished", "完了", "終了", "済み", "済"].includes(normalized);
}

function isProgressStatus(status: string | null | undefined) {
  const normalized = normalizeText(status ?? "");
  return ["doing", "in_progress", "progress", "進行中", "working"].includes(normalized);
}

function estimateTaskMinutes(task: Task) {
  if (typeof task.estimatedMinutes === "number" && task.estimatedMinutes > 0) {
    return task.estimatedMinutes;
  }

  if (task.weight === "light") return 30;
  if (task.weight === "heavy") return 90;
  return 60;
}

function getTaskDifficulty(task: PlannerTask) {
  if (task.difficulty === "light" || task.difficulty === "normal" || task.difficulty === "heavy") {
    return task.difficulty;
  }

  if (task.weight === "light") return "light";
  if (task.weight === "heavy") return "heavy";
  return "normal";
}

function getProjectName(task: Task, projects: Project[]) {
  const extendedTask = task as PlannerTask;
  if (extendedTask.projectName) return extendedTask.projectName;

  return projects.find((project) => project.id === task.projectId)?.name ?? "Inbox";
}

function projectNameMatches(input: string, projects: Project[]) {
  const normalized = normalizeText(input);
  return (
    projects
      .map((project) => project.name)
      .sort((left, right) => right.length - left.length)
      .find((name) => normalized.includes(normalizeText(name))) ?? null
  );
}

function getDueDateScore(dueDate: string | null | undefined) {
  if (!dueDate) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(due.getTime())) {
    return 0;
  }

  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return 60;
  if (diffDays <= 2) return 40;
  if (diffDays <= 5) return 20;
  return 0;
}

export function parsePlannerIntent(input: string, projects: Project[] = []): PlannerIntent {
  const text = normalizeText(input);

  let targetDate: PlannerTargetDate = "today";
  if (text.includes("明日")) {
    targetDate = "tomorrow";
  } else if (text.includes("今週")) {
    targetDate = "thisWeek";
  }

  let timeWindow: PlannerTimeWindow = "anytime";
  if (text.includes("朝")) {
    timeWindow = "morning";
  } else if (text.includes("昼") || text.includes("午後")) {
    timeWindow = "afternoon";
  } else if (text.includes("夜") || text.includes("夕方")) {
    timeWindow = "evening";
  }

  let difficulty: PlannerDifficulty = "any";
  if (text.includes("軽め") || text.includes("軽い") || text.includes("簡単") || text.includes("短め")) {
    difficulty = "light";
  } else if (text.includes("重め") || text.includes("がっつり") || text.includes("集中") || text.includes("重い")) {
    difficulty = "heavy";
  }

  let priorityMode: PlannerPriorityMode = "normal";
  if (text.includes("締切") || text.includes("期限") || text.includes("期限近い")) {
    priorityMode = "dueDate";
  } else if (text.includes("進行中")) {
    priorityMode = "inProgress";
  } else if (text.includes("短時間") || text.includes("すぐ") || text.includes("1時間以内")) {
    priorityMode = "short";
  }

  // 時間指定の解析: ハードコードをやめ、正規表現で任意の数値を拾う
  // 判定順序は「時間半 → 時間 → 分」。先に「時間半」を見ないと「1時間半」が「1時間」として誤マッチするため
  let durationLimitMinutes: number | null = null;
  const halfHourMatch = text.match(/(\d+)時間半/); // 例: 1時間半 → 90分
  const hourMatch = text.match(/(\d+)時間/); // 例: 2時間 → 120分
  const minuteMatch = text.match(/(\d+)分/); // 例: 90分 → 90分
  if (halfHourMatch) {
    durationLimitMinutes = Number(halfHourMatch[1]) * 60 + 30;
  } else if (hourMatch) {
    durationLimitMinutes = Number(hourMatch[1]) * 60;
  } else if (minuteMatch) {
    durationLimitMinutes = Number(minuteMatch[1]);
  }

  return {
    targetDate,
    timeWindow,
    difficulty,
    priorityMode,
    durationLimitMinutes,
    projectName: projectNameMatches(input, projects)
  };
}

// 現在時刻を30分(=MIN_BLOCK_MINUTES)単位で切り上げる。中途半端な現在時刻を空きブロックの区切りに合わせる役割
function roundUpToBlock(totalMinutes: number) {
  return Math.ceil(totalMinutes / MIN_BLOCK_MINUTES) * MIN_BLOCK_MINUTES;
}

// 1つの時間帯ウィンドウから空きスロットを作る。
// effectiveStartMinutes(実効開始時刻)で窓の開始をクランプし、残りが MIN_BLOCK_MINUTES 未満なら null を返して窓を捨てる
function makeSlotFromWindow(
  date: string,
  window: { start: string; end: string },
  effectiveStartMinutes: number,
  now: Date
): FreeSlot | null {
  const windowStart = parseClockTime(window.start);
  const windowEnd = parseClockTime(window.end);
  // 窓の開始と実効開始の遅い方を実際の開始にする
  const start = Math.max(effectiveStartMinutes, windowStart);
  const durationMinutes = windowEnd - start;

  // 30分未満しか残っていない窓は使わない
  if (durationMinutes < MIN_BLOCK_MINUTES) {
    return null;
  }

  return {
    date,
    dateLabel: formatDateLabel(date, now),
    startTime: formatClockTime(start),
    endTime: window.end,
    durationMinutes
  };
}

// 現在時刻(now)を考慮して空き時間スロットを組み立てる。
// 過去の時間帯を提案しないよう、今日の窓は現在時刻でクランプし、既に終わった窓は明日へ回す。
export function buildFreeSlots(intent: PlannerIntent, now: Date = new Date()): FreeSlot[] {
  const today = getLocalDateString(now);
  const tomorrow = addDays(today, 1);
  // 現在時刻(分)を30分単位で切り上げた実効現在時刻
  const effectiveNow = roundUpToBlock(now.getHours() * 60 + now.getMinutes());

  // 対象の時間帯ウィンドウ(時系列順)。anytimeは全窓、朝/昼/夜はその窓だけ
  const windows = intent.timeWindow === "anytime" ? ORDERED_WINDOWS : [TIME_WINDOWS[intent.timeWindow]];

  // クランプ不要(明日以降は窓の開始をそのまま使う)でスロット化するヘルパー
  const buildUnclamped = (date: string, windowList: { start: string; end: string }[]) =>
    windowList.map((window) => makeSlotFromWindow(date, window, 0, now)).filter((slot): slot is FreeSlot => slot !== null);

  // 明日が対象: 明日の窓をそのまま使う
  if (intent.targetDate === "tomorrow") {
    return buildUnclamped(tomorrow, windows);
  }

  // 今日の窓を現在時刻でクランプしたスロット
  const todaySlots = windows
    .map((window) => makeSlotFromWindow(today, window, effectiveNow, now))
    .filter((slot): slot is FreeSlot => slot !== null);

  // 今週が対象: 今日(クランプ済み)の窓 + 明日の窓
  if (intent.targetDate === "thisWeek") {
    return [...todaySlots, ...buildUnclamped(tomorrow, windows)];
  }

  // ここから targetDate === "today"
  if (intent.timeWindow !== "anytime") {
    // 朝/昼/夜を指定: 今日その窓が残っていれば今日、もう終わっていれば明日の同じ窓
    return todaySlots.length > 0 ? todaySlots : buildUnclamped(tomorrow, windows);
  }

  // anytime: 今日の残っている全窓。今日どの窓も残っていなければ明日の全窓
  return todaySlots.length > 0 ? todaySlots : buildUnclamped(tomorrow, ORDERED_WINDOWS);
}

function normalizeTasks(tasks: Task[], projects: Project[]) {
  return tasks
    .filter((task) => !isCompletedStatus(task.status))
    .map((task) => {
      const extendedTask = task as PlannerTask;
      return {
        ...task,
        projectName: getProjectName(task, projects),
        difficulty: getTaskDifficulty(extendedTask)
      } satisfies PlannerTask;
    });
}

function scoreTask(task: PlannerTask, intent: PlannerIntent, slot: FreeSlot) {
  let score = 0;
  const minutes = estimateTaskMinutes(task);
  const difficulty = getTaskDifficulty(task);
  const dueScore = getDueDateScore(task.dueDate);

  if (isProgressStatus(task.status)) {
    score += 30;
  }

  if (String(task.priority).toLowerCase() === "high") {
    score += 30;
  } else if (String(task.priority).toLowerCase() === "medium") {
    score += 15;
  }

  score += dueScore;

  if (intent.priorityMode === "dueDate") {
    score += dueScore > 0 ? 30 : 0;
  }

  if (intent.priorityMode === "inProgress" && isProgressStatus(task.status)) {
    score += 30;
  }

  if (intent.priorityMode === "short" && minutes <= 60) {
    score += 30;
  }

  if (intent.difficulty === "light" && difficulty === "light") {
    score += 25;
  }

  if (intent.difficulty === "light" && difficulty === "heavy") {
    score -= 50;
  }

  if (intent.difficulty === "heavy" && difficulty === "heavy") {
    score += 20;
  }

  if (minutes <= slot.durationMinutes) {
    score += 20;
  }

  if (minutes <= 60) {
    score += 8;
  }

  return score;
}

function makeReason(task: PlannerTask, intent: PlannerIntent, minutes: number, isPartial: boolean) {
  const parts: string[] = [];
  const difficulty = getTaskDifficulty(task);

  if (isProgressStatus(task.status)) {
    parts.push("進行中のタスク");
  }

  if (String(task.priority).toLowerCase() === "high") {
    parts.push("優先度が高い");
  }

  if (intent.priorityMode === "dueDate") {
    parts.push("締切を優先");
  }

  if (intent.priorityMode === "short") {
    parts.push("短時間で進めやすい");
  }

  if (intent.difficulty === "light" && difficulty === "light") {
    parts.push("軽めの作業に合う");
  }

  if (intent.difficulty === "light" && difficulty === "heavy") {
    parts.push("重めだが一部だけ進める想定");
  }

  if (intent.difficulty === "heavy" && difficulty === "heavy") {
    parts.push("重めのタスクを進めやすい");
  }

  if (isPartial || minutes < estimateTaskMinutes(task)) {
    parts.push("空き時間に合わせて一部だけ割り当て");
  }

  if (parts.length === 0) {
    parts.push("空き時間に収まりやすい候補");
  }

  return `${parts.join("、")}。`;
}

function clampBlockMinutes(preferredMinutes: number, availableMinutes: number) {
  const capped = Math.min(preferredMinutes, availableMinutes, MAX_BLOCK_MINUTES);
  if (capped < MIN_BLOCK_MINUTES) {
    return availableMinutes >= MIN_BLOCK_MINUTES ? Math.min(MAX_BLOCK_MINUTES, availableMinutes) : 0;
  }

  return Math.max(MIN_BLOCK_MINUTES, capped);
}

function generateSchedulePlan(tasks: PlannerTask[], freeSlots: FreeSlot[], intent: PlannerIntent, projects: Project[]) {
  const suggestions: ScheduleSuggestion[] = [];
  const usedTaskIds = new Set<string>();
  let spentWorkMinutes = 0;

  for (const slot of freeSlots) {
    if (suggestions.length >= MAX_SUGGESTIONS) {
      break;
    }

    let cursorMinutes = parseClockTime(slot.startTime);
    const slotEndMinutes = parseClockTime(slot.endTime);

    while (cursorMinutes + MIN_BLOCK_MINUTES <= slotEndMinutes && suggestions.length < MAX_SUGGESTIONS) {
      const candidates = tasks.filter((task) => !usedTaskIds.has(task.id));

      if (candidates.length === 0) {
        break;
      }

      const best = candidates
        .map((task) => ({ task, score: scoreTask(task, intent, slot) }))
        .sort((left, right) => right.score - left.score)[0];

      if (!best) {
        break;
      }

      const remainingBudget = intent.durationLimitMinutes === null ? Number.POSITIVE_INFINITY : intent.durationLimitMinutes - spentWorkMinutes;
      if (remainingBudget < MIN_BLOCK_MINUTES) {
        break;
      }

      const availableMinutes = Math.min(slotEndMinutes - cursorMinutes, remainingBudget);
      const estimatedMinutes = estimateTaskMinutes(best.task);
      const preferredMinutes = intent.difficulty === "heavy" && getTaskDifficulty(best.task) === "heavy" ? 90 : estimatedMinutes;
      const blockMinutes = clampBlockMinutes(preferredMinutes, availableMinutes);

      if (blockMinutes === 0) {
        break;
      }

      const startTime = formatClockTime(cursorMinutes);
      const endTime = addMinutes(startTime, blockMinutes);
      const isPartial = blockMinutes < estimatedMinutes;

      suggestions.push({
        date: slot.date,
        dateLabel: slot.dateLabel,
        startTime,
        endTime,
        taskId: best.task.id,
        taskTitle: best.task.title,
        projectName: best.task.projectName ?? getProjectName(best.task, projects),
        estimatedMinutes: blockMinutes,
        reason: makeReason(best.task, intent, blockMinutes, isPartial)
      });

      usedTaskIds.add(best.task.id);
      spentWorkMinutes += blockMinutes;
      cursorMinutes = parseClockTime(endTime) + BREAK_MINUTES;
    }
  }

  return suggestions;
}

function formatFreeTimeLabel(freeSlots: FreeSlot[]) {
  return freeSlots.map((slot) => `${slot.dateLabel}の${slot.startTime}〜${slot.endTime}`).join("、");
}

function buildTemplateMessage(intent: PlannerIntent, freeSlots: FreeSlot[], suggestions: ScheduleSuggestion[], hasTasks: boolean) {
  const dateLabel = intent.targetDate === "tomorrow" ? "明日" : intent.targetDate === "thisWeek" ? "今週" : "今日";
  const freeTimeLabel = formatFreeTimeLabel(freeSlots) || "空き時間";

  if (!hasTasks) {
    return `条件に合う未完了タスクが見つかりませんでした。${dateLabel}の空き時間は${freeTimeLabel}です。\nタスクを追加するか、条件をゆるめてみてください。\n\nこの予定を反映しますか？`;
  }

  const lines = [
    `${dateLabel}の空き時間は${freeTimeLabel}です。`,
    intent.difficulty === "light"
      ? "『軽めに進めたい』という希望に合わせて、短時間で区切りやすい作業を中心にしました。"
      : intent.priorityMode === "dueDate"
      ? `${dateLabel}は締切が近いタスクを優先して組みました。`
      : intent.priorityMode === "inProgress"
      ? `${dateLabel}は進行中のタスクを優先して、作業が途切れにくいように組みました。`
      : suggestions.length < 3
      ? "空き時間に対して未完了タスクの作業量が多いため、今回は優先度が高いものから一部だけ提案します。"
      : "未完了タスクの中から、作業時間と優先度を見て以下の予定を提案します。",
    ""
  ];

  if (suggestions.length > 0) {
    suggestions.forEach((suggestion) => {
      lines.push(`${suggestion.dateLabel} ${suggestion.startTime}〜${suggestion.endTime} ${suggestion.taskTitle}（${suggestion.projectName} / ${suggestion.estimatedMinutes}分）`);
      lines.push(`理由: ${suggestion.reason}`);
      lines.push("");
    });
  } else {
    lines.push("提案できるタスクが少なかったため、今回は候補を絞れませんでした。");
    lines.push("");
  }

  lines.push("この予定を反映しますか？");

  return lines.join("\n").trim();
}

// now はテストから時刻を固定するための省略可能引数。通常は現在時刻が使われる
export function generateMockPlan(message: string, tasks: Task[], projects: Project[], now: Date = new Date()): PlannerResult {
  const intent = parsePlannerIntent(message, projects);
  const normalizedTasks = normalizeTasks(tasks, projects);
  const freeSlots = buildFreeSlots(intent, now);
  const suggestions = generateSchedulePlan(normalizedTasks, freeSlots, intent, projects);
  const hasTasks = normalizedTasks.length > 0;
  let messageText = buildTemplateMessage(intent, freeSlots, suggestions, hasTasks);

  // 確信度判定: 最初のスロットで全候補を scoreTask し降順ソートし、1位と2位のスコア差を見る
  // （generateSchedulePlan の候補選定と同じ計算をここでもう一度行う）
  let alternative: ScheduleSuggestion[] | null = null;
  const firstSlot = freeSlots[0];

  if (firstSlot) {
    const scored = normalizedTasks
      .map((task) => ({ task, score: scoreTask(task, intent, firstSlot) }))
      .sort((left, right) => right.score - left.score);
    // 候補が2件未満のときはスコア差を十分大きいとみなし、低確信扱いにしない
    const gap = scored.length >= 2 ? scored[0].score - scored[1].score : Number.POSITIVE_INFINITY;

    if (gap < LOW_CONFIDENCE_SCORE_GAP) {
      // 1位のタスクを除いた候補で再計算した案を代替案(B案)にする
      const topTaskId = scored[0].task.id;
      const alternativeTasks = normalizedTasks.filter((task) => task.id !== topTaskId);
      alternative = generateSchedulePlan(alternativeTasks, freeSlots, intent, projects);
      // 拮抗している旨をメッセージ末尾に追記し、選択を促す
      messageText += "\n\nスコアが拮抗しているため2案用意しました。下のボタンからどちらを反映候補にするか選んでください。";
    }
  }

  return {
    message: messageText,
    suggestions,
    intent,
    alternative
  };
}

// 提案の有効期限チェック: 対象日が過ぎた提案は反映できない
export function splitStaleSuggestions(suggestions: ScheduleSuggestion[], today: string) {
  const valid: ScheduleSuggestion[] = [];
  const stale: ScheduleSuggestion[] = [];

  suggestions.forEach((suggestion) => {
    (suggestion.date >= today ? valid : stale).push(suggestion);
  });

  return { valid, stale };
}

export function createInitialPlannerMessage(): PlannerMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      "こんにちは。今日や今週の空き時間に合わせて、CraftCalのタスクを割り振ります。\n例: 『今日の夜に軽めのタスクを入れて』『明日の空き時間でCraftCalを進めたい』"
  };
}
