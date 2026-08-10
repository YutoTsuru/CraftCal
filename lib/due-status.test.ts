import { describe, expect, it } from "vitest";
import {
  DUE_SOON_WITHIN_DAYS,
  getDaysLeft,
  getDueStatus,
  selectDueSoonTasks
} from "@/lib/due-status";
import type { Task } from "@/types/dev-calendar";

const TODAY = "2026-08-10";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    projectId: "project-1",
    title: "タスク",
    memo: "",
    weight: "medium",
    priority: "medium",
    dueDate: null,
    scheduledDate: null,
    estimatedMinutes: null,
    status: "todo",
    completedAt: null,
    completionNote: null,
    completionUrl: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides
  };
}

describe("getDaysLeft", () => {
  it("同じ日なら 0（時刻の影響を受けない）", () => {
    expect(getDaysLeft(TODAY, TODAY)).toBe(0);
  });

  it("先の日付は正、過ぎた日付は負", () => {
    expect(getDaysLeft("2026-08-11", TODAY)).toBe(1);
    expect(getDaysLeft("2026-08-17", TODAY)).toBe(7);
    expect(getDaysLeft("2026-08-09", TODAY)).toBe(-1);
  });

  it("月をまたいでも数えられる", () => {
    expect(getDaysLeft("2026-09-01", "2026-08-31")).toBe(1);
    expect(getDaysLeft("2026-08-01", "2026-07-31")).toBe(1);
  });

  it("日付として解釈できない値は null", () => {
    expect(getDaysLeft("いつか", TODAY)).toBeNull();
    expect(getDaysLeft(TODAY, "")).toBeNull();
  });
});

describe("getDueStatus", () => {
  it.each([
    ["2026-08-08", "overdue", -2, "2日超過"],
    ["2026-08-09", "overdue", -1, "1日超過"],
    ["2026-08-10", "today", 0, "今日まで"],
    ["2026-08-11", "soon", 1, "明日まで"],
    ["2026-08-12", "soon", 2, "あと2日"],
    ["2026-08-13", "upcoming", 3, "あと3日"],
    ["2026-08-17", "upcoming", 7, "あと7日"]
  ] as const)("%s → %s (%i日) 「%s」", (dueDate, severity, daysLeft, label) => {
    const status = getDueStatus(dueDate, TODAY);
    expect(status).toEqual({ severity, daysLeft, label });
  });

  it("解釈できない値は null", () => {
    expect(getDueStatus("---", TODAY)).toBeNull();
  });
});

describe("selectDueSoonTasks", () => {
  it("期限が今日のタスクを含む（以前は時刻差で漏れていた回帰の防止）", () => {
    const task = makeTask({ dueDate: TODAY, title: "今日が期限" });
    const picked = selectDueSoonTasks([task], TODAY);

    expect(picked).toHaveLength(1);
    expect(picked[0].due.severity).toBe("today");
  });

  it("期限切れのタスクも含む（最も急ぐため）", () => {
    const task = makeTask({ dueDate: "2026-08-05", title: "超過" });
    const picked = selectDueSoonTasks([task], TODAY);

    expect(picked).toHaveLength(1);
    expect(picked[0].due.severity).toBe("overdue");
    expect(picked[0].due.daysLeft).toBe(-5);
  });

  it("完了済みは除外する", () => {
    const task = makeTask({ dueDate: TODAY, status: "done" });
    expect(selectDueSoonTasks([task], TODAY)).toHaveLength(0);
  });

  it("期限なしは除外する", () => {
    expect(selectDueSoonTasks([makeTask({ dueDate: null })], TODAY)).toHaveLength(0);
  });

  it("既定の範囲は7日先まで（8日先は含めない）", () => {
    const within = makeTask({ dueDate: "2026-08-17", title: "7日後" });
    const beyond = makeTask({ dueDate: "2026-08-18", title: "8日後" });

    const picked = selectDueSoonTasks([within, beyond], TODAY);
    expect(picked.map((p) => p.task.title)).toEqual(["7日後"]);
    expect(DUE_SOON_WITHIN_DAYS).toBe(7);
  });

  it("範囲は指定できる", () => {
    const task = makeTask({ dueDate: "2026-08-20", title: "10日後" });
    expect(selectDueSoonTasks([task], TODAY, { withinDays: 14 })).toHaveLength(1);
    expect(selectDueSoonTasks([task], TODAY, { withinDays: 7 })).toHaveLength(0);
  });

  it("危険な順（残り日数の少ない順）に並ぶ", () => {
    const tasks = [
      makeTask({ dueDate: "2026-08-13", title: "3日後" }),
      makeTask({ dueDate: "2026-08-05", title: "超過" }),
      makeTask({ dueDate: TODAY, title: "今日" }),
      makeTask({ dueDate: "2026-08-11", title: "明日" })
    ];

    expect(selectDueSoonTasks(tasks, TODAY).map((p) => p.task.title)).toEqual([
      "超過",
      "今日",
      "明日",
      "3日後"
    ]);
  });

  it("limit で件数を絞れる（絞っても危険な順は保たれる）", () => {
    const tasks = [
      makeTask({ dueDate: "2026-08-13", title: "3日後" }),
      makeTask({ dueDate: "2026-08-05", title: "超過" }),
      makeTask({ dueDate: TODAY, title: "今日" })
    ];

    expect(selectDueSoonTasks(tasks, TODAY, { limit: 2 }).map((p) => p.task.title)).toEqual([
      "超過",
      "今日"
    ]);
  });
});
