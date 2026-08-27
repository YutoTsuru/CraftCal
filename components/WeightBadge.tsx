import React from "react";
import { BADGE_BASE, badgeSizeClass } from "@/lib/badge-style";
import type { TaskWeight } from "@/types/dev-calendar";

/**
 * WeightBadge: タスクの重さバッジ。
 *
 * 抽出前は TaskList.tsx と TaskBoard.tsx に同じラベル表と色表が別々に置かれ、
 * ピルの padding だけが両者で違っていた（px-3 py-1 と px-2 py-0.5）。
 * さらに TodayList.tsx は「軽い / 普通 / 重い」という別の言い回しで、
 * ピルにもせず素のテキストで出していた。
 * 同じ意味のものが画面ごとに違う見た目になっていたので、ここに1つだけ置く。
 *
 * 寸法は StatusBadge / PriorityBadge と同じ lib/badge-style.ts から取るので、
 * 3種類のバッジが横に並んだときに高さが揃う。
 */

// 言い回しは「軽め / 普通 / 重め」に統一する。
// 入力フォームの <option>（TaskInput / カレンダーの追加・編集）と同じ語にしている
const LABEL: Record<TaskWeight, string> = {
  light: "軽め",
  medium: "普通",
  heavy: "重め"
};

// 軽い＝無彩色、普通＝オリーブ、重い＝橙。重いほど目に留まるようにする
const TONE: Record<TaskWeight, string> = {
  light: "border-stone-400/40 bg-stone-100 text-stone-700",
  medium: "border-lime-500/40 bg-lime-50 text-lime-800",
  heavy: "border-orange-400/40 bg-orange-50 text-orange-700"
};

export function WeightBadge({ weight, size = "sm" }: { weight: TaskWeight; size?: "sm" | "md" }) {
  return <span className={`${BADGE_BASE} ${badgeSizeClass(size)} ${TONE[weight]}`}>{LABEL[weight]}</span>;
}
