"use client";

/**
 * AuthGate: 認証状態に応じて「何を描画するか」を振り分ける門番コンポーネント。
 * app/layout.tsx の AuthProvider の直下に置き、children（各ページ）を包む。
 *
 * ルートの種類:
 *   - ランディング (/): Issue #64。公開ページ。認証状態を待たずに素通しする
 *   - 公開ルート (/login /signup /auth/callback): ログイン不要。LayoutShell（サイドバー等）なしで描画
 *   - 保護ルート (それ以外): 要ログイン。従来どおり AppProvider + LayoutShell で包む
 *
 * リダイレクト規則:
 *   - 未ログインで保護ルート  → /login へ
 *   - ログイン済みで /login /signup → /home へ
 *   - ログイン済みで /          → /home へ（ランディングは未ログイン向けのため）
 *
 * loading 中は起動画面 (SplashScreen) を出し、判定前のちらつき（未ログイン画面が一瞬見える等）を防ぐ。
 * ただし / だけは例外で、loading を待たずに即描画する。ここで待ってしまうと
 * SSR のHTMLが起動画面になり、クローラがランディングの本文を読めなくなる (Issue #64)。
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppProvider } from "@/components/AppProvider";
import { LayoutShell } from "@/components/LayoutShell";
import { SplashScreen } from "@/components/SplashScreen";
import { useAuth } from "@/components/AuthProvider";

// ログイン不要でアクセスできるルート
const PUBLIC_ROUTES = ["/login", "/signup", "/auth/callback"];

// 公開ランディング (Issue #64)。ログイン後のダッシュボードは /home に移した
const LANDING_ROUTE = "/";
const APP_HOME_ROUTE = "/home";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isLandingRoute = pathname === LANDING_ROUTE;

  useEffect(() => {
    // 判定が済むまではリダイレクトしない（ちらつき・誤遷移を防ぐ）
    if (loading) {
      return;
    }

    if (isLandingRoute) {
      // ランディングは未ログイン向け。ログイン済みならアプリ本体へ送る
      if (user) {
        router.replace(APP_HOME_ROUTE);
      }
      return;
    }

    if (!user && !isPublicRoute) {
      // 未ログインで保護ルート → ログイン画面へ
      router.replace("/login");
    } else if (user && (pathname === "/login" || pathname === "/signup")) {
      // ログイン済みでログイン/登録画面 → アプリ本体へ
      router.replace(APP_HOME_ROUTE);
    }
  }, [loading, user, isPublicRoute, isLandingRoute, pathname, router]);

  // ランディングは認証状態を待たずに即描画する (Issue #64)。
  // ここで loading を待つと SSR のHTMLが起動画面になり、
  // クローラがランディングの本文を読めなくなる（この対応の目的そのものが失われる）
  if (isLandingRoute) {
    return <>{children}</>;
  }

  // セッション判定中は起動画面（アプリ名 + タグライン + 紙とペンのアニメーション / Issue #59）
  if (loading) {
    return <SplashScreen />;
  }

  // 公開ルートはサイドバー等なしでそのまま描画
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // 未ログインで保護ルートのときは、上の useEffect が /login へ遷移するまでの間 起動画面を出す
  if (!user) {
    return <SplashScreen />;
  }

  // ログイン済みの保護ルート: 従来どおりアプリ本体を描画
  return (
    <AppProvider>
      <LayoutShell>{children}</LayoutShell>
    </AppProvider>
  );
}
