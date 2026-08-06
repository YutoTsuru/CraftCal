"use client";

/**
 * /signup: メール+パスワードで新規登録、または Google で登録する画面（公開ルート）。
 * AuthGate によりログイン済みなら / へ自動リダイレクトされる。
 * UI トーンは /login と揃える（カード面 / rounded-xl / オリーブのボタン / 44px タップ領域）。
 */

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { toJapaneseAuthMessage } from "@/lib/auth-errors";

export default function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    // パスワードは 6 文字以上をフロントで検証
    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    setSubmitting(true);
    try {
      const { error: authError } = await signUp(email, password);
      if (authError) {
        setError(toJapaneseAuthMessage(authError));
        return;
      }
      // メール確認が有効な場合は即ログインにならないため、確認を促す案内を出す。
      // 確認が無効ならセッションが張られ AuthGate が / へ遷移させる
      setNotice("確認メールを送信しました。メール内のリンクから登録を完了してください（設定によっては不要です）。");
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
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-surface p-6 shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">CraftCal</h1>
          <p className="mt-1 text-sm text-stone-500">新規登録</p>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="mb-4 rounded-xl border border-lime-200 bg-lime-50 px-3 py-2 text-sm text-lime-800">
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            メールアドレス
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-[44px] rounded-xl border border-stone-200 px-3 py-2 outline-none focus:border-lime-500"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-stone-700">
            パスワード
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[44px] rounded-xl border border-stone-200 px-3 py-2 outline-none focus:border-lime-500"
              placeholder="6文字以上"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] rounded-xl bg-lime-600 px-4 py-2 font-medium text-white transition hover:bg-lime-700 disabled:opacity-60"
          >
            {submitting ? "処理中..." : "登録する"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-stone-400">
          <span className="h-px flex-1 bg-stone-200" />
          または
          <span className="h-px flex-1 bg-stone-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="min-h-[44px] w-full rounded-xl border border-stone-200 bg-surface px-4 py-2 font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-60"
        >
          Google で登録
        </button>

        <p className="mt-5 text-center text-sm text-stone-500">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="font-medium text-lime-700 hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
