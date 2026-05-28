"use client";

import { useEffect, useMemo, useState } from "react";
import { getAllLogs } from "@/lib/dailyLogs";
import { useDevCalendar } from "@/components/AppProvider";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getColorForLevel(level: number) {
  switch (level) {
    case 0:
      return "bg-slate-100";
    case 1:
      return "bg-green-200";
    case 2:
      return "bg-green-400";
    case 3:
      return "bg-emerald-600";
    case 4:
      return "bg-emerald-800";
    default:
      return "bg-slate-100";
  }
}

export default function ActivityGrid({ days = 90 }: { days?: number }) {
  const { tasks } = useDevCalendar();
  const logs = useMemo(() => getAllLogs(), []);

  // Build weeks: columns = weeks, rows = weekdays (Mon=0..Sun=6)
  const [weeks, setWeeks] = useState<{ date: string; level: number; logs: number; dones: number }[][]>([]);

  useEffect(() => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - (days - 1));

    // align to Monday for grid baseline
    const monday = new Date(start);
    const dayOfWeek = (monday.getDay() + 6) % 7; // 0=Mon
    monday.setDate(monday.getDate() - dayOfWeek);

    const cols: { date: string; level: number; logs: number; dones: number }[][] = [];

    const msPerDay = 24 * 60 * 60 * 1000;

    // compute number of days between monday and today
    const totalDays = Math.round((today.setHours(0, 0, 0, 0) - monday.setHours(0, 0, 0, 0)) / msPerDay) + 1;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(monday.getTime() + i * msPerDay);
      const ds = formatDate(d);

      const dayLogs = logs.filter((l) => l.date === ds);
      const logCount = dayLogs.length;
      const doneCount = tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) === ds).length;
      let level = 0;
      if (logCount > 0) level = 1;
      if (dayLogs.some((l) => l.doneToday)) level = Math.max(level, 2);
      if (doneCount > 0) level = Math.max(level, 3);
      if (logCount + doneCount >= 2) level = 4;

      const weekIndex = Math.floor(i / 7);
      const weekdayIndex = i % 7; // 0=Mon

      cols[weekIndex] = cols[weekIndex] ?? [];
      cols[weekIndex][weekdayIndex] = { date: ds, level, logs: logCount, dones: doneCount };
    }

    setWeeks(cols);
  }, [logs, tasks, days]);

  // month labels: show month at first column where month changes
  const monthLabels = useMemo(() => {
    const map: Record<number, string> = {};
    weeks.forEach((col, idx) => {
      const cell = col && col[0];
      if (!cell) return;
      const month = new Date(cell.date).getMonth();
      if (map[month] === undefined) map[month] = cell.date.slice(0, 7);
    });
    return map;
  }, [weeks]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
      <h3 className="text-lg font-semibold">Craft Activity</h3>

      <div className="mt-3 flex gap-3">
        {/* Weekday labels */}
        <div className="hidden md:flex md:flex-col md:items-end md:gap-[4px] md:pr-2" style={{ width: 48 }}>
          <div className="h-3" />
          <div className="text-xs text-slate-500" style={{ lineHeight: '12px' }}>Mon</div>
          <div className="text-xs text-slate-500" style={{ lineHeight: '12px' }}>Tue</div>
          <div className="text-xs text-slate-500" style={{ lineHeight: '12px' }}>Wed</div>
          <div className="text-xs text-slate-500" style={{ lineHeight: '12px' }}>Thu</div>
          <div className="text-xs text-slate-500" style={{ lineHeight: '12px' }}>Fri</div>
          <div className="text-xs text-slate-500" style={{ lineHeight: '12px' }}>Sat</div>
          <div className="text-xs text-slate-500" style={{ lineHeight: '12px' }}>Sun</div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="mb-2 flex items-center gap-3">
            {Object.values(monthLabels).map((m) => (
              <div key={m} className="text-xs text-slate-500" style={{ minWidth: 48 }}>{m}</div>
            ))}
          </div>

          <div
            className="grid"
            style={{
              gridAutoFlow: 'column',
              gridAutoColumns: '12px',
              gridTemplateRows: 'repeat(7, 12px)',
              gap: '4px',
              alignItems: 'start'
            }}
          >
            {weeks.map((col, ci) =>
              // render 7 rows per column
              new Array(7).fill(0).map((_, ri) => {
                const cell = col?.[ri];
                const cls = cell ? getColorForLevel(cell.level) : 'bg-slate-100';
                const title = cell ? `${cell.date} — logs:${cell.logs} doneToday:${cell.level >= 2 ? 1 : 0} dones:${cell.dones}` : 'No data';
                return (
                  <div key={`${ci}-${ri}`} title={title} className={`${cls} rounded-sm`} style={{ width: 12, height: 12 }} />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
