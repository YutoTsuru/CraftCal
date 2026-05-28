"use client";

import { useEffect, useState } from "react";
import { getAllLogs } from "@/lib/dailyLogs";
import { useDevCalendar } from "@/components/AppProvider";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function StatsCard() {
  const { tasks } = useDevCalendar();
  const [thisWeekDays, setThisWeekDays] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);

  useEffect(() => {
    const logs = getAllLogs();
    setTotalLogs(logs.length);

    // this week: from Monday
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = (day + 6) % 7; // 0 for Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);
    const mondayStr = formatDate(monday);

    const thisWeek = logs.filter((l) => l.date >= mondayStr);
    const uniqueDays = new Set(thisWeek.map((l) => l.date));
    setThisWeekDays(uniqueDays.size);

    // streak: count backward from today while there is a log
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const ds = formatDate(d);
      if (logs.some((l) => l.date === ds)) s++; else break;
    }
    setStreak(s);
  }, [tasks]);

  const completedCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
      <h3 className="text-lg font-semibold">Stats</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-md border p-3 text-center">
          <div className="text-sm text-slate-500">今週の作業日数</div>
          <div className="mt-1 text-2xl font-bold">{thisWeekDays}日</div>
        </div>
        <div className="rounded-md border p-3 text-center">
          <div className="text-sm text-slate-500">連続作業</div>
          <div className="mt-1 text-2xl font-bold">{streak}日</div>
        </div>
        <div className="rounded-md border p-3 text-center">
          <div className="text-sm text-slate-500">累計作業ログ</div>
          <div className="mt-1 text-2xl font-bold">{totalLogs}件</div>
        </div>
        <div className="rounded-md border p-3 text-center">
          <div className="text-sm text-slate-500">完了タスク</div>
          <div className="mt-1 text-2xl font-bold">{completedCount}件</div>
        </div>
      </div>
    </div>
  );
}
