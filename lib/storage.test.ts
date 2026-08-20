import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INBOX_PROJECT_ID,
  clearLocalState,
  SCHEMA_VERSION,
  ensureInboxProject,
  migrateScheduleDay,
  migrateState,
  migrateTask,
  parsePersistedState,
  serializeState
} from "@/lib/storage";
import type { Project } from "@/types/dev-calendar";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "CraftCal",
    description: null,
    overviewUrl: null,
    color: null,
    status: "active",
    goal: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("ensureInboxProject", () => {
  it("Inbox がなければ先頭に追加する", () => {
    const result = ensureInboxProject([makeProject()]);

    expect(result[0].id).toBe(INBOX_PROJECT_ID);
    expect(result).toHaveLength(2);
  });

  it("Inbox が既にあればそのまま返す", () => {
    const projects = [makeProject({ id: INBOX_PROJECT_ID, name: "Inbox" })];
    expect(ensureInboxProject(projects)).toBe(projects);
  });
});

describe("migrateTask", () => {
  it("レガシーフィールドを新フィールドに移す", () => {
    const task = migrateTask(
      {
        id: "t1",
        title: "旧形式タスク",
        plannedDate: "2026-01-05",
        estimateHours: 1.5,
        project: "p1"
      },
      INBOX_PROJECT_ID
    );

    expect(task.scheduledDate).toBe("2026-01-05");
    expect(task.estimatedMinutes).toBe(90);
    expect(task.projectId).toBe("p1");
  });

  it("欠けているフィールドはデフォルト値で埋める", () => {
    const task = migrateTask({}, INBOX_PROJECT_ID);

    expect(task.id).toBeTruthy();
    expect(task.projectId).toBe(INBOX_PROJECT_ID);
    expect(task.weight).toBe("medium");
    expect(task.priority).toBe("medium");
    expect(task.status).toBe("todo");
  });

  it("新フィールドが両方あるときは新フィールドを優先する", () => {
    const task = migrateTask(
      { scheduledDate: "2026-01-06", plannedDate: "2026-01-05", estimatedMinutes: 45, estimateHours: 2 },
      INBOX_PROJECT_ID
    );

    expect(task.scheduledDate).toBe("2026-01-06");
    expect(task.estimatedMinutes).toBe(45);
  });
});

describe("migrateScheduleDay", () => {
  it("旧形式（タスク複製）から taskIds を取り出す", () => {
    const day = migrateScheduleDay({
      date: "2026-01-05",
      tasks: [{ id: "t1" }, { id: "t2" }, {}]
    });

    expect(day).toEqual({ date: "2026-01-05", taskIds: ["t1", "t2"] });
  });

  it("新形式（taskIds）はそのまま通す", () => {
    const day = migrateScheduleDay({ date: "2026-01-05", taskIds: ["t1", 123, null, "t2"] });

    expect(day).toEqual({ date: "2026-01-05", taskIds: ["t1", "t2"] });
  });
});

describe("migrateState", () => {
  it("旧形式の state 全体を新形式に変換し、存在しないタスクIDを除去する", () => {
    const state = migrateState({
      tasks: [{ id: "t1", title: "A" }],
      sprint: { startDate: "2026-01-05", endDate: "2026-01-07" },
      schedule: [
        { date: "2026-01-05", tasks: [{ id: "t1" }, { id: "ghost" }] },
        { date: "2026-01-06", tasks: [] }
      ],
      projects: [{ id: "p1", name: "CraftCal" }]
    });

    expect(state.tasks).toHaveLength(1);
    expect(state.schedule[0].taskIds).toEqual(["t1"]);
    expect(state.schedule[1].taskIds).toEqual([]);
    expect(state.projects?.some((p) => p.id === INBOX_PROJECT_ID)).toBe(true);
    expect(state.projects?.some((p) => p.id === "p1")).toBe(true);
    expect(state.sprint).toEqual({ startDate: "2026-01-05", endDate: "2026-01-07" });
  });

  it("空のデータでも安全に処理する", () => {
    const state = migrateState({});

    expect(state.tasks).toEqual([]);
    expect(state.schedule).toEqual([]);
    expect(state.sprint).toBeNull();
    expect(state.projects?.[0].id).toBe(INBOX_PROJECT_ID);
  });
});

describe("serializeState / parsePersistedState (Issue #9)", () => {
  it("serializeState は schemaVersion を必ず付与する", () => {
    const raw = serializeState({ tasks: [], sprint: null, schedule: [], projects: [] });

    expect(JSON.parse(raw).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("serialize → parse の往復で状態が保たれる（v2ラウンドトリップ）", () => {
    const original = migrateState({
      tasks: [{ id: "t1", title: "往復テスト", scheduledDate: "2026-01-05" }],
      sprint: null,
      schedule: [{ date: "2026-01-05", taskIds: ["t1"] }],
      projects: [{ id: "p1", name: "CraftCal" }]
    });

    const restored = parsePersistedState(serializeState(original));

    expect(restored).not.toBeNull();
    expect(restored?.tasks).toEqual(original.tasks);
    expect(restored?.schedule).toEqual(original.schedule);
    expect(restored?.projects).toEqual(original.projects);
  });

  it("schemaVersion なしの旧形式(v1)データも読める", () => {
    const legacyRaw = JSON.stringify({
      tasks: [{ id: "t1", title: "旧タスク", plannedDate: "2026-01-05", estimateHours: 1 }],
      schedule: [{ date: "2026-01-05", tasks: [{ id: "t1" }] }]
    });

    const state = parsePersistedState(legacyRaw);

    expect(state).not.toBeNull();
    expect(state?.tasks[0].scheduledDate).toBe("2026-01-05");
    expect(state?.tasks[0].estimatedMinutes).toBe(60);
    expect(state?.schedule[0].taskIds).toEqual(["t1"]);
  });

  it("壊れたJSONは null を返す（例外を投げない）", () => {
    expect(parsePersistedState("{壊れたデータ")).toBeNull();
  });
});

describe("clearLocalState (Issue #89)", () => {
  const KEY = "craftcal-state";

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

  it("移行前の保存データを消す", () => {
    const store = stubLocalStorage({ [KEY]: "{}" });

    clearLocalState();

    expect(store.has(KEY)).toBe(false);
  });

  it("作業ログのキーには触らない（保存先が別のため）", () => {
    const store = stubLocalStorage({ [KEY]: "{}", "craftcal-dailylogs": "[]" });

    clearLocalState();

    expect(store.get("craftcal-dailylogs")).toBe("[]");
  });

  it("サーバー側（window が無い）で呼んでも落ちない", () => {
    vi.stubGlobal("window", undefined);
    expect(() => clearLocalState()).not.toThrow();
  });
});
