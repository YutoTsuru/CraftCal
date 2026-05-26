"use client";

import { useMemo, useState } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import { StatCard } from "@/components/StatCard";
import { TaskInput } from "@/components/TaskInput";
import { TaskList } from "@/components/TaskList";

export default function TasksPage() {
  const { tasks } = useDevCalendar();
  const { projects } = useDevCalendar();
  const [projectFilter, setProjectFilter] = useState<string | "all">("all");

  const counts = useMemo(() => {
    return {
      todo: tasks.filter((task) => task.status === "todo").length,
      doing: tasks.filter((task) => task.status === "doing").length,
      done: tasks.filter((task) => task.status === "done").length
    };
  }, [tasks]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-indigo-600">Task Management</p>
        <h2 className="mt-2 text-3xl font-bold">タスク管理</h2>
        <p className="mt-2 text-slate-400">今やるべき作業を小さく分けて登録します。</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="未着手" value={counts.todo} />
        <StatCard label="進行中" value={counts.doing} />
        <StatCard label="完了" value={counts.done} />
      </section>

      <TaskInput />

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-700">プロジェクトで絞る:</label>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value as any)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none">
          <option value="all">すべてのプロジェクト</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <TaskList tasks={projectFilter === "all" ? tasks : tasks.filter((t) => t.projectId === projectFilter)} />
    </div>
  );
}
