import React from "react";
import { BADGE_BASE, badgeSizeClass, badgeDotClass } from "@/lib/badge-style";
import type { TaskWeight } from "@/types/dev-calendar";

/**
 * WeightBadge: タスクの重さバッジ（色ドット + テキスト）。
 *
 * 抽出前は TaskList.tsx と TaskBoard.tsx に同じラベル表と色表が別々に置かれ、
 * TodayList.tsx は別の言い回しで素のテキストだった。同じ意味のものが画面ごとに
 * 違う見た目になっていたので、ここに1つだけ置く。
 *
 * Issue #112: 塗りつぶしピルをやめ、色ドット + テキストに変更。
 * 見た目の共通部分は StatusBadge / PriorityBadge と同じ lib/badge-style.ts から取る。
 */

// 言い回しは「軽め / 普通 / 重め」に統一する。
// 入力フォームの <option>（TaskInput / カレンダーの追加・編集）と同じ語にしている
const LABEL: Record<TaskWeight, string> = {
  light: "軽め",
  medium: "普通",
  heavy: "重め"
};

// ドット色。軽い＝無彩色、普通＝オリーブ、重い＝橙。重いほど目に留まるようにする
const DOT: Record<TaskWeight, string> = {
  light: "bg-stone-300",
  medium: "bg-lime-500",
  heavy: "bg-orange-500"
};

export function WeightBadge({ weight, size = "sm" }: { weight: TaskWeight; size?: "sm" | "md" }) {
  return (
    <span className={`${BADGE_BASE} ${badgeSizeClass(size)}`}>
      {/* 重さを示す色ドット（装飾。意味は隣のテキストが担う） */}
      <span className={`${badgeDotClass(size)} ${DOT[weight]}`} aria-hidden="true" />
      {LABEL[weight]}
    </span>
  );
}
