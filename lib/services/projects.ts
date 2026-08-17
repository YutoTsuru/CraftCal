/**
 * lib/services/projects.ts: projects テーブルへの CRUD。
 *
 * 方針（Issue #33 第2段階）:
 *   - lib/supabase.ts の共有クライアントを使う
 *   - user_id はセッション（getSession）から取得し、引数や画面からは受け取らない
 *   - RLS により SELECT/UPDATE/DELETE は自分の行のみが対象になる
 *   - エラーは supabase の error をそのまま throw し、呼び出し側（AppProvider）で処理する
 *   - トークンやセッション情報は console に出さない
 */

import { supabase } from "@/lib/supabase";
import {
  fromDbProject,
  toDbProjectInsert,
  toDbProjectUpdate,
  type DbProject
} from "@/lib/db-mappers";
import type { Project } from "@/types/dev-calendar";

// セッションからログイン中ユーザーの id を取り出す。未ログインなら日本語メッセージで throw
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  const userId = data.session?.user.id;
  if (!userId) {
    throw new Error("ログインが必要です。再度ログインしてください。");
  }
  return userId;
}

// 自分のプロジェクト一覧を作成日時の新しい順で取得する
export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data as DbProject[]).map(fromDbProject);
}

// プロジェクトを1件登録する（id はアプリ側生成の uuid をそのまま使う）
export async function insertProject(project: Project): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("projects").insert(toDbProjectInsert(project, userId));
  if (error) {
    throw error;
  }
}

/**
 * プロジェクトを一括登録する (Issue #53)。
 *
 * seed / import はもともと for ループで insertProject を1件ずつ await していたため、
 * 途中で失敗すると「一部のプロジェクトだけ DB に入った」中途半端な状態が残っていた。
 *
 * 配列を1回の insert で送ると Postgres 側では単一のステートメントとして扱われ、
 * 全行入るか1行も入らないかのどちらかになる。tasks 側の insertTasks と同じ形。
 */
export async function insertProjects(projects: Project[]): Promise<void> {
  if (projects.length === 0) {
    return;
  }
  const userId = await requireUserId();
  const rows = projects.map((project) => toDbProjectInsert(project, userId));
  const { error } = await supabase.from("projects").insert(rows);
  if (error) {
    throw error;
  }
}

// プロジェクトを1件更新する
export async function updateProject(project: Project): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update(toDbProjectUpdate(project))
    .eq("id", project.id);
  if (error) {
    throw error;
  }
}

// プロジェクトを1件削除する（tasks.project_id は FK の ON DELETE SET NULL で自動的に Inbox 化される）
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

// ログイン中ユーザーの全プロジェクトを削除する（resetAll 用。RLS で自分の行だけが対象）
export async function deleteAllProjects(): Promise<void> {
  // id は主キーで必ず非 null なので、この条件は「自分の全行」に一致する（uuid 型に安全な絞り込み）
  const { error } = await supabase.from("projects").delete().not("id", "is", null);
  if (error) {
    throw error;
  }
}
