/**
 * lib/services/tasks.ts: tasks テーブルへの CRUD。
 *
 * 方針（Issue #33 第2段階）:
 *   - lib/supabase.ts の共有クライアントを使う
 *   - user_id はセッション（getSession）から取得し、引数や画面からは受け取らない
 *   - RLS により SELECT/UPDATE/DELETE は自分の行のみが対象になる
 *   - エラーは supabase の error をそのまま throw し、呼び出し側（AppProvider）で処理する
 *   - トークンやセッション情報は console に出さない
 */

import { supabase } from "@/lib/supabase";
import { fromDbTask, toDbTaskInsert, toDbTaskUpdate, type DbTask } from "@/lib/db-mappers";
import type { Task } from "@/types/dev-calendar";

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

// 自分のタスク一覧を作成日時の新しい順で取得する
export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data as DbTask[]).map(fromDbTask);
}

// タスクを1件登録する（id はアプリ側生成の uuid をそのまま使う）
export async function insertTask(task: Task): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("tasks").insert(toDbTaskInsert(task, userId));
  if (error) {
    throw error;
  }
}

// タスクを1件更新する
export async function updateTask(task: Task): Promise<void> {
  const { error } = await supabase.from("tasks").update(toDbTaskUpdate(task)).eq("id", task.id);
  if (error) {
    throw error;
  }
}

// タスクを1件削除する
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

// ログイン中ユーザーの全タスクを削除する（resetAll 用。RLS で自分の行だけが対象）
export async function deleteAllTasks(): Promise<void> {
  // id は主キーで必ず非 null なので、この条件は「自分の全行」に一致する（uuid 型に安全な絞り込み）
  const { error } = await supabase.from("tasks").delete().not("id", "is", null);
  if (error) {
    throw error;
  }
}
