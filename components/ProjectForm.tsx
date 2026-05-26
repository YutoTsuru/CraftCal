"use client";

import { FormEvent, useState } from "react";
import { useDevCalendar } from "@/components/AppProvider";

export function ProjectForm() {
  const { addProject } = useDevCalendar();
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
        <input value={color} onChange={(e) => setColor(e.target.value)} type="color" className="w-12 rounded-xl border border-slate-200 px-3 py-2" />
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
