/**
 * lib/auth-errors.ts: Supabase 認証エラーを日本語メッセージへ変換する純関数。
 * /login /signup の両画面で共通利用する（メッセージ文言を一箇所にまとめる）。
 *
 * supabase-js は通常 `{ error }` を返すが、通信断（DNS/接続失敗）のときは
 * TypeError: Failed to fetch を throw する場合がある。そのため戻り値エラーと
 * catch した例外の両方を受け取れるよう引数は unknown にしている。
 */

// 認証エラー（返り値・例外どちらも）を利用者向けの日本語文へマッピングする
export function toJapaneseAuthMessage(error: unknown): string {
  if (!error) {
    return "";
  }

  // AuthError / Error / それ以外から message 文字列を取り出す
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません";
  }
  if (message.includes("already registered") || message.includes("user already registered")) {
    return "このメールアドレスはすでに登録されています";
  }
  if (message.includes("invalid email") || message.includes("unable to validate email")) {
    return "メールアドレスの形式を確認してください";
  }
  // ネットワーク不通など fetch 自体が失敗したケース
  if (message.includes("fetch") || message.includes("network")) {
    return "通信状態を確認して再度お試しください";
  }

  return "ログイン処理に失敗しました";
}
