"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import { getTodayString, getTodayTasks } from "@/lib/schedule";
import type { TaskStatus } from "@/types/dev-calendar";
import { saveOrUpdateDailyLog, getLogsByDate, getRecentLogs, getAllLogs } from "@/lib/dailyLogs";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";

function ProjectBadge({ projectId, projects }: { projectId: string; projects: { id: string; name: string; color?: string | null }[] }) {
  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;

  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: project.color ?? "#10b981" }} />
      <span className="text-xs text-slate-500">{project.name}</span>
    </span>
  );
}

export default function TodayList() {
  const { schedule, updateTaskStatus, tasks } = useDevCalendar();
  const { projects } = useDevCalendar();
  const { completeTask } = useDevCalendar();
  const today = getTodayString();
  const tasksForToday = getTodayTasks(schedule, tasks);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [did, setDid] = useState("");
  const [blocked, setBlocked] = useState("");
  const [next, setNext] = useState("");

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
        <p className="text-sm text-slate-700">今日の日付</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold">{today}</h2>
          <p className="text-sm text-slate-700">今日のタスク {tasksForToday.length} 件</p>
        </div>
      </div>

      {tasksForToday.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-700">
          今日に割り振られたタスクはありません。
        </div>
      ) : (
        <ul className="grid gap-2">
          {tasksForToday.map((task) => (
            <li key={task.id} className={`flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 ${task.status === "done" ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.status === "done"}
                  onChange={(e) => {
                    if (e.target.checked) {
                      completeTask(task.id);
                    } else {
                      updateTaskStatus(task.id, "todo");
                    }
                  }}
                  className="mt-1 h-4 w-4"
                  aria-label={`完了 ${task.title}`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <ProjectBadge projectId={task.projectId} projects={projects} />
                    <div className="flex items-center gap-2">
                      <StatusBadge status={task.status} size="sm" />
                      <div className={`font-medium ${task.status === "done" ? "line-through text-slate-500" : "text-slate-900"}`}>{task.title}</div>
                    </div>
                  </div>
                  {task.memo && <div className={`text-sm ${task.status === "done" ? "line-through text-slate-500" : "text-slate-600"}`}>{task.memo}</div>}
                  <div className="mt-1 text-xs text-slate-600 flex items-center gap-2">
                    <div>{task.weight}</div>
                    {task.priority && <PriorityBadge priority={task.priority} />}
                    {typeof task.estimatedMinutes === "number" && <div>{Math.round(task.estimatedMinutes / 60 * 10) / 10}h</div>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={task.status}
                  onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskStatus)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 outline-none"
                >
                  <option value="todo">未着手</option>
                  <option value="doing">進行中</option>
                  <option value="done">完了</option>
                </select>
                <button
                  onClick={() => {
                    // Open simple prompt to collect optional note + url
                    // Show caution message
                    // eslint-disable-next-line no-alert
                    if (!confirm("このタスクを完了にしますか？完了時にメモ(URL含む)を保存できます。個人情報や機密情報を含まないよう注意してください。")) return;
                    // eslint-disable-next-line no-alert
                    const note = prompt("完了メモ（任意）\n※個人情報やAPIキーを含まないでください。", "") || null;
                    // eslint-disable-next-line no-alert
                    const url = prompt("関連URL（任意）", "") || null;
                    completeTask(task.id, note, url);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-1 text-sm font-semibold text-white transition hover:bg-emerald-400"
                >
                  <CheckCircle2 size={16} />
                  完了
                </button>

                <button
                  onClick={() => {
                    // open daily log editor for this task
                    const logs = getAllLogs();
                    const existing = logs.find((l) => l.taskId === task.id && l.date === today);
                    setEditingTaskId(task.id);
                    setDid(existing?.did ?? "");
                    setBlocked(existing?.blocked ?? "");
                    setNext(existing?.next ?? "");
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-3 py-1 text-sm font-semibold text-white transition hover:bg-sky-400"
                >
                  今日分完了 / メモを書く
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">作業ログを記録</h3>
            <p className="text-sm text-slate-500">今日やったこと・詰まったこと・次にやることを入力してください。空でも保存できます。</p>

            <div className="mt-4 grid gap-3">
              <label className="text-sm">今日やったこと (did)</label>
              <textarea value={did} onChange={(e) => setDid(e.target.value)} className="h-24 w-full rounded-md border px-3 py-2" />

              <label className="text-sm">詰まったこと (blocked)</label>
              <textarea value={blocked} onChange={(e) => setBlocked(e.target.value)} className="h-24 w-full rounded-md border px-3 py-2" />

              <label className="text-sm">次にやること (next)</label>
              <input value={next} onChange={(e) => setNext(e.target.value)} className="w-full rounded-md border px-3 py-2" />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditingTaskId(null)} className="rounded-md border px-3 py-1">閉じる</button>
              <button
                onClick={() => {
                  saveOrUpdateDailyLog({ taskId: editingTaskId!, date: today, did, blocked, next, doneToday: true });
                  setEditingTaskId(null);
                }}
                className="rounded-md bg-emerald-500 px-3 py-1 text-white"
              >
                保存して今日分完了にする
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
