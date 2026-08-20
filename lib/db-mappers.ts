/**
 * lib/db-mappers.ts: Supabase の DB 行（snake_case）とアプリの型（camelCase）を相互変換する純関数群。
 *
 * 変換の要点（Issue #33 第2段階）:
 *   - Task.memo ⇔ tasks.description（アプリの「メモ」は DB では description 列）
 *   - Inbox: アプリの projectId === "inbox" ⇔ DB の project_id: null（双方向）
 *   - 日付列（due_date / scheduled_date）は date 型だが supabase-js は "YYYY-MM-DD" 文字列で返すため文字列のまま扱う
 *   - 日時列（created_at 等）は timestamptz。ISO 文字列のまま扱う
 *   - Project.overviewUrl ⇔ projects.overview_url、Project.iconPath ⇔ projects.icon_path
 *   - goal / color はそのまま
 *
 * 副作用なし・Supabase 非依存なので単体テスト（db-mappers.test.ts）で往復変換を検証する。
 */

import { INBOX_PROJECT_ID } from "@/lib/storage";
import type {
  Project,
  ProjectStatus,
  Task,
  TaskPriority,
  TaskStatus,
  TaskWeight
} from "@/types/dev-calendar";

// ---------------------------------------------------------------------------
// tasks テーブルの行型（supabase/schema.sql の tasks 定義に対応）
// ---------------------------------------------------------------------------
export type DbTask = {
  id: string;
  user_id: string;
  project_id: string | null; // null = Inbox
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  weight: TaskWeight;
  due_date: string | null; // date 型（"YYYY-MM-DD"）
  scheduled_date: string | null; // date 型（"YYYY-MM-DD"）
  estimated_minutes: number | null;
  completed_at: string | null; // timestamptz（ISO 文字列）
  completion_note: string | null;
  completion_url: string | null;
  created_at: string; // timestamptz（ISO 文字列）
  updated_at: string; // timestamptz（ISO 文字列）
};

// insert 時に送る列。id はアプリ側生成の uuid をそのまま入れる（楽観更新の state と一致させるため）
export type DbTaskInsert = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  weight: TaskWeight;
  due_date: string | null;
  scheduled_date: string | null;
  estimated_minutes: number | null;
  completed_at: string | null;
  completion_note: string | null;
  completion_url: string | null;
  created_at: string;
};

// update 時に送る列。id / user_id / created_at は変更しない。updated_at は DB トリガーが自動更新する
export type DbTaskUpdate = Omit<DbTaskInsert, "id" | "user_id" | "created_at">;

// ---------------------------------------------------------------------------
// projects テーブルの行型（supabase/schema.sql の projects 定義に対応）
// start_date / end_date はアプリの Project 型に無いため変換対象外
// ---------------------------------------------------------------------------
export type DbProject = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  goal: string | null;
  color: string | null;
  overview_url: string | null;
  // Issue #82: アイコン画像の保存先パス（Supabase Storage の project-icons バケット）
  icon_path: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type DbProjectInsert = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  goal: string | null;
  color: string | null;
  overview_url: string | null;
  icon_path: string | null;
  created_at: string;
};

export type DbProjectUpdate = Omit<DbProjectInsert, "id" | "user_id" | "created_at">;

// ---------------------------------------------------------------------------
// tasks: DB 行 → アプリ Task
// ---------------------------------------------------------------------------
export function fromDbTask(row: DbTask): Task {
  return {
    id: row.id,
    // project_id が null なら仮想 Inbox（"inbox"）に戻す
    projectId: row.project_id ?? INBOX_PROJECT_ID,
    title: row.title,
    // description（DB）→ memo（アプリ）。null は空文字に正規化する
    memo: row.description ?? "",
    weight: row.weight,
    priority: row.priority,
    dueDate: row.due_date,
    scheduledDate: row.scheduled_date,
    estimatedMinutes: row.estimated_minutes,
    status: row.status,
    completedAt: row.completed_at,
    completionNote: row.completion_note,
    completionUrl: row.completion_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// アプリ Task の可変フィールドを DB 列へ落とし込む共通部分（insert / update で共有）
function toDbTaskColumns(task: Task): DbTaskUpdate {
  return {
    // Inbox はアプリ上 "inbox" だが DB では project_id: null で表す
    project_id: task.projectId === INBOX_PROJECT_ID ? null : task.projectId,
    title: task.title,
    // memo（アプリ）→ description（DB）
    description: task.memo,
    status: task.status,
    priority: task.priority,
    weight: task.weight,
    due_date: task.dueDate ?? null,
    scheduled_date: task.scheduledDate ?? null,
    estimated_minutes: task.estimatedMinutes ?? null,
    completed_at: task.completedAt ?? null,
    completion_note: task.completionNote ?? null,
    completion_url: task.completionUrl ?? null
  };
}

// ---------------------------------------------------------------------------
// tasks: アプリ Task → DB insert 用（user_id はセッションから受け取る）
// ---------------------------------------------------------------------------
export function toDbTaskInsert(task: Task, userId: string): DbTaskInsert {
  return {
    id: task.id,
    user_id: userId,
    created_at: task.createdAt,
    ...toDbTaskColumns(task)
  };
}

// ---------------------------------------------------------------------------
// tasks: アプリ Task → DB update 用
// ---------------------------------------------------------------------------
export function toDbTaskUpdate(task: Task): DbTaskUpdate {
  return toDbTaskColumns(task);
}

// ---------------------------------------------------------------------------
// projects: DB 行 → アプリ Project
// ---------------------------------------------------------------------------
export function fromDbProject(row: DbProject): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    overviewUrl: row.overview_url,
    iconPath: row.icon_path,
    color: row.color,
    status: row.status,
    goal: row.goal,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// アプリ Project の可変フィールドを DB 列へ落とし込む共通部分（insert / update で共有）
function toDbProjectColumns(project: Project): DbProjectUpdate {
  return {
    name: project.name,
    description: project.description ?? null,
    status: project.status,
    goal: project.goal ?? null,
    color: project.color ?? null,
    overview_url: project.overviewUrl ?? null,
    icon_path: project.iconPath ?? null
  };
}

// ---------------------------------------------------------------------------
// projects: アプリ Project → DB insert 用（user_id はセッションから受け取る）
// ---------------------------------------------------------------------------
export function toDbProjectInsert(project: Project, userId: string): DbProjectInsert {
  return {
    id: project.id,
    user_id: userId,
    created_at: project.createdAt,
    ...toDbProjectColumns(project)
  };
}

// ---------------------------------------------------------------------------
// projects: アプリ Project → DB update 用
// ---------------------------------------------------------------------------
export function toDbProjectUpdate(project: Project): DbProjectUpdate {
  return toDbProjectColumns(project);
}
