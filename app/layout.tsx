import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthGate } from "@/components/AuthGate";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * サイト全体の既定メタデータ (Issue #62)。
 *
 * 各ページは "use client" のため metadata を export できない。
 * ページ固有の指定は、セグメントごとに置いたサーバーコンポーネントの
 * layout.tsx （app/projects/layout.tsx など）から与えている。
 */
export const metadata: Metadata = {
  // 絶対URLの基準。これが無いと openGraph.images や canonical が
  // 相対パスのまま出力され、SNS のクローラが画像を取得できない
  metadataBase: new URL(SITE_URL),

  title: {
    default: SITE_NAME,
    // 子セグメントが title を指定したとき「ログイン | CraftCal」の形にする
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,

  // トップページのcanonical。子セグメントは自分の layout.tsx で上書きする
  alternates: {
    canonical: "/"
  },

  // 既定はインデックス許可（公開してよいのはトップだけなので、
  // 非公開セグメント側で個別に noindex を指定して打ち消す）
  robots: {
    index: true,
    follow: true
  },

  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/"
    // images は app/opengraph-image.tsx が自動で差し込む
  },

  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION
  }
};

/**
 * 構造化データ (JSON-LD)。
 * 「これはWebアプリで、名前と説明はこれ」と明示的に伝える。
 * 検索結果での見え方が変わることを保証するものではないが、
 * サイトの種別を誤認されるリスクを減らせる。
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "ProductivityApplication",
  inLanguage: "ja"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {/* 構造化データ。dangerouslySetInnerHTML は JSON-LD 埋め込みの定石で、
            値は上のリテラルのみ（ユーザー入力を含まない）ため注入の余地がない */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* AuthProvider で認証状態を配布し、AuthGate が公開/保護ルートを振り分ける。
            AppProvider（データ層）と LayoutShell（枠）は保護ルートのみ必要なため AuthGate 内へ移した */}
        <AuthProvider>
          <AuthGate>{children}</AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
