"use client";

import { motion } from "framer-motion";
import type { PlannerMessage } from "@/lib/planner";
import { ScheduleSuggestionCard } from "@/components/planner/ScheduleSuggestionCard";

export function ChatMessage({ message }: { message: PlannerMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[92%] rounded-3xl border px-4 py-3 shadow-sm sm:max-w-[80%] ${isUser ? "border-emerald-500/20 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-800"}`}>
        <p className="whitespace-pre-line text-sm leading-6">{message.content}</p>
        {!isUser && message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-4">
            <ScheduleSuggestionCard suggestions={message.suggestions} compact />
          </div>
        )}
      </div>
    </motion.article>
  );
}
