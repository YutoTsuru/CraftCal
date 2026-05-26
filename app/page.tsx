"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import { StatCard } from "@/components/StatCard";
import { getSprintLabel, getTodayTasks } from "@/lib/schedule";

export default function HomePage() {
  const { tasks, sprint, schedule } = useDevCalendar();
  const { projects = [] } = useDevCalendar();

  const todayTasks = getTodayTasks(schedule, tasks);

  const inProgress = tasks.filter((t) => t.status === "doing");

  const dueSoon = useMemo(() => {
    const now = new Date();
    const soon: typeof tasks = [];

    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const d = new Date(`${t.dueDate}T00:00:00`);
      const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (diff >= 0 && diff <= 7) {
        soon.push(t);
      }
    });

    return soon.slice(0, 6);
  }, [tasks]);

  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-600">概要</p>
            <h2 className="mt-2 text-2xl font-bold">今日と今週の要約</h2>
            <p className="mt-2 text-slate-500">今日や今週で優先すべき作業がすぐ分かるように整理しました。</p>
            <div className="mt-4 flex gap-3">
              <Link href="/tasks" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900">
                タスク管理
              </Link>
              <Link href="/sprint" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
                スプリント
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="全タスク" value={tasks.length} />
            <StatCard label="進行中" value={inProgress.length} />
            <StatCard label="今日のタスク" value={todayTasks.length} description={getSprintLabel(sprint)} />
            <StatCard label="期限間近" value={dueSoon.length} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
        <h3 className="text-lg font-semibold">プロジェクト進捗</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((p) => {
            const projectTasks = tasks.filter((t) => t.projectId === p.id);
            const done = projectTasks.filter((t) => t.status === "done").length;
            const progress = projectTasks.length === 0 ? 0 : Math.round((done / projectTasks.length) * 100);

            return (
              <div key={p.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">{projectTasks.length} 件</div>
                  </div>
                  <div className="text-sm font-semibold">{progress}%</div>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div style={{ width: `${progress}%`, background: p.color ?? "#10b981" }} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">今日のタスク</h3>
            <Link href="/today" className="text-sm text-indigo-600">すべて見る</Link>
          </div>

          {todayTasks.length === 0 ? (
            <p className="mt-4 text-slate-400">今日のタスクはありません。</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {todayTasks.slice(0, 5).map((t) => (
                <li key={t.id} className={`flex items-center justify-between rounded-md px-3 py-2 ${t.status === "done" ? "opacity-60" : ""}`}>
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-slate-600">{t.memo ?? ""}</div>
                  </div>
                  <div className="text-xs text-slate-500">{typeof t.estimatedMinutes === "number" ? `${Math.round(t.estimatedMinutes / 60 * 10) / 10}h` : ""}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">期限が近いタスク</h3>
            <Link href="/tasks" className="text-sm text-indigo-600">すべて見る</Link>
          </div>

          {dueSoon.length === 0 ? (
            <p className="mt-4 text-slate-400">今後7日以内の期限はありません。</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {dueSoon.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-md px-3 py-2">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-slate-600">期限: {t.dueDate}</div>
                  </div>
                  <div className="text-xs text-slate-500">{t.priority ?? ""}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
        <h3 className="text-lg font-semibold">進行中のタスク</h3>
        {inProgress.length === 0 ? (
          <p className="mt-3 text-slate-400">進行中の作業はありません。</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {inProgress.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-md px-3 py-2">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-slate-600">{t.memo ?? ""}</div>
                </div>
                <div className="text-xs text-slate-500">{typeof t.estimatedMinutes === "number" ? `${Math.round(t.estimatedMinutes / 60 * 10) / 10}h` : ""}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
