"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useDevCalendar } from "@/components/AppProvider";
import type { TaskWeight, Task, TaskFormInput } from "@/types/dev-calendar";

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
  const [priority, setPriority] = useState("medium");
  // Use clearer local names: startDate(開始日) and endDate(終了日)
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
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
      setEstimateHours(typeof editingTask.estimatedMinutes === "number" ? Math.round(editingTask.estimatedMinutes / 60) : "");
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

    setError(null);
    return true;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const input: TaskFormInput = {
      title: title.trim(),
      memo: memo.trim(),
      weight,
      priority: priority as any,
      // Map local start/end back to form fields
      dueDate: endDate,
      scheduledDate: startDate,
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
      }
    } catch (e: any) {
      setError(e?.message ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="タスク名"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-400 w-full box-border"
        />
        <input
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="メモ"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-400 w-full box-border"
        />
        <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-1 items-center">
          <select value={projectId ?? ""} onChange={(e) => setProjectId(e.target.value || null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <label className="flex items-center gap-2">
            <span className="text-sm text-slate-700">優先度</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-2 items-center md:col-span-2 lg:col-span-2">
            <label className="flex flex-col">
              <span className="text-xs text-slate-600 mb-1">開始日</span>
              <input
                type="date"
                value={startDate ?? ""}
                onChange={(e) => setStartDate(e.target.value || null)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none w-full box-border"
                aria-label="開始日"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-xs text-slate-600 mb-1">終了日</span>
              <input
                type="date"
                value={endDate ?? ""}
                onChange={(e) => setEndDate(e.target.value || null)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none w-full box-border"
                aria-label="終了日"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-xs text-slate-600 mb-1">見積時間 (h)</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={estimateHours === "" ? "" : String(estimateHours)}
                onChange={(e) => setEstimateHours(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="h"
                className="w-full sm:w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none time-input box-border"
              />
            </label>
        </div>

        <div className="flex items-center gap-2 md:col-span-2 lg:col-span-3 justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50">
            <Plus size={16} />
            {editingTask ? "保存" : "追加"}
          </button>
          {editingTask && (
            <button type="button" onClick={() => onCancel?.()} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700">
              キャンセル
            </button>
          )}
        </div>
      </div>
      {error && <div className="mt-2 text-sm text-rose-600">{error}</div>}
    </form>
  );
}
