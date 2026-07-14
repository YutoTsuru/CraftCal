import { describe, expect, it } from "vitest";
import {
  fromDbProject,
  fromDbTask,
  toDbProjectInsert,
  toDbProjectUpdate,
  toDbTaskInsert,
  toDbTaskUpdate,
  type DbProject,
  type DbTask
} from "@/lib/db-mappers";
import { INBOX_PROJECT_ID } from "@/lib/storage";
import type { Project, Task } from "@/types/dev-calendar";

// テスト用の完全な DB Task 行（全列が埋まった状態）
function makeDbTask(overrides: Partial<DbTask> = {}): DbTask {
  return {
    id: "task-1",
    user_id: "user-1",
    project_id: "project-1",
    title: "設計する",
    description: "アーキテクチャを決める",
    status: "todo",
    priority: "high",
    weight: "medium",
    due_date: "2026-07-20",
    scheduled_date: "2026-07-15",
    estimated_minutes: 90,
    completed_at: null,
    completion_note: null,
    completion_url: null,
    created_at: "2026-07-14T00:00:00.000Z",
    updated_at: "2026-07-14T01:00:00.000Z",
    ...overrides
  };
}

// テスト用の完全なアプリ Task
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    projectId: "project-1",
    title: "設計する",
    memo: "アーキテクチャを決める",
    weight: "medium",
    priority: "high",
    dueDate: "2026-07-20",
    scheduledDate: "2026-07-15",
    estimatedMinutes: 90,
    status: "todo",
    completedAt: null,
    completionNote: null,
    completionUrl: null,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T01:00:00.000Z",
    ...overrides
  };
}

function makeDbProject(overrides: Partial<DbProject> = {}): DbProject {
  return {
    id: "project-1",
    user_id: "user-1",
    name: "CraftCal",
    description: "開発プロジェクト",
    status: "active",
    goal: "毎日使えるツールにする",
    color: "#10b981",
    overview_url: "https://example.com",
    start_date: null,
    end_date: null,
    created_at: "2026-07-14T00:00:00.000Z",
    updated_at: "2026-07-14T01:00:00.000Z",
    ...overrides
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    name: "CraftCal",
    description: "開発プロジェクト",
    overviewUrl: "https://example.com",
    color: "#10b981",
    status: "active",
    goal: "毎日使えるツールにする",
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T01:00:00.000Z",
    ...overrides
  };
}

describe("db-mappers: tasks", () => {
  it("fromDbTask で description が memo に、各列が対応する camelCase に変換される", () => {
    const task = fromDbTask(makeDbTask());
    expect(task.memo).toBe("アーキテクチャを決める");
    expect(task.projectId).toBe("project-1");
    expect(task.dueDate).toBe("2026-07-20");
    expect(task.scheduledDate).toBe("2026-07-15");
    expect(task.estimatedMinutes).toBe(90);
    expect(task.updatedAt).toBe("2026-07-14T01:00:00.000Z");
  });

  it("DB → アプリ → DB の往復でデータが保たれる（insert）", () => {
    const row = makeDbTask();
    const insert = toDbTaskInsert(fromDbTask(row), row.user_id);
    // created_at と全可変列が元の行と一致すること
    expect(insert).toEqual({
      id: row.id,
      user_id: row.user_id,
      created_at: row.created_at,
      project_id: row.project_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      weight: row.weight,
      due_date: row.due_date,
      scheduled_date: row.scheduled_date,
      estimated_minutes: row.estimated_minutes,
      completed_at: row.completed_at,
      completion_note: row.completion_note,
      completion_url: row.completion_url
    });
  });

  it("Inbox: projectId 'inbox' は project_id null に変換される（アプリ → DB）", () => {
    const insert = toDbTaskInsert(makeTask({ projectId: INBOX_PROJECT_ID }), "user-1");
    expect(insert.project_id).toBeNull();
  });

  it("Inbox: project_id null は projectId 'inbox' に変換される（DB → アプリ）", () => {
    const task = fromDbTask(makeDbTask({ project_id: null }));
    expect(task.projectId).toBe(INBOX_PROJECT_ID);
  });

  it("Inbox の往復: 'inbox' → null → 'inbox' が保たれる", () => {
    const insert = toDbTaskInsert(makeTask({ projectId: INBOX_PROJECT_ID }), "user-1");
    const back = fromDbTask({ ...makeDbTask(), project_id: insert.project_id });
    expect(back.projectId).toBe(INBOX_PROJECT_ID);
  });

  it("description が null のとき memo は空文字に正規化される", () => {
    const task = fromDbTask(makeDbTask({ description: null }));
    expect(task.memo).toBe("");
  });

  it("null 境界: due_date / scheduled_date / estimated_minutes / completed_at が null でも変換できる", () => {
    const task = fromDbTask(
      makeDbTask({
        due_date: null,
        scheduled_date: null,
        estimated_minutes: null,
        completed_at: null,
        completion_note: null,
        completion_url: null
      })
    );
    expect(task.dueDate).toBeNull();
    expect(task.scheduledDate).toBeNull();
    expect(task.estimatedMinutes).toBeNull();
    expect(task.completedAt).toBeNull();
  });

  it("undefined 境界: 任意フィールドが undefined でも insert は null を送る", () => {
    // アプリ Task の任意フィールドを undefined にしたケース
    const task = makeTask({
      dueDate: undefined,
      scheduledDate: undefined,
      estimatedMinutes: undefined,
      completedAt: undefined,
      completionNote: undefined,
      completionUrl: undefined
    });
    const insert = toDbTaskInsert(task, "user-1");
    expect(insert.due_date).toBeNull();
    expect(insert.scheduled_date).toBeNull();
    expect(insert.estimated_minutes).toBeNull();
    expect(insert.completed_at).toBeNull();
    expect(insert.completion_note).toBeNull();
    expect(insert.completion_url).toBeNull();
  });

  it("toDbTaskUpdate は id / user_id / created_at を含まない", () => {
    const update = toDbTaskUpdate(makeTask());
    expect(update).not.toHaveProperty("id");
    expect(update).not.toHaveProperty("user_id");
    expect(update).not.toHaveProperty("created_at");
    expect(update.description).toBe("アーキテクチャを決める");
  });
});

describe("db-mappers: projects", () => {
  it("fromDbProject で overview_url が overviewUrl に変換される", () => {
    const project = fromDbProject(makeDbProject());
    expect(project.overviewUrl).toBe("https://example.com");
    expect(project.goal).toBe("毎日使えるツールにする");
    expect(project.color).toBe("#10b981");
  });

  it("DB → アプリ → DB の往復でデータが保たれる（insert）", () => {
    const row = makeDbProject();
    const insert = toDbProjectInsert(fromDbProject(row), row.user_id);
    expect(insert).toEqual({
      id: row.id,
      user_id: row.user_id,
      created_at: row.created_at,
      name: row.name,
      description: row.description,
      status: row.status,
      goal: row.goal,
      color: row.color,
      overview_url: row.overview_url
    });
  });

  it("null 境界: description / goal / color / overview_url が null でも変換できる", () => {
    const project = fromDbProject(
      makeDbProject({ description: null, goal: null, color: null, overview_url: null })
    );
    expect(project.description).toBeNull();
    expect(project.overviewUrl).toBeNull();
  });

  it("undefined 境界: 任意フィールドが undefined でも insert は null を送る", () => {
    const project = makeProject({
      description: undefined,
      overviewUrl: undefined,
      color: undefined,
      goal: undefined
    });
    const insert = toDbProjectInsert(project, "user-1");
    expect(insert.description).toBeNull();
    expect(insert.overview_url).toBeNull();
    expect(insert.color).toBeNull();
    expect(insert.goal).toBeNull();
  });

  it("toDbProjectUpdate は id / user_id / created_at を含まない", () => {
    const update = toDbProjectUpdate(makeProject());
    expect(update).not.toHaveProperty("id");
    expect(update).not.toHaveProperty("user_id");
    expect(update).not.toHaveProperty("created_at");
    expect(update.overview_url).toBe("https://example.com");
  });
});
