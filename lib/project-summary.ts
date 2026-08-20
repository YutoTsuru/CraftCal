/**
 * lib/project-summary.ts: プロジェクトを一覧で要約表示するための純関数 (Issue #81)。
 *
 * 役割:
 *   - 説明文(Markdown)から、カードに載せるプレーンテキストの抜粋を作る
 *
 * 抜粋をプレーンテキストにする理由:
 *   一覧カードは <Link> がカード全体を包んでいる。そこで Markdown を描画すると
 *   説明文中のリンクが <a> になり、<a> の入れ子という不正なHTMLになる。
 *   React の hydration エラーを招き、カード全体のタップが効かなくなる。
 *   2行に省略される場所で見出しや強調を再現する意味も薄いため、記法を落とす。
 */

/** カードに載せる抜粋の既定の長さ（全角で読みやすい程度） */
export const EXCERPT_MAX_LENGTH = 120;

/**
 * Markdown からプレーンテキストの抜粋を作る。
 *
 * 完全な Markdown パーサではなく、一覧の1〜2行に収めるための割り切った処理。
 * 記法を落として本文だけを残し、空白をまとめて指定長で切る。
 */
export function toPlainTextExcerpt(
  markdown: string | null | undefined,
  maxLength: number = EXCERPT_MAX_LENGTH
): string {
  if (!markdown) return "";

  const text = markdown
    // コードブロックは中身ごと落とす（一覧に出しても読めない）
    .replace(/```[\s\S]*?```/g, " ")
    // 画像は本文ではないので丸ごと落とす。リンクより先に処理する（![]() が []() を含むため）
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    // リンクは表示テキストだけ残す
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // 行頭の記法（見出し・引用・箇条書き・番号付き）を落とす
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]*>[ \t]?/gm, "")
    .replace(/^[ \t]*[-*+][ \t]+/gm, "")
    .replace(/^[ \t]*\d+\.[ \t]+/gm, "")
    // 水平線
    .replace(/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, " ")
    // 強調とインラインコードの記号だけ外す
    .replace(/(\*\*|__|\*|_|`)/g, "")
    // 改行を含む連続空白を1つにまとめる
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  // 末尾の空白を落としてから省略記号を付ける
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
