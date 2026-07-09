"use client";

import { useMemo, useState } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import { StatCard } from "@/components/StatCard";
import { TaskBoard } from "@/components/TaskBoard";
import { TaskInput } from "@/components/TaskInput";
import { TaskList } from "@/components/TaskList";
import type { Task } from "@/types/dev-calendar";

export default function TasksPage() {
  const { tasks } = useDevCalendar();
  const { projects } = useDevCalendar();
  const [projectFilter, setProjectFilter] = useState<string | "all">("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // リスト/ボードの表示切替 (Issue #5)。永続化はせず、リロードで "list" に戻る
  const [view, setView] = useState<"list" | "board">("list");

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

      <TaskInput editingTask={editingTask} onCancel={() => setEditingTask(null)} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-700">プロジェクトで絞る:</label>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value as any)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none">
          <option value="all">すべてのプロジェクト</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* リスト/ボード表示切替タブ。選択中は緑背景でハイライトする */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("list")}
            className={`min-h-11 rounded-xl border px-4 text-sm transition ${
              view === "list"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            リスト
          </button>
          <button
            onClick={() => setView("board")}
            className={`min-h-11 rounded-xl border px-4 text-sm transition ${
              view === "board"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            ボード
          </button>
        </div>
      </div>

      {view === "board" ? (
        <TaskBoard tasks={projectFilter === "all" ? tasks : tasks.filter((t) => t.projectId === projectFilter)} />
      ) : (
        <TaskList
          tasks={projectFilter === "all" ? tasks : tasks.filter((t) => t.projectId === projectFilter)}
          onEdit={setEditingTask}
        />
      )}
    </div>
  );
}
