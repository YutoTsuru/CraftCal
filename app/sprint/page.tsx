"use client";

import { useDevCalendar } from "@/components/AppProvider";
import { ChatMessage } from "@/components/planner/ChatMessage";
import { QuickActionButtons } from "@/components/planner/QuickActionButtons";
import { ScheduleSuggestionCard } from "@/components/planner/ScheduleSuggestionCard";
import { usePlannerChat } from "@/components/planner/usePlannerChat";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SprintPage() {
  const { tasks, projects } = useDevCalendar();
  const { messages, input, setInput, sendMessage, useQuickAction, latestSuggestions, notice, rerun, makeLighter, reflect, chooseSuggestions, bottomRef } = usePlannerChat({ tasks, projects });

  return (
    <div className="grid gap-6">
      {/* ページ見出し (Issue #112)。
          以前ここにあった統計カード3枚（今日の予定タスク/未完了タスク/提案済み予定）は削除した。
          このページの主役はチャットで、数字は重複・過剰な情報だったため */}
      <PageHeader title="アシスタント" />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <div className="rounded-xl border border-stone-200 bg-surface/90 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <p className="text-sm font-semibold text-stone-500">チャット</p>
              <p className="mt-1 text-lg font-semibold text-stone-900">相談内容をそのまま入力してください</p>
            </div>
            <span className="rounded-full bg-lime-50 px-3 py-1 text-xs font-medium text-lime-800">Mock Planner</span>
          </div>

          <div className="mt-4 flex max-h-[34rem] flex-col gap-4 overflow-y-auto pr-1">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onChoose={chooseSuggestions} />
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="mt-5 space-y-4 border-t border-stone-100 pt-4">
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
                className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-surface px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-lime-500"
              />
              <button type="submit" className="rounded-2xl bg-lime-700 px-5 py-3 font-semibold text-white transition hover:bg-lime-600">
                送信
              </button>
            </form>

            {notice && <p className="text-sm text-lime-800">{notice}</p>}
          </div>
        </div>

        <div className="grid gap-4 self-start">
          <ScheduleSuggestionCard suggestions={latestSuggestions} onReflect={reflect} onMakeLighter={makeLighter} onRerun={rerun} />

          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-100 p-5 text-sm text-stone-600">
            現在は時間帯テンプレートと現在時刻から空き時間を推定するルールベースで提案しています。Google Calendar連携は将来対応予定です。
          </div>
        </div>
      </section>
    </div>
  );
}
