"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useDevCalendar } from "@/components/AppProvider";
import { validateScheduledTimeRange } from "@/lib/scheduled-time";
import type { Task, TaskWeight } from "@/types/dev-calendar";

type Props = {
  task: Task;
  /** 保存後・キャンセル時に編集モードを閉じる */
  onClose: () => void;
};

/**
 * 選択日パネルのインライン編集フォーム (Issue #44。Issue #56 で CalendarView.tsx から抽出)。
 *
 * 入力欄の値は各項目の state に持つ。抽出前は CalendarView が 9 個の useState と
 * 「タスクの現在値を展開する」「全部消す」の2関数を抱えていたが、これらを読むのは
 * このフォームだけだったので、まるごとこちらへ移した。
 * 開くたびにマウントされるので、初期値はマウント時に task から展開すれば足りる
 * （呼び出し側は編集中のタスク id だけを持てばよくなる）。
 *
 * memo / priority / projectId はこの画面では編集できないため、保存時に既存値をそのまま渡す。
 *
 * 対応するUI: /calendar ページで日付を選んだときのパネル内、鉛筆ボタンで開く編集欄。
 */
export default function TaskEditForm({ task, onClose }: Props) {
  const { updateTask } = useDevCalendar();

  const [title, setTitle] = useState(task.title);
  const [start, setStart] = useState<string | null>(task.scheduledDate ?? null);
  const [end, setEnd] = useState<string | null>(task.dueDate ?? null);
  // Issue #51: 既存の開始/終了時刻をフォームへ展開（なければ空のまま）
  const [startTime, setStartTime] = useState<string | null>(task.scheduledStartTime ?? null);
  const [endTime, setEndTime] = useState<string | null>(task.scheduledEndTime ?? null);
  const [weight, setWeight] = useState<TaskWeight>(task.weight);
  // 見積は分→時間に直し、小数1桁で丸めて表示（未設定なら空）
  const [estimateHours, setEstimateHours] = useState<number | "">(
    typeof task.estimatedMinutes === "number" ? Math.round((task.estimatedMinutes / 60) * 10) / 10 : ""
  );
  const [error, setError] = useState<string | null>(null);

  // Issue #38/#44 編集: タイトル・期間・重さ・見積を書き換える。memo/priority/projectId は既存値を引き継ぐ
  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("タスク名を入力してください");
      return;
    }
    // 終了日 < 開始日 はエラー（追加フォームと同じ文言・rose色）
    if (start && end && end < start) {
      setError("終了日は開始日以降の日付にしてください");
      return;
    }
    // Issue #51: 終了時刻 < 開始時刻 もエラー（追加フォームと同じ文言・rose色）
    const timeError = validateScheduledTimeRange(startTime, endTime);
    if (timeError) {
      setError(timeError);
      return;
    }
    updateTask(task.id, {
      title: trimmed,
      memo: task.memo,
      weight,
      priority: task.priority,
      scheduledDate: start || null,
      dueDate: end || null,
      // Issue #51: 任意の開始/終了時刻。未入力なら null（時刻なし＝終日扱い）
      scheduledStartTime: startTime || null,
      scheduledEndTime: endTime || null,
      projectId: task.projectId,
      // 見積: 入力があれば時間→分に、なければ未設定 (null)
      estimatedMinutes: typeof estimateHours === "number" ? Math.round(estimateHours * 60) : null
    });
    onClose();
  }

  return (
    /* Issue #44 編集モード: 追加フォームと同じ構成（タイトル・期間・重さ・見積）でインライン編集する。
       編集展開中はこの行に削除等の他ボタンを出さず、保存/キャンセルのみにして誤操作を防ぐ */
    <div className="mb-2 flex min-w-0 flex-1 flex-col gap-3">
      {/* タイトル（IMEの変換確定Enterでは保存しない） */}
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          // 日本語IMEの変換確定Enterでは保存しない (Issue #24 と同様のガード)
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            onClose();
          }
        }}
        placeholder="タスクのタイトル"
        className="w-full rounded-lg border border-stone-200 bg-surface px-3 py-2 text-sm text-stone-900 outline-none focus:border-lime-500"
      />

      {/* 開始日 / 終了日（初期値はタスクの scheduledDate / dueDate。空も許容） */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-stone-600">開始日</span>
          <input
            type="date"
            value={start ?? ""}
            onChange={(e) => setStart(e.target.value || null)}
            className="w-full rounded-lg border border-stone-200 bg-surface px-3 py-2 text-sm text-stone-900 outline-none focus:border-lime-500"
            aria-label="開始日"
          />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-xs text-stone-600">終了日（任意）</span>
          <input
            type="date"
            value={end ?? ""}
            onChange={(e) => setEnd(e.target.value || null)}
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

      {/* 重さ / 見積時間 */}
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
      </div>

      {/* 終了日 < 開始日 などのエラー（追加フォームと同じ rose 色） */}
      {error && <div className="text-sm text-rose-600">{error}</div>}

      {/* 保存/キャンセルは既存の 44px 基準ボタンのまま */}
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-lime-800 transition hover:border-lime-500/50 hover:bg-lime-100"
          aria-label="編集を保存"
        >
          <Check size={18} />
        </button>
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-stone-600 transition hover:bg-stone-200"
          aria-label="編集をキャンセル"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
