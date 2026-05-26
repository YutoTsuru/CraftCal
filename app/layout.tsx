import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { LayoutShell } from "@/components/LayoutShell";

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
        <AppProvider>
          <LayoutShell>{children}</LayoutShell>
        </AppProvider>
      </body>
    </html>
  );
}
