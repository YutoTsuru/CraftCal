/**
 * lib/calendar-interaction.ts: カレンダーの操作まわりの純粋な計算 (Issue #56)。
 *
 * CalendarView.tsx の中で、なぞり選択・バー端ドラッグ・スワイプ判定のロジックが
 * DOM イベントの購読と混ざって書かれていた。判断の部分だけをここへ出すと、
 * ブラウザを立ち上げずに境界条件（開始と終了の逆転、クランプ、しきい値ちょうど）を
 * テストできる。呼び出し側は残ったイベント配線だけになる。
 *
 * 日付はすべて "YYYY-MM-DD"。桁が固定なので文字列の辞書順がそのまま日付順になる
 * （lib/scheduled-time.ts の "HH:MM" と同じ考え方）。
 */

export type DateRange = {
  start: string;
  end: string;
};

/**
 * 2つの日付を「早い方が start」に並べ直す。
 * なぞり選択は右から左へもなぞれるので、確定時に必ず通す。
 */
export function normalizeDateRange(a: string, b: string): DateRange {
  return b < a ? { start: b, end: a } : { start: a, end: b };
}

/**
 * ある日付が範囲に入っているか（両端を含む）。
 */
export function isDateInRange(key: string, range: DateRange | null): boolean {
  if (!range) return false;
  return range.start <= key && key <= range.end;
}

/**
 * セルの選択ハイライトをどの範囲で描くかを決める。
 *
 * 表示源が2つあるのが要点で、優先順位は次のとおり。
 *  1. なぞっている最中（dragStart / dragEnd あり）: その範囲をライブ表示する
 *  2. 指を離した後（範囲選択モード中）: 追加フォームの開始/終了を源にハイライトを残す
 *     → 日付入力で調整してもハイライトが追従する
 * 範囲選択モードを抜けるかフォームを閉じると formStart が消えるので、ハイライトも消える。
 *
 * 終了日が未入力（formEnd が null）のときは開始日だけの1日分として扱う。
 */
export function resolveSelectionRange(args: {
  dragStart: string | null;
  dragEnd: string | null;
  rangeSelecting: boolean;
  formStart: string | null;
  formEnd: string | null;
}): DateRange | null {
  const { dragStart, dragEnd, rangeSelecting, formStart, formEnd } = args;
  if (dragStart && dragEnd) {
    return normalizeDateRange(dragStart, dragEnd);
  }
  if (rangeSelecting && formStart) {
    return normalizeDateRange(formStart, formEnd ?? formStart);
  }
  return null;
}

/**
 * バーの端をドラッグしたときの新しい期間を求める。
 *
 * 掴んでいない側は動かさず、掴んだ側だけをポインタ位置の日付へ寄せる。
 * 追い越して期間が裏返るのを防ぐため、掴んでいない側でクランプする（最小1日）。
 */
export function clampBarDragRange(
  edge: "start" | "end",
  range: DateRange,
  pointerKey: string
): DateRange {
  if (edge === "end") {
    // 終了は開始以降にクランプ
    return { start: range.start, end: pointerKey < range.start ? range.start : pointerKey };
  }
  // 開始は終了以前にクランプ
  return { start: pointerKey > range.end ? range.end : pointerKey, end: range.end };
}

// スワイプと判定する横移動量（px）。これ未満は誤操作とみなして無視する
export const SWIPE_THRESHOLD_PX = 50;

/**
 * スワイプの移動量から期間の送り方向を決める。next=次の期間 / prev=前の期間 / null=無視。
 *
 * 横移動がしきい値以上、かつ縦より横が優勢なときだけ反応する。
 * 縦優勢を弾かないと、ページを縦スクロールしただけで期間が飛んでしまう。
 */
export function getSwipeDirection(
  dx: number,
  dy: number,
  threshold: number = SWIPE_THRESHOLD_PX
): "next" | "prev" | null {
  if (Math.abs(dx) < threshold) return null;
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  // 左へ払う（dx が負）= 次の期間へ進む
  return dx < 0 ? "next" : "prev";
}
