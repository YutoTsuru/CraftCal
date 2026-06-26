"use client";

import { useDevCalendar } from "@/components/AppProvider";
import { StatCard } from "@/components/StatCard";
import { ChatMessage } from "@/components/planner/ChatMessage";
import { QuickActionButtons } from "@/components/planner/QuickActionButtons";
import { ScheduleSuggestionCard } from "@/components/planner/ScheduleSuggestionCard";
import { usePlannerChat } from "@/components/planner/usePlannerChat";

const previewSuggestions = [
  { time: "19:00〜20:00", taskName: "MVP作成", projectName: "CraftCal", estimatedMinutes: 60, reason: "進行中タスクのため優先" },
  { time: "20:10〜20:40", taskName: "README整理", projectName: "CraftCal", estimatedMinutes: 30, reason: "短時間で完了しやすい" }
];

export default function SprintPage() {
  const { tasks, projects } = useDevCalendar();
  const { messages, input, setInput, sendMessage, useQuickAction, latestSuggestions, notice, rerun, makeLighter, reflect, bottomRef, incompleteTasks } = usePlannerChat({ tasks, projects });

  const proposalCount = messages.filter((message) => message.role === "assistant" && (message.suggestions?.length ?? 0) > 0).length;

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold text-emerald-700">AI Planner</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">予定アシスタント</h2>
        <p className="mt-2 text-slate-600">Googleカレンダーの空き時間とタスクをもとに、作業予定をチャット形式で提案します。</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="今日の空き時間" value="3h 30m" description="Google Calendar連携予定" />
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
              <ChatMessage key={message.id} message={message} />
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
          <ScheduleSuggestionCard suggestions={latestSuggestions.length > 0 ? latestSuggestions : previewSuggestions} onReflect={reflect} onMakeLighter={makeLighter} onRerun={rerun} />

          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            Google Calendarの空き時間取得、CraftCalタスクの詳細フィルタ、AI API接続は後から差し込めるようにしています。
          </div>
        </div>
      </section>
    </div>
  );
}
