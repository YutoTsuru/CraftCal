"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ScheduleSuggestion } from "@/lib/planner";
import { SuggestionTimeline } from "@/components/planner/SuggestionTimeline";

type Props = {
  suggestions: ScheduleSuggestion[];
  compact?: boolean;
  onReflect?: () => void;
  onMakeLighter?: () => void;
  onRerun?: () => void;
};

export function ScheduleSuggestionCard({ suggestions, compact = false, onReflect, onMakeLighter, onRerun }: Props) {
  // 提案の表示方法。タイムライン（時間軸ブロック）／リスト（従来のカード羅列）を切り替える。
  // 1日の流れが直感的に分かるタイムラインを既定にする。
  const [view, setView] = useState<"timeline" | "list">("timeline");

  // トグルボタンを出す条件: 提案があり、かつチャット吹き出し内(compact)ではないとき。
  const showToggle = suggestions.length > 0 && !compact;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-stone-200 bg-surface p-5 shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">提案された予定</p>
          <p className="mt-1 text-xs text-stone-500">空き時間に合わせた仮プランです</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 表示切替トグル: タイムライン / リスト。選択中は emerald の塗り。 */}
          {showToggle && (
            <div className="flex rounded-full bg-stone-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setView("timeline")}
                className={`rounded-full px-3 py-1 font-semibold transition ${view === "timeline" ? "bg-emerald-600 text-white" : "text-stone-600"}`}
              >
                タイムライン
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`rounded-full px-3 py-1 font-semibold transition ${view === "list" ? "bg-emerald-600 text-white" : "text-stone-600"}`}
              >
                リスト
              </button>
            </div>
          )}
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">{suggestions.length}件</span>
        </div>
      </div>

      {suggestions.length > 0 ? (
        // compact（チャット吹き出し）は常にリスト表示。それ以外は view の値に従う。
        !compact && view === "timeline" ? (
          <div className="mt-4">
            <SuggestionTimeline suggestions={suggestions} />
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {suggestions.map((item) => (
              <div key={`${item.taskId}-${item.date}-${item.startTime}`} className="rounded-2xl border border-stone-200 bg-stone-100 p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-emerald-700">{item.dateLabel}</p>
                  <p className="text-sm font-semibold text-stone-900">
                    {item.startTime}〜{item.endTime}
                  </p>
                  <p className="text-sm text-stone-800">{item.taskTitle}</p>
                  <p className="text-xs text-stone-500">
                    {item.projectName} / {item.estimatedMinutes}分
                  </p>
                  <p className="text-xs text-stone-500">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-stone-200 bg-stone-100 p-4 text-sm text-stone-500">
          まだ提案はありません。チャットで予定の相談をしてください。
        </div>
      )}

      {!compact && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onReflect} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
            この予定を反映する
          </button>
          <button type="button" onClick={onMakeLighter} className="rounded-full border border-stone-200 bg-surface px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100">
            もう少し軽めにする
          </button>
          <button type="button" onClick={onRerun} className="rounded-full border border-stone-200 bg-surface px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100">
            再提案する
          </button>
        </div>
      )}
    </motion.section>
  );
}
