import { describe, expect, it } from "vitest";
import {
  formatDate,
  generateSchedule,
  getDateRange,
  getDayPoint,
  getTaskWeightPoint,
  getTodayString,
  getTodayTasks,
  resolveDayTasks
} from "@/lib/schedule";
import type { Sprint, Task } from "@/types/dev-calendar";

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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

const sprint: Sprint = { startDate: "2026-01-05", endDate: "2026-01-07" };

describe("getTaskWeightPoint", () => {
  it("重さをポイントに変換する", () => {
    expect(getTaskWeightPoint("light")).toBe(1);
    expect(getTaskWeightPoint("medium")).toBe(2);
    expect(getTaskWeightPoint("heavy")).toBe(3);
  });
});

describe("getDateRange", () => {
  it("開始日から終了日までの日付を列挙する", () => {
    expect(getDateRange("2026-01-05", "2026-01-07")).toEqual(["2026-01-05", "2026-01-06", "2026-01-07"]);
  });

  it("開始日と終了日が同じなら1日だけ返す", () => {
    expect(getDateRange("2026-01-05", "2026-01-05")).toEqual(["2026-01-05"]);
  });

  it("開始日が終了日より後なら空配列を返す", () => {
    expect(getDateRange("2026-01-07", "2026-01-05")).toEqual([]);
  });

  it("不正な日付なら空配列を返す", () => {
    expect(getDateRange("invalid", "2026-01-05")).toEqual([]);
  });
});

describe("formatDate", () => {
  it("YYYY-MM-DD 形式でゼロ埋めする", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("generateSchedule", () => {
  it("sprint が null なら空配列を返す", () => {
    expect(generateSchedule([makeTask()], null)).toEqual([]);
  });

  it("スケジュールはタスクIDのみを持つ", () => {
    const task = makeTask();
    const schedule = generateSchedule([task], sprint);

    expect(schedule).toHaveLength(3);
    for (const day of schedule) {
      expect(day).not.toHaveProperty("tasks");
      expect(Array.isArray(day.taskIds)).toBe(true);
    }
    expect(schedule.flatMap((d) => d.taskIds)).toEqual([task.id]);
  });

  it("scheduledDate を持つタスクはその日に固定される", () => {
    const fixed = makeTask({ scheduledDate: "2026-01-06" });
    const schedule = generateSchedule([fixed], sprint);

    expect(schedule.find((d) => d.date === "2026-01-06")?.taskIds).toContain(fixed.id);
  });

  it("完了タスクは割り当てられない", () => {
    const done = makeTask({ status: "done" });
    const schedule = generateSchedule([done], sprint);

    expect(schedule.flatMap((d) => d.taskIds)).toEqual([]);
  });

  it("重さポイントが均等になるように負荷分散する", () => {
    const tasks = [
      makeTask({ weight: "heavy" }),
      makeTask({ weight: "heavy" }),
      makeTask({ weight: "heavy" }),
      makeTask({ weight: "light" }),
      makeTask({ weight: "light" }),
      makeTask({ weight: "light" })
    ];
    const schedule = generateSchedule(tasks, sprint);
    const points = schedule.map((day) => getDayPoint(day, tasks));

    // 合計 3*3 + 1*3 = 12pt を3日で分散するので各日4pt
    expect(points).toEqual([4, 4, 4]);
  });

  it("既に予定が入っている日を避けて負荷分散する", () => {
    const fixed = makeTask({ weight: "heavy", scheduledDate: "2026-01-05" });
    const floating = makeTask({ weight: "light" });
    const schedule = generateSchedule([fixed, floating], sprint);

    const floatingDay = schedule.find((d) => d.taskIds.includes(floating.id));
    expect(floatingDay?.date).not.toBe("2026-01-05");
  });
});

describe("resolveDayTasks / getDayPoint", () => {
  it("ID からタスク本体を解決する", () => {
    const a = makeTask({ weight: "light" });
    const b = makeTask({ weight: "heavy" });
    const day = { date: "2026-01-05", taskIds: [a.id, b.id] };

    expect(resolveDayTasks(day, [a, b])).toEqual([a, b]);
    expect(getDayPoint(day, [a, b])).toBe(4);
  });

  it("存在しないIDは無視する", () => {
    const a = makeTask();
    const day = { date: "2026-01-05", taskIds: [a.id, "deleted-id"] };

    expect(resolveDayTasks(day, [a])).toEqual([a]);
    expect(getDayPoint(day, [a])).toBe(2);
  });
});

describe("getTodayTasks", () => {
  const today = getTodayString();

  it("スケジュールとタスク側の予定日/期限をマージし重複を除く", () => {
    const scheduled = makeTask();
    const byScheduledDate = makeTask({ scheduledDate: today });
    const byDueDate = makeTask({ dueDate: today });
    const both = makeTask({ scheduledDate: today });
    const unrelated = makeTask();

    const schedule = [{ date: today, taskIds: [scheduled.id, both.id] }];
    const allTasks = [scheduled, byScheduledDate, byDueDate, both, unrelated];

    const result = getTodayTasks(schedule, allTasks);
    const ids = result.map((t) => t.id);

    expect(ids).toContain(scheduled.id);
    expect(ids).toContain(byScheduledDate.id);
    expect(ids).toContain(byDueDate.id);
    expect(ids).toContain(both.id);
    expect(ids).not.toContain(unrelated.id);
    expect(ids).toHaveLength(4);
  });

  it("削除済みタスクのIDがスケジュールに残っていても無視する", () => {
    const schedule = [{ date: today, taskIds: ["deleted-id"] }];
    expect(getTodayTasks(schedule, [])).toEqual([]);
  });
});
