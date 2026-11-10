"use client";

import { useState } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import { TaskBoard } from "@/components/TaskBoard";
import { TaskInput } from "@/components/TaskInput";
import { TaskList } from "@/components/TaskList";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Task } from "@/types/dev-calendar";

export default function TasksPage() {
  const { tasks } = useDevCalendar();
  const { projects } = useDevCalendar();
  const [projectFilter, setProjectFilter] = useState<string | "all">("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // リスト/ボードの表示切替 (Issue #5)。永続化はせず、リロードで "list" に戻る
  const [view, setView] = useState<"list" | "board">("list");

  return (
    <div className="grid gap-6">
      {/* ページ見出し (Issue #112)。
          以前ここにあった未着手/進行中/完了の統計カード3枚は削除した。
          件数は TaskBoard の列ヘッダーに既にあり、情報が重複していたため */}
      <PageHeader title="タスク" />

      <TaskInput editingTask={editingTask} onCancel={() => setEditingTask(null)} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-stone-700">プロジェクトで絞る:</label>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value as any)} className="rounded-xl border border-stone-200 bg-surface px-3 py-2 text-stone-900 outline-none">
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
                ? "border-lime-700 bg-lime-700 text-white"
                : "border-stone-200 bg-surface text-stone-700"
            }`}
          >
            リスト
          </button>
          <button
            onClick={() => setView("board")}
            className={`min-h-11 rounded-xl border px-4 text-sm transition ${
              view === "board"
                ? "border-lime-700 bg-lime-700 text-white"
                : "border-stone-200 bg-surface text-stone-700"
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
