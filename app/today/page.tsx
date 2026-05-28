"use client";

import TodayList from "@/components/TodayList";
import StatsCard from "@/components/StatsCard";
import ActivityGrid from "@/components/ActivityGrid";
import RecentLogs from "@/components/RecentLogs";
import Achievements from "@/components/Achievements";

export default function MyPage() {
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-indigo-600">My Page</p>
        <h2 className="mt-2 text-3xl font-bold">マイページ</h2>
        <p className="mt-2 text-slate-400">今日の作業・履歴・達成感を確認するホーム画面です。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <TodayList />
        </div>
        <div className="grid gap-4">
          <StatsCard />
          <ActivityGrid />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <RecentLogs />
        <Achievements />
        <div />
      </div>
    </div>
  );
}
