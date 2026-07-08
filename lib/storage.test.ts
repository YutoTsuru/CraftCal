import { describe, expect, it } from "vitest";
import { INBOX_PROJECT_ID, ensureInboxProject, migrateScheduleDay, migrateState, migrateTask } from "@/lib/storage";
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
