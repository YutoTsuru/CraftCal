"use client";

import Link from "next/link";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDevCalendar } from "@/components/AppProvider";
import { TaskList } from "@/components/TaskList";
import { TaskInput } from "@/components/TaskInput";
import { getTodayString } from "@/lib/schedule";
import { Trash2, AlertTriangle } from "lucide-react";
import { MarkdownView } from "@/components/MarkdownView";
import { ColorPicker } from "@/components/ColorPicker";
import { DEFAULT_PROJECT_COLOR } from "@/lib/colors";
import type { Task } from "@/types/dev-calendar";

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const { projects = [], tasks, updateProject, deleteProject } = useDevCalendar();

  const project = projects.find((p) => p.id === projectId);

  // inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [overviewUrl, setOverviewUrl] = useState("");
  const [color, setColor] = useState(DEFAULT_PROJECT_COLOR);
  const [status, setStatus] = useState<"active" | "paused" | "done">("active");

  // delete confirm state
  const [confirmDelete, setConfirmDelete] = useState(false);

  // task edit state
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (project) {
      setName(project.name ?? "");
      setDescription(project.description ?? "");
      setGoal(project.goal ?? "");
      setOverviewUrl(project.overviewUrl ?? "");
      setColor(project.color ?? DEFAULT_PROJECT_COLOR);
      setStatus(project.status ?? "active");
    }
  }, [project]);

  if (!project) {
    return (
      <div>
        <p className="text-slate-600">プロジェクトが見つかりません。</p>
        <Link href="/projects" className="text-sm text-indigo-600">プロジェクト一覧へ</Link>
      </div>
    );
  }

  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const done = projectTasks.filter((t) => t.status === "done").length;
  const progress = projectTasks.length === 0 ? 0 : Math.round((done / projectTasks.length) * 100);

  const today = getTodayString();
  const todays = projectTasks.filter((t) => t.scheduledDate === today);
  const dueSoon = projectTasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(`${t.dueDate}T00:00:00`);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  const handleSave = () => {
    if (!name.trim()) return;
    updateProject(project.id, {
      name: name.trim(),
      description: description.trim() || null,
      goal: goal.trim() || null,
      overviewUrl: overviewUrl.trim() || null,
      color: color || null,
      status,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(project.name ?? "");
    setDescription(project.description ?? "");
    setGoal(project.goal ?? "");
    setOverviewUrl(project.overviewUrl ?? "");
    setColor(project.color ?? DEFAULT_PROJECT_COLOR);
    setStatus(project.status ?? "active");
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteProject(project.id);
    router.push("/projects");
  };

  return (
    <div className="grid gap-6">
      <div>
        {isEditing ? (
          <div>
            <p className="text-sm text-indigo-600">Edit Project</p>
            <h2 className="mt-2 text-3xl font-bold">{project.name}</h2>
            <p className="mt-2 text-slate-400">プロジェクト情報を編集します。</p>

            <form className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-md">
              <div className="grid gap-3 md:grid-cols-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="プロジェクト名" className="rounded-xl border border-slate-200 px-3 py-2 outline-none md:col-span-2" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={"説明 (Markdown が使えます)\n\n例:\n## 概要\n- 機能A\n- 機能B"}
                  rows={8}
                  className="resize-y rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none md:col-span-2"
                />
                <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="ゴール (任意)" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" />
                <input value={overviewUrl} onChange={(e) => setOverviewUrl(e.target.value)} placeholder="概要ページのURL (任意)" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" />
                {/* Issue #57: ラベルなしの type=color（謎の色付きの箱）をプリセット選択UIに置き換え */}
                <ColorPicker value={color} onChange={setColor} className="md:col-span-2" />

                <div className="flex items-center gap-2">
                  <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="rounded-xl border border-slate-200 px-3 py-2">
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="done">Done</option>
                  </select>

                  <div className="ml-auto flex gap-2">
                    <button type="button" onClick={handleCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">キャンセル</button>
                    <button type="button" onClick={handleSave} className="rounded-xl bg-emerald-500 px-4 py-2 text-white">保存</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm text-indigo-600">Project</p>
              <h2 className="mt-2 text-3xl font-bold">{project.name}</h2>
              {project.description && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
                  <MarkdownView content={project.description} />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {project.overviewUrl && (
                <a href={project.overviewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-indigo-600 hover:bg-slate-100">概要を開く</a>
              )}
              <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">編集</button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
              >
                <Trash2 size={14} />
                削除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 削除確認 */}
      {confirmDelete && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-500" />
            <div className="flex-1">
              <p className="font-medium text-red-800">「{project.name}」を削除しますか？</p>
              <p className="mt-1 text-sm text-red-600">
                このプロジェクトに紐づくタスク（{projectTasks.length}件）はInboxに移動されます。この操作は元に戻せません。
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  削除する
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-600">ゴール</div>
            <div className="mt-1 text-lg font-medium">{project.goal ?? "(未設定)"}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">進捗: {progress}%</div>
            <div className="mt-2 text-sm text-slate-500">ステータス: {project.status}</div>
          </div>
        </div>
      </section>

      {editingTask && (
        <TaskInput editingTask={editingTask} onCancel={() => setEditingTask(null)} />
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
          <h3 className="text-lg font-semibold">タスク一覧</h3>
          <div className="mt-3">
            <TaskList tasks={projectTasks} onEdit={setEditingTask} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
          <h3 className="text-lg font-semibold">今日のタスク</h3>
          {todays.length === 0 ? <p className="mt-3 text-slate-400">今日のタスクはありません。</p> : <TaskList tasks={todays} onEdit={setEditingTask} />}

          <h3 className="mt-6 text-lg font-semibold">期限が近いタスク</h3>
          {dueSoon.length === 0 ? <p className="mt-3 text-slate-400">今後7日以内の期限はありません。</p> : <TaskList tasks={dueSoon} onEdit={setEditingTask} />}
        </div>
      </section>
    </div>
  );
}
