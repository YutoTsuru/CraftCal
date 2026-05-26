"use client";

import { TodayList } from "@/components/TodayList";

export default function TodayPage() {
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-indigo-600">Today</p>
        <h2 className="mt-2 text-3xl font-bold">今日やること</h2>
        <p className="mt-2 text-slate-400">今日に割り振られた作業だけを確認して、進捗を進めます。</p>
      </div>

      <TodayList />
    </div>
  );
}
