import type { Metadata } from "next";

/**
 * signup 配下の SEO 設定 (Issue #62)。
 *
 * 登録フォームに検索価値はなく、トップページと内容が重複する。
 *
 * ページ本体は "use client" のため metadata を export できない。
 * このサーバーコンポーネントを挟むことで、配下のページ（動的ルートを含む）へ
 * まとめて noindex を効かせている。
 */
export const metadata: Metadata = {
  title: "新規登録",
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

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
