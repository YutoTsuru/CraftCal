"use client";

import { CheckCircle2 } from "lucide-react";
import { useDevCalendar } from "@/components/AppProvider";
import { getTodayString, getTodayTasks } from "@/lib/schedule";
import type { TaskStatus } from "@/types/dev-calendar";
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

export function TodayList() {
  const { schedule, updateTaskStatus, tasks } = useDevCalendar();
  const { projects } = useDevCalendar();
  const today = getTodayString();
  const tasksForToday = getTodayTasks(schedule, tasks);

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
                  onChange={(e) => updateTaskStatus(task.id, e.target.checked ? "done" : "todo")}
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
                  onClick={() => updateTaskStatus(task.id, "done")}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-1 text-sm font-semibold text-white transition hover:bg-emerald-400"
                >
                  <CheckCircle2 size={16} />
                  完了
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
