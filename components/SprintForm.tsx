"use client";

import { FormEvent, useState } from "react";
import { Rocket } from "lucide-react";
import { useDevCalendar } from "@/components/AppProvider";

export function SprintForm() {
  const { sprint, setSprint, generateSprintSchedule } = useDevCalendar();
  const { projects = [] } = useDevCalendar();
  const [startDate, setStartDate] = useState(sprint?.startDate ?? "");
  const [endDate, setEndDate] = useState(sprint?.endDate ?? "");
  const [projectId, setProjectId] = useState<string | null>(sprint?.projectId ?? projects?.[0]?.id ?? null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!startDate || !endDate) {
      return;
    }

    setSprint({
      startDate,
      endDate,
      projectId
    });

    requestAnimationFrame(() => {
      generateSprintSchedule();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-2 text-sm text-slate-700">
          開始日
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          終了日
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          対象プロジェクト
          <select value={projectId ?? ""} onChange={(e) => setProjectId(e.target.value || null)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none">
            <option value="">(全プロジェクト)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <button className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-white transition hover:bg-emerald-400">
          <Rocket size={18} />
          生成
        </button>
      </div>
    </form>
  );
}
