import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "CraftCal",
  description: "個人開発を短期集中で進めるためのスプリント管理ツール"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {/* AuthProvider で認証状態を配布し、AuthGate が公開/保護ルートを振り分ける。
            AppProvider（データ層）と LayoutShell（枠）は保護ルートのみ必要なため AuthGate 内へ移した */}
        <AuthProvider>
          <AuthGate>{children}</AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
