"use client";

/**
 * /auth/callback: Google などの OAuth ログイン後に戻ってくる中継ページ（公開ルート）。
 * supabase-js の detectSessionInUrl が URL 内のトークンからセッションを確立するのを待ち、
 * 確立できたら / へ、数秒待っても確立しなければ /login へ遷移する。
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    // セッションが張れたらホームへ
    if (!loading && session) {
      router.replace("/");
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">CraftCal</h1>
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500"
        aria-label="読み込み中"
      />
      <p className="text-sm text-slate-500">ログイン処理中...</p>
    </div>
  );
}
