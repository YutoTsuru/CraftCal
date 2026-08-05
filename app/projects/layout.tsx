import type { Metadata } from "next";

/**
 * projects 配下の SEO 設定 (Issue #62)。
 *
 * 認証必須の画面。/projects/<uuid> のようなURLが検索結果に出ると、中身は守られていてもプロジェクトIDの存在自体が漏れる。
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

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
