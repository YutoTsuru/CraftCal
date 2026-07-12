import { describe, expect, it } from "vitest";
import { selectTopTasks } from "@/lib/top-tasks";
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

const today = "2026-07-12";

describe("selectTopTasks", () => {
  it("doing のタスクは todo より上位に来る", () => {
    const todoTask = makeTask({ status: "todo" });
    const doingTask = makeTask({ status: "doing" });

    const result = selectTopTasks([todoTask, doingTask], today);

    expect(result[0].id).toBe(doingTask.id);
    expect(result[1].id).toBe(todoTask.id);
  });

  it("期限切れのタスクが最優先になる", () => {
    const overdueTask = makeTask({ dueDate: "2026-07-10", priority: "low" });
    const highPriorityTask = makeTask({ priority: "high" });
    const scheduledTodayTask = makeTask({ scheduledDate: today });

    const result = selectTopTasks([highPriorityTask, scheduledTodayTask, overdueTask], today);

    expect(result[0].id).toBe(overdueTask.id);
  });

  it("done のタスクは除外される", () => {
    const doneTask = makeTask({ status: "done", priority: "high" });
    const todoTask = makeTask({ status: "todo" });

    const result = selectTopTasks([doneTask, todoTask], today);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(todoTask.id);
  });

  it("limit 件数で切れる", () => {
    const tasks = [makeTask(), makeTask(), makeTask(), makeTask(), makeTask()];

    const result = selectTopTasks(tasks, today, 3);

    expect(result).toHaveLength(3);
  });

  it("同点のときは createdAt 昇順（古い方が先）になる", () => {
    const older = makeTask({ createdAt: "2026-01-01T00:00:00.000Z" });
    const newer = makeTask({ createdAt: "2026-02-01T00:00:00.000Z" });

    const result = selectTopTasks([newer, older], today);

    expect(result[0].id).toBe(older.id);
    expect(result[1].id).toBe(newer.id);
  });

  it("未完了タスクが1件もなければ空配列を返す", () => {
    const doneTask = makeTask({ status: "done" });

    const result = selectTopTasks([doneTask], today);

    expect(result).toHaveLength(0);
  });
});
