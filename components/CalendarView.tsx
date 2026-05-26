"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDevCalendar } from "@/components/AppProvider";
import { formatDate, getTodayString } from "@/lib/schedule";
import type { Task } from "@/types/dev-calendar";
import CalendarRangeHeader from "@/components/CalendarRangeHeader";

type ViewMode = "month" | "week";

function TaskCard({ task }: { task: Task }) {
  const { projects } = useDevCalendar();
  const project = projects.find((p) => p.id === task.projectId);
  const today = getTodayString();
  const overdue = task.dueDate && task.dueDate < today && task.status !== "done";

  const priorityColor =
    task.priority === "high" ? "border-rose-500" : task.priority === "medium" ? "border-amber-400" : "border-emerald-400";

  return (
    <div className={`mb-2 overflow-hidden rounded-md border-l-4 bg-white p-2 text-sm shadow-sm ${priorityColor} ${overdue ? "bg-rose-50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: project?.color ?? "#10b981" }} />
          <div className={`truncate font-medium ${overdue ? "text-rose-600" : "text-slate-800"}`}>{task.title}</div>
        </div>
        <div className="text-xs text-slate-400">{task.estimatedMinutes ? `${task.estimatedMinutes}m` : ""}</div>
      </div>
      <div className="mt-1 text-xs text-slate-500 truncate">{task.memo}</div>
    </div>
  );
}

export default function CalendarView() {
  const { tasks } = useDevCalendar();
  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function addMonths(date: Date, months: number) {
    return new Date(date.getFullYear(), date.getMonth() + months, 1);
  }

  function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function getMonthMatrix(date: Date) {
    const first = startOfMonth(date);
    // week starts on Sunday (0)
    const start = addDays(first, -first.getDay());
    const matrix: Date[][] = [];

    let cur = new Date(start);
    for (let week = 0; week < 6; week++) {
      const row: Date[] = [];
      for (let i = 0; i < 7; i++) {
        row.push(new Date(cur));
        cur = addDays(cur, 1);
      }
      matrix.push(row);
    }

    return matrix;
  }

  function getWeekRange(date: Date) {
    const start = addDays(date, -date.getDay());
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }

  const monthMatrix = useMemo(() => getMonthMatrix(cursor), [cursor]);
  const weekRange = useMemo(() => getWeekRange(cursor), [cursor]);

  function tasksForDate(d: Date) {
    const key = formatDate(d);
    const sd = new Date(`${key}T00:00:00`);
    return tasks.filter((t) => {
      const startKey = t.scheduledDate ?? t.dueDate ?? null;
      const endKey = t.dueDate ?? t.scheduledDate ?? null;
      if (!startKey) return false;
      const start = new Date(`${startKey}T00:00:00`);
      const end = new Date(`${endKey}T00:00:00`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
      return start.getTime() <= sd.getTime() && sd.getTime() <= end.getTime();
    });
  }

  function tasksForSelectedKey(key: string) {
    const sd = new Date(`${key}T00:00:00`);
    return tasks.filter((t) => {
      const startKey = t.scheduledDate ?? t.dueDate ?? null;
      const endKey = t.dueDate ?? t.scheduledDate ?? null;
      if (!startKey) return false;
      const start = new Date(`${startKey}T00:00:00`);
      const end = new Date(`${endKey}T00:00:00`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
      return start.getTime() <= sd.getTime() && sd.getTime() <= end.getTime();
    });
  }

  function taskDisplayScore(t: Task) {
    const statusScore = t.status === 'doing' ? 2 : t.status === 'todo' ? 1 : 0;
    const priorityScore = t.priority === 'high' ? 2 : t.priority === 'medium' ? 1 : 0;
    return statusScore * 10 + priorityScore;
  }

  function goToday() {
    setCursor(new Date());
  }

  function prev() {
    if (mode === "month") setCursor((c) => addMonths(c, -1));
    else setCursor((c) => addDays(c, -7));
  }

  function next() {
    if (mode === "month") setCursor((c) => addMonths(c, 1));
    else setCursor((c) => addDays(c, 7));
  }

  const monthLabel = `${cursor.getFullYear()}年 ${cursor.getMonth() + 1}月`;

  return (
    <div className="grid gap-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-600">Calendar</p>
            <h2 className="mt-2 text-3xl font-bold">カレンダー</h2>
            <p className="mt-1 text-slate-400">月表示・週表示でタスクを確認できます。</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center rounded-md bg-slate-50 p-1">
              <button onClick={() => setMode("month")} className={`px-3 py-1 text-sm ${mode === "month" ? "bg-emerald-600 text-white" : "text-slate-700"}`}>Month</button>
              <button onClick={() => setMode("week")} className={`px-3 py-1 text-sm ${mode === "week" ? "bg-emerald-600 text-white" : "text-slate-700"}`}>Week</button>
            </div>
          </div>
        </div>
      </div>

      {/* Range header with controls */}
      <CalendarRangeHeader
        startDate={mode === "month" ? monthMatrix.flat()[0] : weekRange[0]}
        endDate={mode === "month" ? monthMatrix.flat()[monthMatrix.flat().length - 1] : weekRange[6]}
        totalDays={
          (Math.floor(( (mode === "month" ? monthMatrix.flat()[monthMatrix.flat().length - 1] : weekRange[6]).getTime() - (mode === "month" ? monthMatrix.flat()[0] : weekRange[0]).getTime() ) / (1000 * 60 * 60 * 24)) + 1)
        }
        onPrev={prev}
        onToday={goToday}
        onNext={next}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
        <div className="flex items-center justify-between px-2">
          <div className="text-lg font-medium">{mode === "month" ? monthLabel : `${weekRange[0].getFullYear()}年 ${weekRange[0].getMonth() + 1}月 ${weekRange[0].getDate()}日 〜 ${weekRange[6].getMonth() + 1}/${weekRange[6].getDate()}`}</div>
        </div>

        {mode === "month" ? (
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[680px]">
              {/* weekday headers */}
              <div className="grid grid-cols-7 gap-1">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500">{d}</div>
                ))}
              </div>

              {/* weeks */}
              <div className="space-y-1">
                {monthMatrix.map((week, wi) => {
                  const weekStart = week[0];
                  const weekEnd = week[6];

                  // events that overlap this week
                  const events = tasks
                    .map((t) => {
                      const startKey = t.scheduledDate ?? t.dueDate ?? null;
                      const endKey = t.dueDate ?? t.scheduledDate ?? null;
                      if (!startKey) return null;
                      const start = new Date(`${startKey}T00:00:00`);
                      const end = new Date(`${endKey}T00:00:00`);
                      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
                      return { task: t, start, end };
                    })
                    .filter(Boolean) as { task: Task; start: Date; end: Date }[];

                  const overlapping = events.filter(({ start, end }) => !(end < weekStart || start > weekEnd));

                  // compute per-day top-2 map for this week to limit visible segments
                  const dayTopMap: Record<string, Set<string>> = {};
                  week.forEach((d) => {
                    const key = formatDate(d);
                    const items = tasksForDate(d)
                      .slice()
                      .sort((a, b) => taskDisplayScore(b) - taskDisplayScore(a))
                      .slice(0, 2);
                    dayTopMap[key] = new Set(items.map((t) => t.id));
                  });

                  // build segments for week based on per-day top-2 selection
                  // For each day, dayTopMap contains top-2 task ids; coalesce consecutive days per task into segments
                  const idToTask = new Map<string, Task>();
                  tasks.forEach((t) => idToTask.set(t.id, t));

                  const idToIndices = new Map<string, number[]>();
                  week.forEach((d, idx) => {
                    const key = formatDate(d);
                    const s = dayTopMap[key] ?? new Set<string>();
                    s.forEach((id) => {
                      if (!idToIndices.has(id)) idToIndices.set(id, []);
                      idToIndices.get(id)!.push(idx);
                    });
                  });

                  let segments: { task: Task; startIndex: number; length: number; segStart: Date; segEnd: Date }[] = [];
                  idToIndices.forEach((indices, id) => {
                    indices.sort((a, b) => a - b);
                    let startIdx = indices[0];
                    let prev = indices[0];
                    for (let i = 1; i <= indices.length; i++) {
                      const cur = indices[i];
                      if (cur === prev + 1) {
                        prev = cur;
                        continue;
                      }
                      // emit segment from startIdx..prev
                      const segStart = week[startIdx];
                      const segEnd = week[prev];
                      const startIndex = startIdx;
                      const length = prev - startIdx + 1;
                      const task = idToTask.get(id)!;
                      if (task) segments.push({ task, startIndex, length, segStart, segEnd });
                      // start new
                      startIdx = cur;
                      prev = cur;
                    }
                  });

                  // stack segments by assigning row index to avoid vertical overlap
                  const rows: Array<{ task: Task; startIndex: number; length: number; segStart: Date; segEnd: Date }[]> = [];
                  segments.forEach((seg) => {
                    let placed = false;
                    for (const row of rows) {
                      const conflict = row.some((r) => !(seg.startIndex + seg.length - 1 < r.startIndex || seg.startIndex > r.startIndex + r.length - 1));
                      if (!conflict) {
                        row.push(seg);
                        placed = true;
                        break;
                      }
                    }
                    if (!placed) rows.push([seg]);
                  });

                  const maxRows = 2;

                  return (
                    <div key={wi} className="relative grid grid-cols-7 gap-1">
                  
                      {/* day cells */}
                      {week.map((d) => {
                        const key = formatDate(d);
                        const isCurrentMonth = d.getMonth() === cursor.getMonth();
                        const isToday = formatDate(d) === formatDate(today);
                        const items = tasksForDate(d);
                        const isSelected = selectedDate === key;

                        return (
                          <div key={key} onClick={() => setSelectedDate(isSelected ? null : key)} className={`cursor-pointer min-h-[110px] overflow-hidden rounded-md border p-2 ${isCurrentMonth ? 'bg-white' : 'bg-slate-50 opacity-60'} ${isSelected ? 'ring-2 ring-emerald-300' : ''}`}>
                            <div className="flex items-center justify-between">
                              <div className={`text-sm ${isToday ? 'rounded-full bg-emerald-600 px-2 py-1 text-white' : 'text-slate-700'}`}>
                                <span>{d.getDate()}</span>
                              </div>
                              <div className="text-xs text-slate-400">{items.length ? `${items.length}` : ''}</div>
                            </div>

                            <div className="mt-2">
                              {(() => {
                                const keyFmt = formatDate(d);
                                const allItems = tasksForDate(d);
                                const selectedSet = dayTopMap[keyFmt] ?? new Set<string>();
                                const visibleCount = Math.min(2, selectedSet.size);
                                const more = Math.max(0, allItems.length - visibleCount);
                                return (
                                  <>
                                    {more > 0 && <div className="mt-1 text-xs text-slate-500">他{more}件</div>}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}

                      {/* end week.map */}

                      {/* event bars overlay */}
                      <div className="absolute inset-x-0 top-12 px-2 pointer-events-none">
                        <div className="relative h-0">
                          {rows.slice(0, maxRows).map((row, ri) => (
                            <div key={ri} className="absolute left-0 right-0" style={{ top: ri * 28 }}>
                              {row.map((seg, i) => {
                                const left = (seg.startIndex / 7) * 100;
                                const width = (seg.length / 7) * 100;
                                const bg = seg.task.status === 'done' ? 'bg-emerald-200' : seg.task.status === 'doing' ? 'bg-blue-200' : 'bg-amber-200';
                                return (
                                  <div key={seg.task.id} title={seg.task.title} className={`absolute h-7 overflow-hidden text-xs font-medium text-slate-800 shadow-sm`} style={{ left: `${left}%`, width: `${width}%` }}>
                                    <div className={`${bg} rounded-md px-2 py-1 truncate` + (seg.startIndex === 0 ? ' rounded-l-lg' : '') + (seg.startIndex + seg.length === 7 ? ' rounded-r-lg' : '')}>
                                      {seg.task.title}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}

                          {/* more indicator */}
                          {rows.length > maxRows && (
                            <div className="absolute right-2" style={{ top: maxRows * 28 }}>
                              <div className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">+{rows.length - maxRows} more</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 gap-2">
                {weekRange.map((d) => {
                  const key = formatDate(d);
                  const startKey = formatDate(weekRange[0]);
                  const endKey = formatDate(weekRange[6]);
                  const isStart = key === startKey;
                  const isEnd = key === endKey;

                  return (
                    <div key={formatDate(d)} className={`rounded-md border bg-white p-3 ${!isStart && !isEnd ? '' : 'opacity-100'}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {isStart && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">開始</span>}
                          {isEnd && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">終了</span>}
                        </div>
                        <div className="text-xs text-slate-400">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                      </div>

                      <div className="mt-3">
                        {(() => {
                          const items = tasksForDate(d);
                          const visible = items
                            .slice()
                            .sort((a, b) => taskDisplayScore(b) - taskDisplayScore(a))
                            .slice(0, 2);
                          const more = items.length - visible.length;
                          return (
                            <>
                              {visible.map((t) => (
                                <TaskCard key={t.id} task={t} />
                              ))}
                              {more > 0 && <div className="mt-1 text-xs text-slate-500">他{more}件</div>}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {selectedDate && (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">{selectedDate}</p>
              <h3 className="mt-1 text-lg font-semibold">この日のタスク</h3>
            </div>
            <div>
              <button onClick={() => setSelectedDate(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm">閉じる</button>
            </div>
          </div>

          <div className="mt-3">
            {tasksForSelectedKey(selectedDate).length === 0 ? (
              <p className="text-sm text-slate-500">この日のタスクはありません。</p>
            ) : (
              tasksForSelectedKey(selectedDate).map((t) => <TaskCard key={t.id} task={t} />)
            )}
          </div>
        </section>
      )}
    </div>
  );
}
