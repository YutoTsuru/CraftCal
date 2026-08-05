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
  // noindex のページに「正規版は別URLだ」と伝えると信号が衝突し、
  // canonical が優先されて noindex が無視されうる（Google が非推奨とする組み合わせ）。
  // 親レイアウトから継承する canonical と OG を明示的に外す。
  alternates: null,
  openGraph: null,
  robots: {
    index: false,
    follow: false
  }
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
