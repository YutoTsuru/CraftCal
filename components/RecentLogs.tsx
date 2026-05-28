"use client";

import { useEffect, useState } from "react";
import { getRecentLogs } from "@/lib/dailyLogs";
import { useDevCalendar } from "@/components/AppProvider";

export default function RecentLogs() {
  const [logs, setLogs] = useState([] as any[]);
  const { tasks } = useDevCalendar();

  useEffect(() => {
    setLogs(getRecentLogs(5));
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
      <h3 className="text-lg font-semibold">Recent Logs</h3>
      <ul className="mt-3 grid gap-3">
        {logs.map((l) => {
          const task = tasks.find((t) => t.id === l.taskId);
          return (
            <li key={l.id} className="rounded-md border p-3">
              <div className="text-sm text-slate-500">{l.date} — {task?.title ?? "(Unknown)"}</div>
              {l.did && <div className="mt-1 text-sm">{l.did}</div>}
              {l.blocked && <div className="mt-1 text-sm text-amber-600">詰まったこと: {l.blocked}</div>}
              {l.next && <div className="mt-1 text-sm text-slate-600">次: {l.next}</div>}
            </li>
          );
        })}
        {logs.length === 0 && <li className="text-sm text-slate-500">まだ作業ログがありません。</li>}
      </ul>
    </div>
  );
}
