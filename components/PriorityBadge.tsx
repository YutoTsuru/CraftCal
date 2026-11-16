import React from "react";
import { BADGE_BASE, badgeSizeClass, badgeDotClass } from "@/lib/badge-style";

/**
 * PriorityBadge: タスクの優先度バッジ（色ドット + テキスト）。
 *
 * Issue #69: 英語の生の値を日本語表記にした。
 * Issue #112: 塗りつぶしピルをやめ、色ドット + テキストに変更。
 */

type Priority = "high" | "medium" | "low";

const LABEL: Record<Priority, string> = {
  high: "優先度 高",
  medium: "優先度 中",
  low: "優先度 低"
};

// 高＝注意を引く赤、中＝琥珀、低＝無彩色。低は「急がない」ので色を持たせない
const DOT: Record<Priority, string> = {
  high: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-stone-300"
};

export function PriorityBadge({ priority, size = "sm" }: { priority: Priority; size?: "sm" | "md" }) {
  // 高優先度だけ文字色も赤にして、一覧の中で目に留まるようにする
  const textClass = priority === "high" ? "text-rose-700" : "";

  return (
    <span className={`${BADGE_BASE} ${badgeSizeClass(size)} ${textClass}`}>
      {/* 優先度を示す色ドット（装飾。意味は隣のテキストが担う） */}
      <span className={`${badgeDotClass(size)} ${DOT[priority]}`} aria-hidden="true" />
      {LABEL[priority]}
    </span>
  );
}
