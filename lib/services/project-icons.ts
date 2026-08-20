/**
 * lib/services/project-icons.ts: プロジェクトのアイコン画像を Supabase Storage で扱う (Issue #82)。
 *
 * 方針（lib/services/projects.ts と揃える）:
 *   - lib/supabase.ts の共有クライアントを使う
 *   - user_id はセッションから取得し、引数や画面からは受け取らない
 *   - Storage 側のポリシーで「先頭フォルダ = 自分のユーザーID」のみ書き込み可
 *     （supabase/schema.sql の project_icons_* を参照）
 *   - エラーはそのまま throw し、呼び出し側で処理する
 *
 * 判定できるロジック（形式・サイズ・パスの組み立て）は
 * lib/project-icon-rules.ts に純関数として分けてテストしている。
 */

import { supabase } from "@/lib/supabase";
import { buildIconPath, validateIconFile } from "@/lib/project-icon-rules";

/** アイコンを置くバケット名。schema.sql で作成している */
export const PROJECT_ICON_BUCKET = "project-icons";

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

/**
 * 保存済みパスから表示用のURLを組み立てる。
 * バケットが public なので署名は不要で、同期的に URL を作れる。
 */
export function getProjectIconUrl(iconPath: string | null | undefined): string | null {
  if (!iconPath) return null;
  const { data } = supabase.storage.from(PROJECT_ICON_BUCKET).getPublicUrl(iconPath);
  return data.publicUrl ?? null;
}

/**
 * アイコン画像をアップロードし、保存先パスを返す。
 *
 * 受け入れ条件を満たさないファイルは、画面に出せる日本語メッセージで throw する。
 * パスには時刻を含めるため毎回別ファイルになる（キャッシュに古い画像が残らない）。
 */
export async function uploadProjectIcon(projectId: string, file: File): Promise<string> {
  const validation = validateIconFile(file);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const userId = await requireUserId();
  const path = buildIconPath(userId, projectId, validation.extension);

  const { error } = await supabase.storage
    .from(PROJECT_ICON_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    throw error;
  }
  return path;
}

/**
 * アイコンのファイルを削除する。
 *
 * 差し替え時に古いファイルを消して残骸を溜めないために使う。
 * 削除に失敗しても画面の操作は続行できるべきなので、呼び出し側で握りつぶす想定。
 */
export async function removeProjectIcon(iconPath: string | null | undefined): Promise<void> {
  if (!iconPath) return;
  const { error } = await supabase.storage.from(PROJECT_ICON_BUCKET).remove([iconPath]);
  if (error) {
    throw error;
  }
}
