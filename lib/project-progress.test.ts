import { describe, expect, it } from "vitest";
import { getProjectProgress } from "@/lib/project-progress";
import type { Task } from "@/types/dev-calendar";

let seq = 0;
function makeTask(overrides: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `task-${seq}`,
    projectId: "project-1",
    title: `タスク${seq}`,
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

describe("getProjectProgress", () => {
  it("タスクが0件なら 0", () => {
    expect(getProjectProgress([], "project-1")).toBe(0);
  });

  it("対象プロジェクトのタスクが無ければ 0（他プロジェクトは数えない）", () => {
    const tasks = [makeTask({ projectId: "other", status: "done" })];
    expect(getProjectProgress(tasks, "project-1")).toBe(0);
  });

  it("全て完了なら 100", () => {
    const tasks = [makeTask({ status: "done" }), makeTask({ status: "done" })];
    expect(getProjectProgress(tasks, "project-1")).toBe(100);
  });

  it("途中なら完了割合（他プロジェクトは除外）", () => {
    const tasks = [
      makeTask({ status: "done" }),
      makeTask({ status: "doing" }),
      makeTask({ status: "todo" }),
      makeTask({ status: "done" }),
      makeTask({ projectId: "other", status: "done" })
    ];
    expect(getProjectProgress(tasks, "project-1")).toBe(50);
  });

  it("小数は四捨五入する（1/3 → 33, 2/3 → 67）", () => {
    const one = [makeTask({ status: "done" }), makeTask(), makeTask()];
    expect(getProjectProgress(one, "project-1")).toBe(33);
    const two = [makeTask({ status: "done" }), makeTask({ status: "done" }), makeTask()];
    expect(getProjectProgress(two, "project-1")).toBe(67);
  });
});
