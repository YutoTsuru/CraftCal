"use client";

/**
 * /settings: 設定ページ (Issue #112)。
 * サイドバー下部（モバイルはヘッダー右）の「設定」リンクから来る。
 * 以前 Home に置かれていた「データの管理」(DangerZone) をここに移す。
 * 日常的に使わない危険な操作をホームから遠ざけるため。
 * 「作業時間の目安」(1日の容量) もここで設定する。Home の「今日」リストの絞り込みに使われる。
 */

import { useEffect, useState } from "react";
import DangerZone from "@/components/DangerZone";
import { PageHeader } from "@/components/ui/PageHeader";
import { DEFAULT_DAILY_CAPACITY_HOURS, getDailyCapacityHours, setDailyCapacityHours } from "@/lib/daily-capacity";

export default function SettingsPage() {
  // 入力欄の表示値（文字列）。空欄など入力途中の状態を許すため number ではなく string で持つ。
  // localStorage は SSR 中に読めないため、マウント後に useEffect で初期値を読む
  const [capacityInput, setCapacityInput] = useState(String(DEFAULT_DAILY_CAPACITY_HOURS));
  useEffect(() => {
    setCapacityInput(String(getDailyCapacityHours()));
  }, []);

  return (
    <div className="grid gap-6">
      <PageHeader title="設定" />

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
