"use client";

import { motion } from "framer-motion";
import type { PlannerMessage, ScheduleSuggestion } from "@/lib/planner";
import { ScheduleSuggestionCard } from "@/components/planner/ScheduleSuggestionCard";

// チャット1件分の吹き出し。assistant の低確信メッセージには A案/B案の選択ボタンを吹き出し下に表示する
export function ChatMessage({
  message,
  onChoose
}: {
  message: PlannerMessage;
  onChoose?: (choice: { label: string; suggestions: ScheduleSuggestion[] }) => void;
}) {
  const isUser = message.role === "user";

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`flex max-w-[92%] flex-col gap-2 sm:max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div className={`rounded-3xl border px-4 py-3 shadow-sm ${isUser ? "border-emerald-500/20 bg-emerald-500 text-white" : "border-stone-200 bg-surface text-stone-800"}`}>
          <p className="whitespace-pre-line text-sm leading-6">{message.content}</p>
          {!isUser && message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-4">
              <ScheduleSuggestionCard suggestions={message.suggestions} compact />
            </div>
          )}
        </div>
        {/* スコア拮抗時の選択ボタン。クリックで反映候補(右カード/タイムライン)を切り替える */}
        {!isUser && message.choices && message.choices.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.choices.map((choice) => (
              <button
                key={choice.label}
                type="button"
                onClick={() => onChoose?.(choice)}
                className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.article>
  );
}
