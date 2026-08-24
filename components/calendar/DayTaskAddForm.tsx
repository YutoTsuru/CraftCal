"use client";

import { useState } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import { validateScheduledTimeRange } from "@/lib/scheduled-time";
import type { TaskWeight } from "@/types/dev-calendar";

/**
 * 追加フォームの期間（開始日/終了日）と「なぞって期間指定」モードの束ね (Issue #56)。
 *
 * この2つだけはフォームの内部に閉じられない。カレンダーのセルを緑にハイライトするのが
 * 同じ値を源にしているため、CalendarView 側に置いたまま受け渡す。
 * 残りの入力欄（タイトル・時刻・重さ・見積）はフォーム内の state で完結する。
 */
export type DayRangeBinding = {
  start: string | null;
  end: string | null;
  onChangeStart: (value: string | null) => void;
  onChangeEnd: (value: string | null) => void;
  /** なぞって期間指定モードに入っているか */
  selecting: boolean;
  onToggleSelecting: () => void;
};

type Props = {
  /** 選択中の日付。開始日が未入力のまま追加したときの既定値になる */
  dateKey: string;
  range: DayRangeBinding;
  /** 追加が終わった／キャンセルしたときにフォームを閉じる */
  onDone: () => void;
};

/**
 * 選択日パネルの「この日にタスクを追加」フォーム (Issue #38/#42。Issue #56 で CalendarView.tsx から抽出)。
 *
 * 閉じるときは呼び出し側がこのコンポーネントごと外すので、入力途中の値は
 * アンマウントで一緒に消える（抽出前は resetAddForm で 1 つずつ空に戻していた）。
 *
 * 対応するUI: /calendar ページで日付を選んだときのパネル下部。
 */
export default function DayTaskAddForm({ dateKey, range, onDone }: Props) {
  const { addTask } = useDevCalendar();

  const [title, setTitle] = useState("");
  // Issue #51: 任意の開始/終了時刻（"HH:MM"）。空=時刻なし
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [weight, setWeight] = useState<TaskWeight>("medium");
  const [estimateHours, setEstimateHours] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);

  // Issue #38/#42 追加: 選択日に予定日・期間・重さ・見積を設定してタスクを作る
  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("タスク名を入力してください");
      return;
    }
    const start = range.start ?? dateKey;
    // 終了日 < 開始日 はエラー（送信しない）
    if (start && range.end && range.end < start) {
      setError("終了日は開始日以降の日付にしてください");
      return;
    }
    // Issue #51: 終了時刻 < 開始時刻 もエラー（日付と同じく送信前に弾く）
    const timeError = validateScheduledTimeRange(startTime, endTime);
    if (timeError) {
      setError(timeError);
      return;
    }
    addTask({
      title: trimmed,
      memo: "",
      weight,
      scheduledDate: start,
      dueDate: range.end || null,
      // Issue #51: 任意の開始/終了時刻。未入力なら null（時刻なし＝終日扱い）
      scheduledStartTime: startTime || null,
      scheduledEndTime: endTime || null,
      estimatedMinutes: typeof estimateHours === "number" ? Math.round(estimateHours * 60) : undefined
    });
    onDone();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* タイトル（IMEの変換確定Enterでは送信しない） */}
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          // 日本語IMEの変換確定Enterでは追加しない (Issue #24 と同様のガード)
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            onDone();
          }
        }}
        placeholder="タスクのタイトル"
        className="w-full rounded-lg border border-stone-200 bg-surface px-3 py-2 text-sm text-stone-900 outline-none focus:border-lime-500"
      />

      {/* 開始日 / 終了日（TaskInput.tsx の同項目が手本） */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-stone-600">開始日</span>
          <input
            type="date"
            value={range.start ?? ""}
            onChange={(e) => range.onChangeStart(e.target.value || null)}
            className="w-full rounded-lg border border-stone-200 bg-surface px-3 py-2 text-sm text-stone-900 outline-none focus:border-lime-500"
            aria-label="開始日"
          />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-stone-600">終了日（任意）</span>
          <input
            type="date"
            value={range.end ?? ""}
            onChange={(e) => range.onChangeEnd(e.target.value || null)}
            className="w-full rounded-lg border border-stone-200 bg-surface px-3 py-2 text-sm text-stone-900 outline-none focus:border-lime-500"
            aria-label="終了日"
          />
        </label>
      </div>

      {/* Issue #51: 開始/終了時刻（任意）。空のままなら時刻なし＝終日扱いで保存される */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-stone-600">開始時刻（任意）</span>
          <input
            type="time"
            value={startTime ?? ""}
            onChange={(e) => setStartTime(e.target.value || null)}
            className="w-full rounded-lg border border-stone-200 bg-surface px-3 py-2 text-sm text-stone-900 outline-none focus:border-lime-500"
            aria-label="開始時刻"
          />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-stone-600">終了時刻（任意）</span>
          <input
            type="time"
            value={endTime ?? ""}
            onChange={(e) => setEndTime(e.target.value || null)}
            className="w-full rounded-lg border border-stone-200 bg-surface px-3 py-2 text-sm text-stone-900 outline-none focus:border-lime-500"
            aria-label="終了時刻"
          />
        </label>
      </div>

      {/* 重さ / 見積時間 / なぞって期間指定トグル */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-stone-600">重さ</span>
          <select
            value={weight}
            onChange={(e) => setWeight(e.target.value as TaskWeight)}
            className="rounded-lg border border-stone-200 bg-surface px-3 py-2 text-sm text-stone-900 outline-none focus:border-lime-500"
            aria-label="重さ"
          >
            <option value="light">軽め</option>
            <option value="medium">普通</option>
            <option value="heavy">重め</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-stone-600">見積時間 (h)</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={estimateHours === "" ? "" : String(estimateHours)}
            onChange={(e) => setEstimateHours(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="h"
            className="w-24 rounded-lg border border-stone-200 bg-surface px-3 py-2 text-sm text-stone-900 outline-none focus:border-lime-500"
            aria-label="見積時間"
          />
        </label>
        {/* Issue #42 なぞって期間指定モードへ入る/抜けるトグル */}
        <button
          type="button"
          onClick={range.onToggleSelecting}
          className={`h-11 rounded-lg border px-3 py-2 text-sm transition ${
            range.selecting
              ? "border-lime-600 bg-lime-50 font-semibold text-lime-800"
              : "border-stone-200 bg-surface text-stone-600 hover:border-lime-500 hover:text-lime-800"
          }`}
        >
          {range.selecting ? "なぞり選択を終了" : "カレンダーで期間を選ぶ"}
        </button>
      </div>

      {/* 終了日 < 開始日 などのエラー（rose 色） */}
      {error && <div className="text-sm text-rose-600">{error}</div>}

      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          className="rounded-lg bg-lime-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-lime-600"
        >
          追加
        </button>
        <button
          onClick={onDone}
          className="rounded-lg border border-stone-200 bg-surface px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
