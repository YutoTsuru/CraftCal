/**
 * lib/badge-style.ts: バッジ（色ドット + テキスト）の見た目を1箇所に決める。
 * Issue #112: UIリデザイン。
 *
 * 旧: 塗りつぶしピル（背景色 + 枠 + padding）。3種類のバッジが並ぶと
 *     色面が多くてうるさく、padding の重複で高さも揃いにくかった。
 * 新: 小さな色ドット + 素のテキスト。色は「意味を示す小さな印」に絞り、
 *     箱を持たないので padding の重複問題もなくなる。
 *
 * whitespace-nowrap は、「優先度 高」のように空白を含むラベルが
 * 狭い幅で途中改行されて行の高さが崩れるのを防ぐため。
 */

// StatusBadge / PriorityBadge / WeightBadge 共通のルート要素クラス
export const BADGE_BASE =
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium text-stone-600";

// 文字サイズ。sm = 一覧の行内、md = 詳細などやや大きく見せたい場所
export function badgeSizeClass(size: "sm" | "md"): string {
  return size === "md" ? "text-sm" : "text-xs";
}

// 色ドットの寸法クラス（色は各バッジが bg-xxx で別途指定する）。
// 各バッジ側では <span className={`${badgeDotClass(size)} bg-...`} aria-hidden="true" /> と使う
export function badgeDotClass(size: "sm" | "md"): string {
  return size === "md" ? "h-2 w-2 rounded-full" : "h-1.5 w-1.5 rounded-full";
}
