"use client";

/**
 * AuthProvider: アプリ全体の認証状態を保持し、useAuth() で配布する。
 * app/layout.tsx の最上位に置き、配下のどこからでもログイン状態・認証操作を使えるようにする。
 *
 * - 初回マウントで getSession によって現在のセッションを取得
 * - onAuthStateChange でログイン/ログアウトを監視し state を更新
 * - loading は「セッション判定が済むまで」true。AuthGate 側で全画面ローディングに使う
 */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// 認証操作の戻り値。エラーがあれば error に入る（画面側で日本語変換して表示する）
type AuthResult = { error: AuthError | null };

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初回: 既存セッションを取得して state に反映（判定完了で loading を下ろす）
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // ログイン/ログアウト/トークン更新を監視して state を追従させる
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    // メール+パスワードでログイン
    const signInWithPassword = async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    };

    // メール+パスワードで新規登録。
    // emailRedirectTo を明示することで、確認メールのリンクが「登録操作をした環境」
    // （ローカルなら localhost、本番なら craftcal.me）に戻ってくる。
    // 指定しないと Supabase の Site URL 設定に飛ばされ、環境違いの事故になる
    const signUp = async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` }
      });
      return { error };
    };

    // Google の OAuth ログイン。完了後は /auth/callback に戻ってくる
    const signInWithGoogle = async (): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${location.origin}/auth/callback` }
      });
      return { error };
    };

    const signOut = async () => {
      await supabase.auth.signOut();
    };

    return { user, session, loading, signInWithPassword, signUp, signInWithGoogle, signOut };
  }, [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
