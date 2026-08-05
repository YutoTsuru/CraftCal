import { LandingPage } from "@/components/LandingPage";

/**
 * トップページ (Issue #64)。
 *
 * 唯一の公開・インデックス対象ページ。認証に依存しないサーバーコンポーネントなので、
 * クローラは初回レスポンスの HTML でそのまま本文を読める。
 *
 * ダッシュボードは /home (app/home/page.tsx) に移した。
 * ログイン済みで ここを開いた場合は AuthGate が /home へ送る。
 */
export default function RootPage() {
  return <LandingPage />;
}
