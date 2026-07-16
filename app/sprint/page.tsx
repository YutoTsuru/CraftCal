"use client";

import { useDevCalendar } from "@/components/AppProvider";
import { StatCard } from "@/components/StatCard";
import { ChatMessage } from "@/components/planner/ChatMessage";
import { QuickActionButtons } from "@/components/planner/QuickActionButtons";
import { ScheduleSuggestionCard } from "@/components/planner/ScheduleSuggestionCard";
import { usePlannerChat } from "@/components/planner/usePlannerChat";
import { getTodayString } from "@/lib/schedule";

export default function SprintPage() {
  const { tasks, projects } = useDevCalendar();
  const { messages, input, setInput, sendMessage, useQuickAction, latestSuggestions, notice, rerun, makeLighter, reflect, chooseSuggestions, bottomRef, incompleteTasks } = usePlannerChat({ tasks, projects });

  const proposalCount = latestSuggestions.length;
  // 「今日の予定タスク」カード用の集計: scheduledDateが今日で、かつ未完了（statusがdoneでない）タスクの件数
  const todayScheduledTaskCount = tasks.filter((t) => t.scheduledDate === getTodayString() && t.status !== "done").length;

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold text-emerald-700">AI Planner</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">予定アシスタント</h2>
        <p className="mt-2 text-slate-600">Googleカレンダーの空き時間とタスクをもとに、作業予定をチャット形式で提案します。</p>
      </div>

      {/* モバイルでも3列のまま並べる (Issue #37)。縦積みだとカード1枚ずつが巨大になりスクロールが長くなる */}
      <section className="grid grid-cols-3 gap-3 md:gap-4">
        <StatCard label="今日の予定タスク" value={todayScheduledTaskCount} description="今日に配置済みの未完了タスク" />
        <StatCard label="未完了タスク" value={incompleteTasks.length} description="割り振り候補" />
        <StatCard label="提案済み予定" value={proposalCount} description="今日作成した予定案" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">チャット</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">相談内容をそのまま入力してください</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Mock Planner</span>
          </div>

          <div className="mt-4 flex max-h-[34rem] flex-col gap-4 overflow-y-auto pr-1">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onChoose={chooseSuggestions} />
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
            <QuickActionButtons onPick={useQuickAction} />

            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage(input);
              }}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  // 日本語IMEの変換確定Enterでは送信しない (Issue #24)。
                  // 変換中は isComposing が true になる (一部ブラウザは keyCode 229 で判定)
                  if (event.nativeEvent.isComposing || event.keyCode === 229) {
                    return;
                  }
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="例: 今日の空き時間で軽めに進めたい"
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400"
              />
              <button type="submit" className="rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500">
                送信
              </button>
            </form>

            {notice && <p className="text-sm text-emerald-700">{notice}</p>}
          </div>
        </div>

        <div className="grid gap-4 self-start">
          <ScheduleSuggestionCard suggestions={latestSuggestions} onReflect={reflect} onMakeLighter={makeLighter} onRerun={rerun} />

          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            現在は時間帯テンプレートと現在時刻から空き時間を推定するルールベースで提案しています。Google Calendar連携は将来対応予定です。
          </div>
        </div>
      </section>
    </div>
  );
}
