/**
 * app/loading.tsx: Next.js 標準のルートローディングフォールバック。
 * ルートチャンクの読み込み中（ページ遷移でコードを取りに行っている間など）に自動表示される。
 * 紙とペンのローディングを共通表示として使う。
 */
import { LoadingScreen } from "@/components/LoadingScreen";

export default function Loading() {
  return <LoadingScreen />;
}
