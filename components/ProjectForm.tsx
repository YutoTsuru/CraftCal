"use client";

import { FormEvent, useState } from "react";
import { useDevCalendarActions } from "@/components/AppProvider";

export function ProjectForm() {
  // Issue #48: このフォームは addProject しか使わないので actions だけを購読する
  // （tasks などの state が変わってもここは再レンダリングされない）
  const { addProject } = useDevCalendarActions();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#10b981");
  const [goal, setGoal] = useState("");
  const [overviewUrl, setOverviewUrl] = useState("");
  const [status, setStatus] = useState<"active" | "paused" | "done">("active");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addProject({ name: name.trim(), description: description.trim() || null, overviewUrl: overviewUrl.trim() || null, color: color || null, status, goal: goal.trim() || null });

    setName("");
    setDescription("");
    setColor("#10b981");
    setOverviewUrl("");
    setGoal("");
    setStatus("active");
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
      <div className="grid gap-3 md:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="プロジェクト名" className="rounded-xl border border-slate-200 px-3 py-2 outline-none" />
        {/* テーマカラー選択。ラベルなしの type=color だけだと「謎のグレーの棒」に見えるため、
            説明テキストと丸い色見本の形にする (Issue #37) */}
        <label className="flex items-center gap-2">
          <span className="text-sm text-slate-700">テーマカラー</span>
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            type="color"
            aria-label="プロジェクトのテーマカラー"
            className="h-11 w-11 cursor-pointer rounded-full border border-slate-200 p-1"
          />
        </label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="説明 (任意)" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" />
        <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="ゴール (任意)" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" />
        <input value={overviewUrl} onChange={(e) => setOverviewUrl(e.target.value)} placeholder="概要ページのURL (任意)" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" />
        <div className="flex items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="rounded-xl border border-slate-200 px-3 py-2">
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="done">Done</option>
          </select>

          <button className="ml-auto rounded-xl bg-emerald-500 px-4 py-2 text-white">追加</button>
        </div>
      </div>
    </form>
  );
}

export default ProjectForm;
