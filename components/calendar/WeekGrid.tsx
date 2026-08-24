"use client";

import type React from "react";
import { formatDate } from "@/lib/schedule";
import { getTasksForDate, taskDisplayScore } from "@/lib/calendar-bars";
import TaskCard from "@/components/calendar/TaskCard";
import type { Task } from "@/types/dev-calendar";

type Props = {
  /** 表示する7日ぶんの日付（lib/calendar-grid.ts の getWeekRange の結果） */
  days: Date[];
  tasks: Task[];
  placingTaskId: string | null;
  rangeSelecting: boolean;
  isInRange: (dateKey: string) => boolean;
  onCellClick: (dateKey: string) => void;
  onCellPointerDown: (dateKey: string, e: React.PointerEvent<HTMLDivElement>) => void;
};

// 1日のセルに出すタスクの上限。あふれた分は「他N件」でまとめる
const MAX_TASKS_PER_DAY = 2;

/**
 * 週表示のカレンダーグリッド (Issue #56 で CalendarView.tsx から抽出)。
 *
 * デスクトップは7列の横並び。モバイルは以前 min-w-[700px] で横スクロールだったが、
 * 1列の縦リスト（アジェンダ形式）に変更した (Issue #14)。
 * grid-cols-1 sm:grid-cols-7 = モバイル1列 → sm(640px)以上で7列。
 *
 * 月表示と同じく描画に徹していて、クリックとドラッグ開始は呼び出し側へ渡す。
 *
 * 対応するUI: /calendar ページの Week タブ。
 */
export default function WeekGrid({
  days,
  tasks,
  placingTaskId,
  rangeSelecting,
  isInRange,
  onCellClick,
  onCellPointerDown
}: Props) {
  const startKey = formatDate(days[0]);
  const endKey = formatDate(days[days.length - 1]);

  return (
    <div className="mt-4">
      <div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {days.map((d) => {
            const key = formatDate(d);
            const isStart = key === startKey;
            const isEnd = key === endKey;

            const inRange = isInRange(key);

            const items = getTasksForDate(tasks, d);
            const visible = items
              .slice()
              .sort((a, b) => taskDisplayScore(b) - taskDisplayScore(a))
              .slice(0, MAX_TASKS_PER_DAY);
            const more = items.length - visible.length;

            return (
              <div
                key={key}
                data-date={key}
                style={rangeSelecting ? { touchAction: "none" } : undefined}
                onPointerDown={(e) => onCellPointerDown(key, e)}
                onClick={() => onCellClick(key)}
                className={`rounded-md border bg-surface p-3 ${rangeSelecting ? 'touch-none' : ''} ${inRange ? 'bg-lime-100 ring-2 ring-lime-300' : ''} ${!isStart && !isEnd ? '' : 'opacity-100'} ${placingTaskId ? 'cursor-pointer hover:ring-2 hover:ring-lime-500' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {isStart && <span className="ml-2 rounded-full bg-lime-100 px-2 py-0.5 text-xs text-lime-800">開始</span>}
                    {isEnd && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">終了</span>}
                  </div>
                  <div className="text-xs text-stone-400">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                </div>

                <div className="mt-3">
                  {visible.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                  {more > 0 && <div className="mt-1 text-xs text-stone-500">他{more}件</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
