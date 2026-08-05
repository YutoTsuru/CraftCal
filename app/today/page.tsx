import { redirect } from "next/navigation";

// 旧「今日やること」ページ。機能は統合ホームに移設したため (Issue #27)、
// ブックマーク互換のためルートだけ残してリダイレクトする。
// Issue #64: 統合ホームは / から /home へ移った（/ は公開ランディングになった）。
// ここを / のままにすると、ブックマークから来た利用者がランディングを経由してしまう。
export default function TodayPage() {
  redirect("/home");
}
