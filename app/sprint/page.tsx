"use client";

import { useDevCalendar } from "@/components/AppProvider";
import { ScheduleBoard } from "@/components/ScheduleBoard";
import { SprintForm } from "@/components/SprintForm";
import { StatCard } from "@/components/StatCard";
import { getSprintLabel } from "@/lib/schedule";

export default function SprintPage() {
  const { tasks, sprint, schedule } = useDevCalendar();
  const activeTasks = sprint?.projectId ? tasks.filter((task) => task.projectId === sprint.projectId && task.status !== "done") : tasks.filter((task) => task.status !== "done");

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-indigo-600">Sprint Generator</p>
        <h2 className="mt-2 text-3xl font-bold">スプリント生成</h2>
        <p className="mt-2 text-slate-400">開始日と終了日を決めて、未完了タスクを日ごとに自動配置します。</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="現在の期間" value={getSprintLabel(sprint)} />
        <StatCard label="未完了タスク" value={activeTasks.length} />
        <StatCard label="生成済み日数" value={schedule.length} />
      </section>

      <SprintForm />
      <ScheduleBoard schedule={schedule} />
    </div>
  );
}
