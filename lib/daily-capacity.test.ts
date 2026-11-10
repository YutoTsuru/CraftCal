import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_DAILY_CAPACITY_HOURS,
  clampCapacityHours,
  estimateTaskMinutes,
  getDailyCapacityHours,
  selectWithinCapacity,
  setDailyCapacityHours
} from "@/lib/daily-capacity";
import type { Task } from "@/types/dev-calendar";

let seq = 0;

function makeTask(overrides: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `task-${seq}`,
    projectId: "inbox",
    title: `タスク${seq}`,
    memo: "",
    weight: "medium",
    priority: "medium",
    dueDate: null,
    scheduledDate: null,
    estimatedMinutes: null,
    status: "todo",
    createdAt: `2026-01-${String(seq).padStart(2, "0")}T00:00:00.000Z`,
    ...overrides
  };
}

describe("clampCapacityHours", () => {
  it("0.5〜12 の範囲に収める", () => {
    expect(clampCapacityHours(0.1)).toBe(0.5);
    expect(clampCapacityHours(100)).toBe(12);
    expect(clampCapacityHours(4.5)).toBe(4.5);
  });

  it("不正値（NaN / Infinity）は既定値になる", () => {
    expect(clampCapacityHours(Number.NaN)).toBe(DEFAULT_DAILY_CAPACITY_HOURS);
    expect(clampCapacityHours(Number.POSITIVE_INFINITY)).toBe(DEFAULT_DAILY_CAPACITY_HOURS);
  });
});

describe("get/setDailyCapacityHours", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("localStorage が使えない環境では既定値を返し、保存で例外を投げない", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      }
    });
    expect(getDailyCapacityHours()).toBe(DEFAULT_DAILY_CAPACITY_HOURS);
    expect(() => setDailyCapacityHours(5)).not.toThrow();
  });

  it("保存した値を読み戻せ、範囲外はクランプされ、不正な保存値は既定値になる", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v)
    });
    expect(getDailyCapacityHours()).toBe(DEFAULT_DAILY_CAPACITY_HOURS);
    setDailyCapacityHours(5);
    expect(getDailyCapacityHours()).toBe(5);
    setDailyCapacityHours(99);
    expect(getDailyCapacityHours()).toBe(12);
    store.set("craftcal-daily-capacity-hours", "abc");
    expect(getDailyCapacityHours()).toBe(DEFAULT_DAILY_CAPACITY_HOURS);
  });
});

describe("estimateTaskMinutes", () => {
  it("見積があればそれを使う", () => {
    expect(estimateTaskMinutes(makeTask({ estimatedMinutes: 45, weight: "heavy" }))).toBe(45);
  });

  it("見積が無ければ重さから換算する（light=30 / medium=60 / heavy=120）", () => {
    expect(estimateTaskMinutes(makeTask({ weight: "light" }))).toBe(30);
    expect(estimateTaskMinutes(makeTask({ weight: "medium" }))).toBe(60);
    expect(estimateTaskMinutes(makeTask({ weight: "heavy" }))).toBe(120);
  });
});

describe("selectWithinCapacity", () => {
  it("容量内なら全件 visible", () => {
    const tasks = [makeTask(), makeTask()]; // 60+60=120分
    const { visible, hidden } = selectWithinCapacity(tasks, 3);
    expect(visible).toHaveLength(2);
    expect(hidden).toHaveLength(0);
  });

  it("容量を超えた分は入力順を保ったまま hidden になる", () => {
    const tasks = [1, 2, 3, 4, 5].map(() => makeTask({ estimatedMinutes: 60 }));
    const { visible, hidden } = selectWithinCapacity(tasks, 4); // 240分 = 4件ぶん
    expect(visible.map((t) => t.id)).toEqual(tasks.slice(0, 4).map((t) => t.id));
    expect(hidden.map((t) => t.id)).toEqual([tasks[4].id]);
  });

  it("容量が極小でも最低3件は visible に入る", () => {
    const tasks = [1, 2, 3, 4, 5].map(() => makeTask({ weight: "heavy" }));
    const { visible, hidden } = selectWithinCapacity(tasks, 0.5);
    expect(visible).toHaveLength(3);
    expect(hidden).toHaveLength(2);
  });

  it("done のタスクは容量を消費しない", () => {
    const done = [1, 2, 3].map(() => makeTask({ status: "done", weight: "heavy" }));
    const open = makeTask({ estimatedMinutes: 60 });
    const { visible, hidden } = selectWithinCapacity([...done, open], 1);
    expect(visible).toHaveLength(4);
    expect(hidden).toHaveLength(0);
  });
});
