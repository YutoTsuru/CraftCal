"use client";

/**
 * AuthGate: 認証状態に応じて「何を描画するか」を振り分ける門番コンポーネント。
 * app/layout.tsx の AuthProvider の直下に置き、children（各ページ）を包む。
 *
 * ルートの種類:
 *   - 公開ルート (/login /signup /auth/callback): ログイン不要。LayoutShell（サイドバー等）なしで描画
 *   - 保護ルート (それ以外): 要ログイン。従来どおり AppProvider + LayoutShell で包む
 *
 * リダイレクト規則:
 *   - 未ログインで保護ルート  → /login へ
 *   - ログイン済みで /login /signup → / へ
 *
 * loading 中は全画面ローディングを出し、判定前のちらつき（未ログイン画面が一瞬見える等）を防ぐ。
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppProvider } from "@/components/AppProvider";
import { LayoutShell } from "@/components/LayoutShell";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/components/AuthProvider";

// ログイン不要でアクセスできるルート
const PUBLIC_ROUTES = ["/login", "/signup", "/auth/callback"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    // 判定が済むまではリダイレクトしない（ちらつき・誤遷移を防ぐ）
    if (loading) {
      return;
    }

    if (!user && !isPublicRoute) {
      // 未ログインで保護ルート → ログイン画面へ
      router.replace("/login");
    } else if (user && (pathname === "/login" || pathname === "/signup")) {
      // ログイン済みでログイン/登録画面 → ホームへ
      router.replace("/");
    }
  }, [loading, user, isPublicRoute, pathname, router]);

  // セッション判定中は全画面ローディング（紙とペンのアニメーション）
  if (loading) {
    return <LoadingScreen />;
  }

  // 公開ルートはサイドバー等なしでそのまま描画
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // 未ログインで保護ルートのときは、上の useEffect が /login へ遷移するまでの間ローディングを出す
  if (!user) {
    return <LoadingScreen />;
  }

  // ログイン済みの保護ルート: 従来どおりアプリ本体を描画
  return (
    <AppProvider>
      <LayoutShell>{children}</LayoutShell>
    </AppProvider>
  );
}
