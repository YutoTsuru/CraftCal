import { describe, expect, it } from "vitest";
import { createSeedData } from "@/lib/seed-data";
import { INBOX_PROJECT_ID } from "@/lib/storage";
import { isPaletteColor } from "@/lib/colors";
import { getDaysLeft } from "@/lib/due-status";
import { formatDate } from "@/lib/schedule";
import { isMultiDayTask } from "@/lib/calendar-bars";

const TODAY = formatDate(new Date());

describe("createSeedData: 基本的な整合性", () => {
  it("プロジェクト5件を返す", () => {
    const { projects } = createSeedData();

    expect(projects).toHaveLength(5);
    expect(projects.map((p) => p.name)).toEqual([
      "CraftCal",
      "tobenaitsuru-HP",
      "技術ブログを立ち上げる",
      "家計簿アプリ (休止中)",
      "ショートカット早見表"
    ]);
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

  it("どのプロジェクトにもタスクが1件以上ある（空のカードが出ない）", () => {
    const { projects, tasks } = createSeedData();

    for (const project of projects) {
      expect(tasks.some((t) => t.projectId === project.id)).toBe(true);
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

  it("プロジェクトの色がすべてパレット内の色（Issue #57 のコントラスト保証が効く）", () => {
    const { projects } = createSeedData();

    for (const project of projects) {
      expect(isPaletteColor(project.color)).toBe(true);
    }
  });

  it("完了タスクだけが completedAt を持つ", () => {
    const { tasks } = createSeedData();

    for (const task of tasks) {
      if (task.status === "done") {
        expect(task.completedAt).not.toBeNull();
      } else {
        expect(task.completedAt).toBeNull();
      }
    }
  });
});

describe("createSeedData: 各画面を試せる状態が揃っている (Issue #85)", () => {
  it("今日の予定に入るタスクがある（ホームとカレンダー）", () => {
    const { tasks } = createSeedData();
    expect(tasks.some((t) => t.scheduledDate === TODAY)).toBe(true);
  });

  it("期限切れのタスクがある（ホームの危険度が赤になる）", () => {
    const { tasks } = createSeedData();
    const overdue = tasks.filter(
      (t) => t.status !== "done" && t.dueDate != null && (getDaysLeft(t.dueDate, TODAY) ?? 0) < 0
    );
    expect(overdue.length).toBeGreaterThan(0);
  });

  it("今日が期限のタスクがある（Issue #69 で直した境界）", () => {
    const { tasks } = createSeedData();
    const dueToday = tasks.filter(
      (t) => t.status !== "done" && t.dueDate != null && getDaysLeft(t.dueDate, TODAY) === 0
    );
    expect(dueToday.length).toBeGreaterThan(0);
  });

  it("週をまたぐ期間つきタスクがある（カレンダーの週またぎバー）", () => {
    const { tasks } = createSeedData();
    const spanning = tasks.filter((t) => {
      if (!isMultiDayTask(t)) return false;
      const days = getDaysLeft(t.dueDate!, t.scheduledDate!);
      return days != null && days >= 7;
    });
    expect(spanning.length).toBeGreaterThan(0);
  });

  it("同じ時期に重なる期間つきタスクが複数ある（バーが2段になる）", () => {
    const { tasks } = createSeedData();
    const periods = tasks.filter(isMultiDayTask);

    // 期間が重なる組み合わせが1つ以上あること
    const overlapping = periods.some((a, i) =>
      periods.slice(i + 1).some((b) => {
        const aStart = a.scheduledDate!;
        const aEnd = a.dueDate!;
        const bStart = b.scheduledDate!;
        const bEnd = b.dueDate!;
        // 文字列のまま比較できる（YYYY-MM-DD は辞書順 = 日付順）
        return !(aEnd < bStart || bEnd < aStart);
      })
    );
    expect(overlapping).toBe(true);
  });

  it("未配置タスクがある（カレンダーの未配置置き場）", () => {
    const { tasks } = createSeedData();
    expect(tasks.some((t) => t.scheduledDate == null && t.status !== "done")).toBe(true);
  });

  it("進行中タスクがある", () => {
    const { tasks } = createSeedData();
    expect(tasks.some((t) => t.status === "doing")).toBe(true);
  });

  it("完了タスクが複数の日に散っている（活動グリッドに濃淡が出る）", () => {
    const { tasks } = createSeedData();
    const completedDays = new Set(
      tasks
        .filter((t) => t.status === "done" && t.completedAt != null)
        .map((t) => formatDate(new Date(t.completedAt!)))
    );
    // 1日に固まっていると草が1マスしか埋まらない
    expect(completedDays.size).toBeGreaterThanOrEqual(3);
  });

  it("優先度・重さ・状態がばらついている", () => {
    const { tasks } = createSeedData();

    expect(new Set(tasks.map((t) => t.priority)).size).toBe(3);
    expect(new Set(tasks.map((t) => t.weight)).size).toBe(3);
    expect(new Set(tasks.map((t) => t.status)).size).toBeGreaterThanOrEqual(3);
  });

  it("Inbox のタスクがある", () => {
    const { tasks } = createSeedData();
    expect(tasks.some((t) => t.projectId === INBOX_PROJECT_ID)).toBe(true);
  });

  it("プロジェクトの状態が3種類そろっている（状態バッジを試せる / Issue #93）", () => {
    const { projects } = createSeedData();
    const statuses = new Set(projects.map((p) => p.status));

    expect(statuses).toEqual(new Set(["active", "paused", "done"]));
  });

  it("全タスクが完了しているプロジェクトがある（進捗バーが満杯になる）", () => {
    const { projects, tasks } = createSeedData();

    const fullyDone = projects.filter((p) => {
      const mine = tasks.filter((t) => t.projectId === p.id);
      return mine.length > 0 && mine.every((t) => t.status === "done");
    });

    expect(fullyDone.length).toBeGreaterThan(0);
  });

  it("完了URLつきのタスクがある（実績の成果物リンク）", () => {
    const { tasks } = createSeedData();
    expect(tasks.some((t) => t.status === "done" && t.completionUrl != null)).toBe(true);
  });
});
