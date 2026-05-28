"use client";

import { useEffect, useState } from "react";
import { getAllLogs } from "@/lib/dailyLogs";
import { useDevCalendar } from "@/components/AppProvider";

export default function Achievements() {
  const { tasks } = useDevCalendar();
  const [achieved, setAchieved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const logs = getAllLogs();
    const totalLogs = logs.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const blockedLogs = logs.some((l) => l.blocked && l.blocked.trim().length > 0);
    const revived = tasks.some((t) => t.dueDate && t.status !== "expired" && t.updatedAt && t.updatedAt > t.createdAt && t.status !== "done");

    setAchieved({
      firstStep: totalLogs >= 1,
      threeDayStreak: false,
      recordMaster: totalLogs >= 10,
      completedOne: completedTasks >= 1,
      revivedOne: revived,
      describedBlocked: blockedLogs,
      registeredUrl: tasks.some((t) => t.completionUrl)
    });
  }, [tasks]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
      <h3 className="text-lg font-semibold">Achievements</h3>
      <div className="mt-3 grid gap-2">
        <Badge name="初めての一歩" achieved={achieved.firstStep} />
        <Badge name="記録職人 (10件)" achieved={achieved.recordMaster} />
        <Badge name="完成まで到達" achieved={achieved.completedOne} />
        <Badge name="詰まりを言語化" achieved={achieved.describedBlocked} />
        <Badge name="成果物登録" achieved={achieved.registeredUrl} />
      </div>
    </div>
  );
}

function Badge({ name, achieved }: { name: string; achieved?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md border px-3 py-2 ${achieved ? 'bg-amber-50' : 'bg-slate-50'} `}>
      <div className={`font-medium ${achieved ? 'text-amber-800' : 'text-slate-400'}`}>{name}</div>
      <div className={`text-sm ${achieved ? 'text-amber-600' : 'text-slate-300'}`}>{achieved ? '達成' : '未達成'}</div>
    </div>
  );
}
