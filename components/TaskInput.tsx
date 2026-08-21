"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useDevCalendar } from "@/components/AppProvider";
import type { TaskWeight, TaskPriority, Task, TaskFormInput } from "@/types/dev-calendar";
import { validateScheduledTimeRange } from "@/lib/scheduled-time";

type Props = {
  editingTask?: Task | null;
  onCancel?: () => void;
};

export function TaskInput({ editingTask = null, onCancel }: Props) {
  const { addTask, updateTask } = useDevCalendar();
  const { projects } = useDevCalendar();
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [weight, setWeight] = useState<TaskWeight>("medium");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  // Use clearer local names: startDate(開始日) and endDate(終了日)
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  // Issue #51: 任意の開始/終了時刻（"HH:MM"）。空="時刻なし
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [estimateHours, setEstimateHours] = useState<number | "">("");
  const [projectId, setProjectId] = useState<string | null>(projects?.[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title ?? "");
      setMemo(editingTask.memo ?? "");
      setWeight(editingTask.weight ?? "medium");
      setPriority(editingTask.priority ?? "medium");
      // Map task fields to start/end semantics
      setEndDate(editingTask.dueDate ?? null);
      setStartDate(editingTask.scheduledDate ?? null);
      // Issue #51: 既存の開始/終了時刻をフォームへ展開（なければ空のまま）
      setStartTime(editingTask.scheduledStartTime ?? null);
      setEndTime(editingTask.scheduledEndTime ?? null);
      // 0.5h 刻みの入力に合わせ、小数第1位まで保持する (90分 → 1.5h)
      setEstimateHours(typeof editingTask.estimatedMinutes === "number" ? Math.round((editingTask.estimatedMinutes / 60) * 10) / 10 : "");
      setProjectId(editingTask.projectId ?? projects?.[0]?.id ?? null);
    }
  }, [editingTask, projects]);

  const validate = (input: TaskFormInput) => {
    if (!input.title || !input.title.trim()) {
      setError("タスク名を入力してください");
      return false;
    }

    // Validate start <= end
    if (input.scheduledDate && input.dueDate && input.scheduledDate > input.dueDate) {
      setError("終了日は開始日以降の日付にしてください");
      return false;
    }

    // Issue #51: 時刻も同じく終了 < 開始をエラーにする（カレンダー側の 2 フォームと同じ文言）
    const timeError = validateScheduledTimeRange(input.scheduledStartTime, input.scheduledEndTime);
    if (timeError) {
      setError(timeError);
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const input: TaskFormInput = {
      title: title.trim(),
      memo: memo.trim(),
      weight,
      priority,
      // Map local start/end back to form fields
      dueDate: endDate,
      scheduledDate: startDate,
      // Issue #51: 任意の開始/終了時刻。未入力なら null（時刻なし＝終日扱い）
      scheduledStartTime: startTime,
      scheduledEndTime: endTime,
      projectId,
      estimatedMinutes: typeof estimateHours === "number" ? Math.round(estimateHours * 60) : undefined
    };

    if (!validate(input)) return;

    setSaving(true);

    try {
      if (editingTask) {
        updateTask(editingTask.id, input);
        onCancel?.();
      } else {
        addTask(input);
        setTitle("");
        setMemo("");
        setWeight("medium");
        setStartDate(null);
        setEndDate(null);
        setStartTime(null);
        setEndTime(null);
      }
    } catch (e: any) {
      setError(e?.message ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        // 日本語IMEの変換確定Enterでフォームが送信されるのを防ぐ (Issue #24)。
        // 変換中のEnterは isComposing が true (一部ブラウザは keyCode 229)
        if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) {
          event.preventDefault();
        }
      }}
      className="rounded-xl border border-stone-200 bg-surface p-4 shadow-md"
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="タスク名"
          className="rounded-xl border border-stone-200 bg-surface px-3 py-2 text-stone-900 outline-none transition placeholder:text-stone-500 focus:border-lime-500 w-full box-border"
        />
        <input
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="メモ"
          className="rounded-xl border border-stone-200 bg-surface px-3 py-2 text-stone-900 outline-none transition placeholder:text-stone-500 focus:border-lime-500 w-full box-border"
        />
        <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-1 items-center">
          <select value={projectId ?? ""} onChange={(e) => setProjectId(e.target.value || null)} className="rounded-xl border border-stone-200 bg-surface px-3 py-2 text-stone-900 outline-none">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <label className="flex items-center gap-2">
            <span className="text-sm text-stone-700">優先度</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="rounded-xl border border-stone-200 bg-surface px-3 py-2 text-stone-900 outline-none"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-2 items-center md:col-span-2 lg:col-span-2">
            <label className="flex flex-col">
              <span className="text-xs text-stone-600 mb-1">開始日</span>
              <input
                type="date"
                value={startDate ?? ""}
                onChange={(e) => setStartDate(e.target.value || null)}
                className="rounded-xl border border-stone-200 bg-surface px-3 py-2 text-stone-900 outline-none w-full box-border"
                aria-label="開始日"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-xs text-stone-600 mb-1">終了日</span>
              <input
                type="date"
                value={endDate ?? ""}
                onChange={(e) => setEndDate(e.target.value || null)}
                className="rounded-xl border border-stone-200 bg-surface px-3 py-2 text-stone-900 outline-none w-full box-border"
                aria-label="終了日"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-xs text-stone-600 mb-1">見積時間 (h)</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={estimateHours === "" ? "" : String(estimateHours)}
                onChange={(e) => setEstimateHours(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="h"
                className="w-full sm:w-20 rounded-xl border border-stone-200 bg-surface px-3 py-2 text-stone-900 outline-none time-input box-border"
              />
            </label>
        </div>

        {/* Issue #51: 開始/終了時刻（任意）。空のままなら時刻なし＝終日扱いで保存される */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center md:col-span-2 lg:col-span-2">
            <label className="flex flex-col">
              <span className="text-xs text-slate-600 mb-1">開始時刻（任意）</span>
              <input
                type="time"
                value={startTime ?? ""}
                onChange={(e) => setStartTime(e.target.value || null)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none w-full box-border"
                aria-label="開始時刻"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-xs text-slate-600 mb-1">終了時刻（任意）</span>
              <input
                type="time"
                value={endTime ?? ""}
                onChange={(e) => setEndTime(e.target.value || null)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none w-full box-border"
                aria-label="終了時刻"
              />
            </label>
        </div>

        <div className="flex items-center gap-2 md:col-span-2 lg:col-span-3 justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-lime-600 px-4 py-2 font-semibold text-white transition hover:bg-lime-500 disabled:opacity-50">
            <Plus size={16} />
            {editingTask ? "保存" : "追加"}
          </button>
          {editingTask && (
            <button type="button" onClick={() => onCancel?.()} className="rounded-xl border border-stone-200 bg-surface px-4 py-2 text-stone-700">
              キャンセル
            </button>
          )}
        </div>
      </div>
      {error && <div className="mt-2 text-sm text-rose-600">{error}</div>}
    </form>
  );
}
