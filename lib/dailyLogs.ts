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

export default {
  saveOrUpdateDailyLog,
  getRecentLogs,
  getLogsByDate,
  getAllLogs,
  getLogsForTask
};
