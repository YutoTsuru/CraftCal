"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

function fmtFull(d: Date) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
}

function fmtCompact(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}（${weekdays[d.getDay()]}）`;
}

export default function CalendarRangeHeader({
  startDate,
  endDate,
  totalDays,
  onPrev,
  onToday,
  onNext
}: {
  startDate: Date;
  endDate: Date;
  totalDays: number;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mb-4 flex w-full items-center justify-between">
      <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
        <div className="hidden sm:flex items-center gap-3 text-sm text-slate-700">
          <span aria-hidden>📅</span>
          <span className="font-medium">表示中：</span>
          <span className="text-slate-800">{fmtFull(startDate)}〜 {fmtFull(endDate)}</span>
          <span className="text-slate-400">｜{totalDays}日間</span>
        </div>

        <div className="flex sm:hidden flex-col gap-1">
          <div className="text-sm font-medium text-slate-800">{fmtCompact(startDate)}〜 {fmtCompact(endDate)}</div>
          <div className="text-xs text-slate-500">{totalDays}日間</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onPrev} className="rounded-md bg-slate-50 p-2 text-slate-700 hover:bg-slate-100" aria-label="前へ">
          <ChevronLeft size={16} />
        </button>
        <button onClick={onToday} className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white">今日</button>
        <button onClick={onNext} className="rounded-md bg-slate-50 p-2 text-slate-700 hover:bg-slate-100" aria-label="次へ">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
