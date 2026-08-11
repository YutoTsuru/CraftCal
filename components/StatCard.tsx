"use client";

import { motion } from "framer-motion";

/**
 * StatCard: 件数などの数値を1つ見せる小さなカード。
 *
 * Issue #69 で可読性を直した:
 *   - ラベルが text-stone-700 と濃く、数値と同じくらい主張していて主従が逆だった
 *     → ラベルを控えめにし、数値を主役にする
 *   - 数字が等幅でなく桁が揃わなかった → tabular-nums で揃える
 *   - rounded-3xl だけ他のカード（rounded-xl）と揃っていなかった
 */

/** 数値の意味づけ。0件のときは既定に戻すため、呼び出し側で出し分ける */
export type StatTone = "default" | "warning" | "danger";

type StatCardProps = {
  label: string;
  value: string | number;
  description?: string;
  tone?: StatTone;
};

// 枠と数値に色を付ける。背景まで塗ると4枚並んだとき賑やかになりすぎるので枠と数値だけ
const TONE_CLASS: Record<StatTone, { card: string; value: string }> = {
  default: { card: "border-stone-200", value: "text-stone-900" },
  warning: { card: "border-amber-300 bg-amber-50/60", value: "text-amber-800" },
  danger: { card: "border-rose-300 bg-rose-50/60", value: "text-rose-800" }
};

export function StatCard({ label, value, description, tone = "default" }: StatCardProps) {
  const toneClass = TONE_CLASS[tone];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`rounded-xl border bg-surface p-4 shadow-sm ${toneClass.card}`}
    >
      {/* ラベルは補足なので控えめに。字間を空けて小さくても読めるようにする */}
      <p className="text-xs font-medium tracking-wide text-stone-500">{label}</p>
      {/* 数値が主役。tabular-nums で桁位置を揃え、4枚並べたときに数字が踊らないようにする */}
      <p className={`mt-1.5 text-3xl font-bold tabular-nums ${toneClass.value}`}>{value}</p>
      {/* 補足説明はモバイルでは非表示（狭い幅で窮屈になるため） */}
      {description && <p className="mt-1 hidden text-xs text-stone-500 md:block">{description}</p>}
    </motion.div>
  );
}
