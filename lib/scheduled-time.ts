/**
 * lib/scheduled-time.ts: 予定の開始/終了時刻（Issue #51）の表示と検証。
 *
 * 時刻は "HH:MM" の文字列（<input type="time"> の値そのまま）で、
 * どちらも任意。両方 null なら「時刻なし＝終日扱い」で、これまでの挙動と同じ。
 *
 * 表示（formatScheduledTimeRange）は CalendarView.tsx と TodayList.tsx に
 * 同じ関数が別々に書かれていたので、ここへ寄せて 1 つにした。
 * 検証（validateScheduledTimeRange）はカレンダーの追加フォーム・編集フォーム・
 * TaskInput の 3 箇所から呼ぶ。
 */

/**
 * 開始/終了時刻を "HH:MM–HH:MM" 形式にする。
 * 片方だけ入力されていればその時刻だけ返し、どちらも無ければ null
 * （呼び出し側は null のとき時刻行そのものを描画しない）。
 */
export function formatScheduledTimeRange(start?: string | null, end?: string | null): string | null {
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  if (end) return end;
  return null;
}

/**
 * 開始時刻と終了時刻の前後関係を検証する。
 * 問題があればエラー文言を、無ければ null を返す（呼び出し側はそのまま画面に出す）。
 *
 * "HH:MM" は桁が固定なので、文字列の辞書順比較がそのまま時刻の前後比較になる
 * （"09:30" < "10:00"）。既存の日付検証（"終了日は開始日以降〜"）と同じ考え方。
 *
 * 同時刻（開始 = 終了）は所要 0 分の予定として許可する。禁止すると、
 * 「10:00 の打ち合わせ」のように時点だけ決めたいケースが入力できなくなるため。
 * 片方だけの入力も許可する（開始だけ決まっている予定は普通にあるため）。
 */
export function validateScheduledTimeRange(start?: string | null, end?: string | null): string | null {
  if (!start || !end) return null;
  if (start > end) return "終了時刻は開始時刻以降にしてください";
  return null;
}
