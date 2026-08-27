import React from "react";
import { BADGE_BASE, badgeSizeClass } from "@/lib/badge-style";

/**
 * PriorityBadge: タスクの優先度バッジ。
 *
 * Issue #69 で直した点:
 *   - `high` / `medium` / `low` と英語の生の値をそのまま出しており、
 *     日本語UIの中で浮くうえ意味が伝わらなかった → 日本語表記にする
 *   - 低優先度が soft-sky（水色）で、Issue #67 の暖色化から取り残されていた
 *     （独自カラー名だったため一括置換から漏れていた）→ 無彩色にする
 */

type Priority = "high" | "medium" | "low";

const LABEL: Record<Priority, string> = {
  high: "優先度 高",
  medium: "優先度 中",
  low: "優先度 低"
};

// 高＝注意を引く赤、中＝琥珀、低＝無彩色。低は「急がない」ので色を持たせない
const TONE: Record<Priority, string> = {
  high: "bg-rose-50 text-rose-700 border-rose-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  low: "bg-stone-100 text-stone-600 border-stone-200"
};

export function PriorityBadge({ priority, size = "sm" }: { priority: Priority; size?: "sm" | "md" }) {
  // 寸法は StatusBadge / WeightBadge と共通（lib/badge-style.ts）
  const base = BADGE_BASE;
  const sizeClass = badgeSizeClass(size);

  return <span className={`${base} ${sizeClass} ${TONE[priority]}`}>{LABEL[priority]}</span>;
}
