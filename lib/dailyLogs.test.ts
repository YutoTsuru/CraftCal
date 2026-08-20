import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAllDailyLogs, deleteLogsForTask, restoreDailyLogs } from "@/lib/dailyLogs";

const KEY = "craftcal-dailylogs";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** localStorage の最小スタブ。jsdom を入れずに挙動だけ確かめる */
function stubLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k)
    }
  });
  return store;
}

describe("clearAllDailyLogs", () => {
  it("作業ログのキーを消す", () => {
    const store = stubLocalStorage({ [KEY]: "[]" });

    clearAllDailyLogs();

    expect(store.has(KEY)).toBe(false);
  });

  it("他のキーには触らない", () => {
    const store = stubLocalStorage({ [KEY]: "[]", "craftcal-state": "{}", other: "x" });

    clearAllDailyLogs();

    expect(store.get("craftcal-state")).toBe("{}");
    expect(store.get("other")).toBe("x");
  });

  it("サーバー側（window が無い）で呼んでも落ちない", () => {
    vi.stubGlobal("window", undefined);
    expect(() => clearAllDailyLogs()).not.toThrow();
  });
});

describe("deleteLogsForTask (Issue #91)", () => {
  const log = (id: string, taskId: string) =>
    ({
      id,
      taskId,
      date: "2026-08-20",
      did: "",
      blocked: "",
      next: "",
      doneToday: false,
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-08-20T00:00:00.000Z"
    });

  it("そのタスクのログだけ消す", () => {
    const store = stubLocalStorage({
      [KEY]: JSON.stringify([log("a", "task-1"), log("b", "task-2"), log("c", "task-1")])
    });

    const removed = deleteLogsForTask("task-1");

    expect(removed.map((l) => l.id).sort()).toEqual(["a", "c"]);
    const rest = JSON.parse(store.get(KEY)!);
    expect(rest.map((l: { id: string }) => l.id)).toEqual(["b"]);
  });

  it("該当が無ければ何も消さず空配列を返す", () => {
    const store = stubLocalStorage({ [KEY]: JSON.stringify([log("a", "task-1")]) });

    expect(deleteLogsForTask("task-9")).toEqual([]);
    expect(JSON.parse(store.get(KEY)!)).toHaveLength(1);
  });

  it("サーバー側（window が無い）で呼んでも落ちない", () => {
    vi.stubGlobal("window", undefined);
    expect(() => deleteLogsForTask("task-1")).not.toThrow();
  });
});

describe("restoreDailyLogs (Issue #91)", () => {
  const log = (id: string, taskId: string) =>
    ({
      id,
      taskId,
      date: "2026-08-20",
      did: "",
      blocked: "",
      next: "",
      doneToday: false,
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-08-20T00:00:00.000Z"
    });

  it("消したログを書き戻せる（削除が失敗したときの巻き戻し）", () => {
    const store = stubLocalStorage({
      [KEY]: JSON.stringify([log("a", "task-1"), log("b", "task-2")])
    });

    const removed = deleteLogsForTask("task-1");
    restoreDailyLogs(removed);

    const ids = JSON.parse(store.get(KEY)!).map((l: { id: string }) => l.id);
    expect(ids.sort()).toEqual(["a", "b"]);
  });

  it("同じidが既にあるものは重複させない", () => {
    const store = stubLocalStorage({ [KEY]: JSON.stringify([log("a", "task-1")]) });

    restoreDailyLogs([log("a", "task-1")]);

    expect(JSON.parse(store.get(KEY)!)).toHaveLength(1);
  });

  it("空配列なら何もしない", () => {
    const store = stubLocalStorage({ [KEY]: JSON.stringify([log("a", "task-1")]) });

    restoreDailyLogs([]);

    expect(JSON.parse(store.get(KEY)!)).toHaveLength(1);
  });
});
