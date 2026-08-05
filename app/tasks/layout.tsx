import type { Metadata } from "next";

/**
 * tasks 配下の SEO 設定 (Issue #62)。
 *
 * 認証必須の画面なので検索結果に出す意味がない。
 *
 * ページ本体は "use client" のため metadata を export できない。
 * このサーバーコンポーネントを挟むことで、配下のページ（動的ルートを含む）へ
 * まとめて noindex を効かせている。
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
