"use client";

/**
 * /auth/callback: Google などの OAuth ログイン後に戻ってくる中継ページ（公開ルート）。
 * supabase-js の detectSessionInUrl が URL 内のトークンからセッションを確立するのを待ち、
 * 確立できたら / へ、数秒待っても確立しなければ /login へ遷移する。
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/components/AuthProvider";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    // セッションが張れたらアプリ本体へ（Issue #64: / は公開ランディングになったので /home）
    if (!loading && session) {
      router.replace("/home");
      return;
    }

    // 数秒待ってもセッションが確立しなければログイン画面へ戻す（失敗時のフォールバック）
    const timer = setTimeout(() => {
      if (!session) {
        router.replace("/login");
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [session, loading, router]);

  // 紙とペンのアニメーションでログイン処理中を表示する
  return <LoadingScreen message="ログイン処理中" />;
}
