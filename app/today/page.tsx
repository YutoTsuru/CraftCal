import { redirect } from "next/navigation";

// 旧「今日やること」ページ。機能は統合ホーム (/) に移設したため (Issue #27)、
// ブックマーク互換のためルートだけ残し、アクセス時は / へリダイレクトする
export default function TodayPage() {
  redirect("/");
}
