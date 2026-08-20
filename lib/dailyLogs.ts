import type { DailyLog } from "@/types/dev-calendar";

const STORAGE_KEY = "craftcal-dailylogs";

function readAll(): DailyLog[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DailyLog[];
  } catch {
    return [];
  }
}

function writeAll(items: DailyLog[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function saveOrUpdateDailyLog(log: Partial<DailyLog> & { taskId: string; date: string }): DailyLog {
  const all = readAll();
  const today = log.date;
  const existing = all.find((l) => l.taskId === log.taskId && l.date === today);

  const now = new Date().toISOString();

  if (existing) {
    const updated: DailyLog = {
      ...existing,
      did: log.did ?? existing.did ?? "",
      blocked: log.blocked ?? existing.blocked ?? "",
      next: log.next ?? existing.next ?? "",
      doneToday: typeof log.doneToday === "boolean" ? log.doneToday : existing.doneToday,
      updatedAt: now
    };

    const rest = all.filter((l) => !(l.taskId === log.taskId && l.date === today));
    const next = [updated, ...rest];
    writeAll(next);
    return updated;
  }

  const created: DailyLog = {
    id: crypto.randomUUID(),
    taskId: log.taskId,
    date: today,
    did: log.did ?? "",
    blocked: log.blocked ?? "",
    next: log.next ?? "",
    doneToday: typeof log.doneToday === "boolean" ? log.doneToday : false,
    createdAt: now,
    updatedAt: now
  };

  writeAll([created, ...all]);
  return created;
}

export function getRecentLogs(limit = 5) {
  const all = readAll();
  return all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, limit);
}

export function getLogsByDate(date: string) {
  return readAll().filter((l) => l.date === date);
}

export function getAllLogs() {
  return readAll();
}

export function getLogsForTask(taskId: string) {
  return readAll().filter((l) => l.taskId === taskId);
}

// Issue #73: 上の関数を束ねた default export があったが、呼び出し側は
// すべて名前付き import を使っており未使用だったため削除した。

/**
 * 作業ログをすべて消す (Issue #89)。
 *
 * 「すべてのデータを削除」から呼ぶ。タスクを消しても作業ログが残ると、
 * 活動グリッド・最近の作業ログ・達成バッジに古い記録が表示され続ける。
 *
 * キー名はこのモジュールが持っているので、削除処理もここに置く
 * （UI 側にキー名を直書きしない）。
 */
export function clearAllDailyLogs(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * 指定タスクの作業ログを消し、消したぶんを返す (Issue #91)。
 *
 * タスクを削除してもログが残ると、
 *   - 最近の作業ログに「(Unknown)」の行が並ぶ（タスク名を引けないため）
 *   - 活動グリッドと達成バッジが、存在しないタスクの記録を数え続ける
 * という状態になる。
 *
 * 返り値は restoreDailyLogs に渡すためのもの。タスク削除はサーバー側の削除が
 * 失敗すると巻き戻るので、そのときにログも戻せるようにしている。
 */
export function deleteLogsForTask(taskId: string): DailyLog[] {
  const all = readAll();
  const removed = all.filter((l) => l.taskId === taskId);
  if (removed.length === 0) return [];

  writeAll(all.filter((l) => l.taskId !== taskId));
  return removed;
}

/**
 * deleteLogsForTask で消したログを書き戻す (Issue #91)。
 * 同じ id が既にあるものは重複させない。
 */
export function restoreDailyLogs(logs: DailyLog[]): void {
  if (logs.length === 0) return;

  const all = readAll();
  const existingIds = new Set(all.map((l) => l.id));
  const restored = logs.filter((l) => !existingIds.has(l.id));
  if (restored.length === 0) return;

  writeAll([...restored, ...all]);
}
