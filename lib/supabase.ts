/**
 * lib/supabase.ts: Supabase クライアントのシングルトン。
 * 認証 (AuthProvider) や将来のデータ層 (services) がここから同じ1インスタンスを共有する。
 * 何度 import しても createClient を呼び直さないよう、モジュールスコープで1つだけ生成する。
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ブラウザから使う公開キー。Secret / Service Role キーは絶対にここへ置かない。
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// env 未設定のまま起動すると原因の分かりにくいエラーになるため、ここで日本語で明示的に止める。
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Supabase の環境変数が設定されていません。プロジェクト直下に .env.local を作成し、" +
      "NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY を設定してください" +
      "（値は Supabase ダッシュボードの Project Settings > API から取得できます）。"
  );
}

// アプリ全体で共有する唯一の Supabase クライアント。
export const supabase: SupabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // OAuth のリダイレクト後、URL に含まれるセッション情報を自動で取り込む（/auth/callback で利用）
    detectSessionInUrl: true,
    // ページ再読み込み後もログイン状態を保持する
    persistSession: true,
    autoRefreshToken: true
  }
});
