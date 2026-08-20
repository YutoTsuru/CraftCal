/**
 * lib/project-icon-rules.ts: プロジェクトのアイコン画像の受け入れ条件 (Issue #82)。
 *
 * アップロード処理そのもの（lib/services/project-icons.ts）は Supabase 通信を含み
 * テストできないため、判定できる部分だけをここに純関数として切り出している。
 */

/** 受け入れる MIME タイプ。SVG は script を埋め込めるため入れない */
export const ALLOWED_ICON_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

/** 上限サイズ。アイコンは小さく表示するので 2MB あれば十分 */
export const MAX_ICON_BYTES = 2 * 1024 * 1024;

/** MIME タイプ → 保存時の拡張子 */
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif"
};

export type IconValidationResult =
  | { ok: true; extension: string }
  /** 画面にそのまま出せる日本語の理由 */
  | { ok: false; reason: string };

/** バイト数を「1.5MB」のような読める文字列にする */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}

/**
 * 選ばれたファイルが受け入れ条件を満たすか判定する。
 * 弾く場合は、そのまま画面に出せる理由を返す（利用者が次に何をすればよいか分かる文言にする）。
 */
export function validateIconFile(
  file: { type: string; size: number },
  {
    allowedTypes = ALLOWED_ICON_TYPES as readonly string[],
    maxBytes = MAX_ICON_BYTES
  }: { allowedTypes?: readonly string[]; maxBytes?: number } = {}
): IconValidationResult {
  if (!allowedTypes.includes(file.type)) {
    const names = allowedTypes.map((t) => t.replace("image/", "").toUpperCase()).join(" / ");
    return { ok: false, reason: `${names} の画像を選んでください。` };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      reason: `画像が大きすぎます（${formatBytes(file.size)}）。${formatBytes(maxBytes)} 以下にしてください。`
    };
  }

  if (file.size === 0) {
    return { ok: false, reason: "中身が空のファイルです。別の画像を選んでください。" };
  }

  return { ok: true, extension: EXTENSION_BY_TYPE[file.type] };
}

/**
 * 保存先のパスを組み立てる。
 *
 * 先頭を user_id にするのは、Storage のポリシーが
 * 「先頭フォルダ = ログイン中のユーザーID」で書き込みを制限しているため
 * （supabase/schema.sql の project_icons_insert を参照）。
 *
 * 末尾に更新時刻を入れて毎回違うパスにする。同じパスを上書きすると
 * CDN やブラウザのキャッシュが残り、差し替えても古い画像が出続けるため。
 */
export function buildIconPath(
  userId: string,
  projectId: string,
  extension: string,
  now: number = Date.now()
): string {
  return `${userId}/${projectId}-${now}.${extension}`;
}
