"use client";

import { useDevCalendar } from "@/components/AppProvider";
import { getTodayString } from "@/lib/schedule";
import { DEFAULT_PROJECT_COLOR } from "@/lib/colors";
import { formatScheduledTimeRange } from "@/lib/scheduled-time";
import type { Task } from "@/types/dev-calendar";

/**
 * タスク1件のカード表示 (Issue #56 で CalendarView.tsx から抽出)。
 *
 * 週表示のセル内と、選択日パネルのタスク一覧の両方で使う。
 * 左端の色帯は優先度、丸はプロジェクト色。期限切れは赤系に寄せる。
 */
export default function TaskCard({ task }: { task: Task }) {
  const { projects } = useDevCalendar();
  const project = projects.find((p) => p.id === task.projectId);
  const today = getTodayString();
  const overdue = task.dueDate && task.dueDate < today && task.status !== "done";
  const timeRange = formatScheduledTimeRange(task.scheduledStartTime, task.scheduledEndTime);

  const priorityColor =
    task.priority === "high" ? "border-rose-500" : task.priority === "medium" ? "border-amber-400" : "border-lime-500";

  return (
    <div className={`mb-2 overflow-hidden rounded-md border-l-4 bg-surface p-2 text-sm shadow-sm ${priorityColor} ${overdue ? "bg-rose-50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: project?.color ?? DEFAULT_PROJECT_COLOR }} />
          <div className={`truncate font-medium ${overdue ? "text-rose-600" : "text-stone-800"}`}>{task.title}</div>
        </div>
        <div className="text-xs text-stone-400">{task.estimatedMinutes ? `${task.estimatedMinutes}m` : ""}</div>
      </div>
      {/* Issue #51: 時刻があるときだけ表示（時刻なしのタスクは従来どおり何も出さない） */}
      {timeRange && <div className="mt-1 text-xs text-stone-500">{timeRange}</div>}
      <div className="mt-1 text-xs text-stone-500 truncate">{task.memo}</div>
    </div>
  );
}
