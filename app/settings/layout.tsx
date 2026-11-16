import type { Metadata } from "next";

/**
 * settings 配下の SEO 設定 (Issue #112)。
 *
 * 認証必須の画面なので検索結果に出す意味がない。
 * ページ本体は "use client" のため metadata を export できず、
 * このサーバーコンポーネントを挟んで noindex を効かせている（tasks/layout.tsx と同じ構成）。
 */
export const metadata: Metadata = {
  title: "設定",
  // noindex のページに canonical / OG を継承させると信号が衝突するため外す
  alternates: null,
  openGraph: null,
  robots: {
    index: false,
    follow: false
  }
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
