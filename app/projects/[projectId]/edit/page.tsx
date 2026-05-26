"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useDevCalendar } from "@/components/AppProvider";

export default function ProjectEditPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const router = useRouter();
  const { projects = [], updateProject } = useDevCalendar();

  const project = projects.find((p) => p.id === projectId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [overviewUrl, setOverviewUrl] = useState("");
  const [color, setColor] = useState("#10b981");
  const [status, setStatus] = useState<"active" | "paused" | "done">("active");

  useEffect(() => {
    if (project) {
      setName(project.name ?? "");
      setDescription(project.description ?? "");
      setGoal(project.goal ?? "");
      setOverviewUrl(project.overviewUrl ?? "");
      setColor(project.color ?? "#10b981");
      setStatus(project.status ?? "active");
    }
  }, [project]);

  if (!project) {
    return (
      <div className="grid gap-4">
        <p className="text-slate-600">プロジェクトが見つかりません。</p>
        <Link href="/projects" className="text-sm text-indigo-600">プロジェクト一覧へ戻る</Link>
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    const patch = {
      name: name.trim(),
      description: description.trim() || null,
      goal: goal.trim() || null,
      overviewUrl: overviewUrl.trim() || null,
      color: color || null,
      status
    } as any;

    updateProject(projectId, patch);
    router.push(`/projects/${projectId}`);
  };

  const handleCancel = () => {
    router.push(`/projects/${projectId}`);
  };

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-indigo-600">Edit Project</p>
        <h2 className="mt-2 text-3xl font-bold">{project.name}</h2>
        <p className="mt-2 text-slate-400">プロジェクト情報を編集します。</p>
      </div>

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

            <div className="ml-auto flex gap-2">
              <button type="button" onClick={handleCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">
                キャンセル
              </button>
              <button type="submit" className="rounded-xl bg-emerald-500 px-4 py-2 text-white">
                保存
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
