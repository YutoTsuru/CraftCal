"use client";

/**
 * /login: メール+パスワード、または Google でログインする画面（公開ルート）。
 * AuthGate によりログイン済みなら / へ自動リダイレクトされる。
 * UI トーンは既存に合わせる（白カード / rounded-xl / emerald ボタン / 44px タップ領域 / モバイル対応）。
 */

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { toJapaneseAuthMessage } from "@/lib/auth-errors";

export default function LoginPage() {
  const { signInWithPassword, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // パスワードは 6 文字以上をフロントで検証（Supabase 側の最小要件に合わせる）
    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    setSubmitting(true);
    try {
      const { error: authError } = await signInWithPassword(email, password);
      if (authError) {
        setError(toJapaneseAuthMessage(authError));
      }
      // 成功時は onAuthStateChange → AuthGate が / へ遷移させるため、ここでの遷移は不要
    } catch (e) {
      // 通信断などで supabase-js が throw するケースを拾う
      setError(toJapaneseAuthMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setSubmitting(true);
    try {
      const { error: authError } = await signInWithGoogle();
      // OAuth は成功するとページ遷移するため、戻ってきた場合はエラーのみ扱う
      if (authError) {
        setError(toJapaneseAuthMessage(authError));
      }
    } catch (e) {
      setError(toJapaneseAuthMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">CraftCal</h1>
          <p className="mt-1 text-sm text-slate-500">ログイン</p>
        </div>

        {/* エラーは日本語に変換して表示（lib/auth-errors.ts） */}
        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            メールアドレス
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            パスワード
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400"
              placeholder="6文字以上"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] rounded-xl bg-emerald-500 px-4 py-2 font-medium text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {submitting ? "処理中..." : "ログイン"}
          </button>
        </form>

        {/* 区切り線付きの「または」 */}
        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          または
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Google でログイン
        </button>

        <p className="mt-5 text-center text-sm text-slate-500">
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className="font-medium text-emerald-600 hover:underline">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
