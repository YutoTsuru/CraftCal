import { describe, expect, it } from "vitest";
import { createSeedData } from "@/lib/seed-data";
import { INBOX_PROJECT_ID } from "@/lib/storage";

describe("createSeedData", () => {
  it("プロジェクト2件（CraftCal + ポートフォリオ）を返す", () => {
    const { projects } = createSeedData();

    expect(projects).toHaveLength(2);
    expect(projects.map((p) => p.name)).toContain("CraftCal");
  });

  it("タスクのIDに重複がない", () => {
    const { tasks } = createSeedData();
    const ids = tasks.map((t) => t.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("すべてのタスクの projectId が実在するプロジェクト（またはInbox）を指す", () => {
    const { projects, tasks } = createSeedData();
    const validIds = new Set([...projects.map((p) => p.id), INBOX_PROJECT_ID]);

    for (const task of tasks) {
      expect(validIds.has(task.projectId)).toBe(true);
    }
  });

  it("日付フィールドは YYYY-MM-DD 形式（または null）", () => {
    const { tasks } = createSeedData();
    const dateFormat = /^\d{4}-\d{2}-\d{2}$/;

    for (const task of tasks) {
      if (task.scheduledDate != null) expect(task.scheduledDate).toMatch(dateFormat);
      if (task.dueDate != null) expect(task.dueDate).toMatch(dateFormat);
    }
  });

  it("画面確認に必要な状態が一通り揃っている（今日のタスク・完了・進行中・未配置）", () => {
    const { tasks } = createSeedData();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Today ページに出るタスクがある
    expect(tasks.some((t) => t.scheduledDate === todayStr)).toBe(true);
    // 完了済みタスクがあり completedAt が入っている
    expect(tasks.some((t) => t.status === "done" && t.completedAt != null)).toBe(true);
    // 進行中タスクがある
    expect(tasks.some((t) => t.status === "doing")).toBe(true);
    // カレンダーの「未配置置き場」に出るタスクがある
    expect(tasks.some((t) => t.scheduledDate == null && t.status !== "done")).toBe(true);
    // Inbox のタスクがある
    expect(tasks.some((t) => t.projectId === INBOX_PROJECT_ID)).toBe(true);
  });
});
