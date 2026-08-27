/**
 * lib/badge-style.ts: バッジ（丸いピル）の寸法を1箇所に決める。
 *
 * 状態・優先度・重さのバッジは横並びで出ることが多いのに、それぞれ別の
 * padding で書かれていた（px-2 py-0.5 / px-2.5 py-1 / px-3 py-1 の3種類）。
 * 高さと幅が揃わないため、並ぶと段差になって行が汚れていた。
 * 色は意味ごとに違ってよいが、寸法は共通にする。
 *
 * whitespace-nowrap を入れているのは、「優先度 高」のように空白を含むラベルが
 * 狭い幅で途中改行され、ピルが2行になって行の高さが崩れるのを防ぐため。
 */

export const BADGE_BASE =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 font-medium";

export function badgeSizeClass(size: "sm" | "md"): string {
  return size === "md" ? "px-3 py-1.5 text-sm" : "text-xs";
}
