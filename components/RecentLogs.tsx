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

  // Issue #112: Home では <details> の折りたたみ「最近の作業ログ」の中身として使う（見出しは親側）。
  // 以前は1件ごとの rounded-md border カードだったが、divide-y の行リストに変更した。
  // min-w-0: グリッド/フレックス内で中身の最小幅より縮められず横にはみ出すのを防ぐ (Issue #69)
  return (
    <div className="min-w-0">
      <ul className="divide-y divide-stone-100">
        {logs.map((l) => {
          const task = tasks.find((t) => t.id === l.taskId);
          return (
            // break-words: 作業ログは自由入力で、長いURLなど折り返せない文字列が入りうる
            <li key={l.id} className="min-w-0 break-words py-2.5">
              <div className="text-sm text-stone-500">{l.date} — {task?.title ?? "(Unknown)"}</div>
              {l.did && <div className="mt-1 text-sm">{l.did}</div>}
              {l.blocked && <div className="mt-1 text-sm text-amber-600">詰まったこと: {l.blocked}</div>}
              {l.next && <div className="mt-1 text-sm text-stone-600">次: {l.next}</div>}
            </li>
          );
        })}
        {logs.length === 0 && <li className="py-2.5 text-sm text-stone-500">まだ作業ログがありません。</li>}
      </ul>
    </div>
  );
}
