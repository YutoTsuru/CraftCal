import type { Metadata } from "next";

/**
 * auth 配下の SEO 設定 (Issue #62)。
 *
 * OAuth の中継。URLにトークンが乗りうるため、robots.ts でクロール自体も禁止している（noindex は二重の保険）。
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

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
