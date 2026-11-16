"use client";

/**
 * /settings: 設定ページ (Issue #112)。
 * サイドバー下部（モバイルはヘッダー右）の「設定」リンクから来る。
 * 以前 Home に置かれていた「データの管理」(DangerZone) をここに移す。
 * 日常的に使わない危険な操作をホームから遠ざけるため。
 * ログイン中のメール表示とログアウトもここ（「アカウント」セクション）に置く。
 * 「作業時間の目安」(1日の容量) もここで設定する。Home の「今日」リストの絞り込みに使われる。
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import DangerZone from "@/components/DangerZone";
import { PageHeader } from "@/components/ui/PageHeader";
import { DEFAULT_DAILY_CAPACITY_HOURS, getDailyCapacityHours, setDailyCapacityHours } from "@/lib/daily-capacity";

export default function SettingsPage() {
  const router = useRouter();
  // ログイン中のユーザー情報とログアウト操作（「アカウント」セクションで使う）
  const { user, signOut } = useAuth();

  // ログアウト → ログイン画面へ戻す（LayoutShell から移設した処理）
  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  // 入力欄の表示値（文字列）。空欄など入力途中の状態を許すため number ではなく string で持つ。
  // localStorage は SSR 中に読めないため、マウント後に useEffect で初期値を読む
  const [capacityInput, setCapacityInput] = useState(String(DEFAULT_DAILY_CAPACITY_HOURS));
  useEffect(() => {
    setCapacityInput(String(getDailyCapacityHours()));
  }, []);

  return (
    <div className="grid gap-6">
      {/* 戻るボタンつきの見出し。router.back() なので直リンクで来た場合はアプリ外へ戻る可能性があるが許容 */}
      <PageHeader title="設定" onBack={() => router.back()} />

      {/* アカウント: ログイン中のメールとログアウト。
          ログアウトは以前ヘッダー/サイドバーにあったが、モバイルで設定アイコンの隣にあり
          誤タップしやすかったためここへ移した（破壊的操作ではないので控えめなボタン） */}
      <section className="rounded-xl border border-stone-200 bg-surface p-4">
        <h3 className="text-base font-semibold">アカウント</h3>
        <div className="mt-3 flex items-center justify-between gap-3">
          {/* メールアドレス（長い場合は truncate で省略、全文は title で確認） */}
          <p className="min-w-0 truncate text-sm text-stone-600" title={user?.email ?? ""}>
            {user?.email}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-stone-200 bg-surface px-3 text-sm text-stone-700 transition hover:bg-stone-100"
          >
            <LogOut size={18} />
            <span>ログアウト</span>
          </button>
        </div>
      </section>

      {/* 作業時間の目安: 入力するたびに即保存（保存ボタンなし） */}
      <section className="rounded-xl border border-stone-200 bg-surface p-4">
        <h3 className="text-base font-semibold">作業時間の目安</h3>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            step={0.5}
            min={0.5}
            max={12}
            value={capacityInput}
            onChange={(e) => {
              setCapacityInput(e.target.value);
              // 空欄・不正値は保存しない（入力途中の状態で既定値に上書きしないため）
              if (e.target.value !== "" && Number.isFinite(Number(e.target.value))) {
                setDailyCapacityHours(Number(e.target.value));
              }
            }}
            aria-label="1日の作業時間（時間）"
            className="h-9 w-24 rounded-lg border border-stone-300 bg-surface px-2 text-sm"
          />
          <span className="text-sm text-stone-700">時間/日</span>
        </div>
        <p className="mt-3 text-sm text-stone-600">
          ホームの『今日』はこの時間に収まる範囲で表示されます。見積未入力のタスクは重さ（軽め30分/普通1時間/重め2時間）で概算します。この設定はこの端末にだけ保存されます
        </p>
      </section>

      {/* データ全削除の区画（2段階確認つき） */}
      <DangerZone />
    </div>
  );
}
