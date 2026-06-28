"use client";

import { motion } from "framer-motion";
import type { ScheduleSuggestion } from "@/lib/planner";

type Props = {
  suggestions: ScheduleSuggestion[];
  compact?: boolean;
  onReflect?: () => void;
  onMakeLighter?: () => void;
  onRerun?: () => void;
};

export function ScheduleSuggestionCard({ suggestions, compact = false, onReflect, onMakeLighter, onRerun }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">提案された予定</p>
          <p className="mt-1 text-xs text-slate-500">空き時間に合わせた仮プランです</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{suggestions.length}件</span>
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {suggestions.map((item) => (
            <div key={`${item.taskId}-${item.date}-${item.startTime}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-emerald-700">{item.dateLabel}</p>
                <p className="text-sm font-semibold text-slate-900">
                  {item.startTime}〜{item.endTime}
                </p>
                <p className="text-sm text-slate-800">{item.taskTitle}</p>
                <p className="text-xs text-slate-500">
                  {item.projectName} / {item.estimatedMinutes}分
                </p>
                <p className="text-xs text-slate-500">{item.reason}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          まだ提案はありません。チャットで予定の相談をしてください。
        </div>
      )}

      {!compact && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onReflect} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
            この予定を反映する
          </button>
          <button type="button" onClick={onMakeLighter} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            もう少し軽めにする
          </button>
          <button type="button" onClick={onRerun} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            再提案する
          </button>
        </div>
      )}
    </motion.section>
  );
}
