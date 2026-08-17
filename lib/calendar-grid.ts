/**
 * lib/calendar-grid.ts: カレンダーの格子を組み立てる純関数 (Issue #56)。
 *
 * もともと components/CalendarView.tsx（約1200行）のコンポーネント本体の中に
 * 定義されていた日付ユーティリティを切り出したもの。切り出す理由は3つある。
 *
 *   1. CalendarView から純粋なロジックを剥がし、責務ごとの分割の足がかりにする
 *   2. 月末・年またぎ・週の開始位置といった間違えやすい計算にテストを付ける
 *   3. コンポーネント内の関数だと毎レンダーで別の関数になるため、
 *      useMemo の依存に入れるとメモ化が効かなくなる（react-hooks/exhaustive-deps の
 *      警告が出ていた）。モジュールの外に出せば参照が固定され、警告ごと解消できる
 *
 * 週の開始は日曜（getDay() === 0）。UI のヘッダー（日〜土）と揃えている。
 *
 * 注意: ここは Date（時刻つき）を扱う。日付文字列 "YYYY-MM-DD" 側の計算は
 * lib/schedule.ts の formatDate / getDateRange、期限の残り日数は
 * lib/due-status.ts が担当していて、役割が分かれている。
 */

/** 月の1日（00:00）を返す */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * months か月ぶん進めた月の1日を返す（負の値なら戻る）。
 * 日を1に固定しているので「1月31日の1か月後が3月3日になる」類のずれが起きない。
 */
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** days 日ぶん進めた日付を返す（負の値なら戻る）。元の Date は変更しない */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** 月表示の格子を作るときの週数。どの月でも高さを揃えるため固定する */
export const MONTH_MATRIX_WEEKS = 6;

/** 1週間の日数 */
export const DAYS_PER_WEEK = 7;

/**
 * 月表示用の 6週 × 7日 の格子を作る。
 *
 * 先頭は「その月の1日を含む週の日曜」。前後の月の日がはみ出して入るのは意図通りで、
 * 月によって行数が変わらないよう常に6週ぶん返す（セルの高さが月替わりで動かない）。
 */
export function getMonthMatrix(date: Date): Date[][] {
  const first = startOfMonth(date);
  const start = addDays(first, -first.getDay());

  const matrix: Date[][] = [];
  let cursor = start;

  for (let week = 0; week < MONTH_MATRIX_WEEKS; week++) {
    const row: Date[] = [];
    for (let day = 0; day < DAYS_PER_WEEK; day++) {
      row.push(cursor);
      cursor = addDays(cursor, 1);
    }
    matrix.push(row);
  }

  return matrix;
}

/** 週表示用の、指定日を含む週（日曜〜土曜）の7日を返す */
export function getWeekRange(date: Date): Date[] {
  const start = addDays(date, -date.getDay());
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) => addDays(start, i));
}
