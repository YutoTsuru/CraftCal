// 作業ログから「今週の作業日数」「連続作業日数」を求める純関数 (Issue #112)。
// 以前は components/StatsCard.tsx の useEffect 内に直書きされていたが、
// Home の日付ヘッダー右（「🔥 連続N日 ・ 今週N日」）で使うため、UI から切り離してテストできる形に抽出した。
//
// 【バグ修正の経緯】
// 旧 StatsCard は日付文字列化に `toISOString().slice(0, 10)`（UTC 基準）を使っていた。
// 日本時間(JST, UTC+9)の 0〜9 時台は UTC ではまだ前日になるため、
// 「今日」が前日にズレて連続日数や週境界が狂っていた。
// ここでは lib/schedule.ts の formatDate（ローカル日付）に統一してこのズレを解消している。
import { formatDate } from "@/lib/schedule";
import type { DailyLog } from "@/types/dev-calendar";

/** "YYYY-MM-DD" をローカル時刻の Date に直す（new Date("YYYY-MM-DD") は UTC 解釈になるため使わない） */
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 今週（月曜起点）に作業ログがある日数。同じ日に複数ログがあっても 1 日と数える。
 * 呼び出し元: app/home/page.tsx の日付ヘッダー右側
 */
export function getThisWeekWorkDays(logs: DailyLog[], today: string): number {
  const base = parseLocalDate(today);
  // getDay(): 日=0, 月=1 ... 土=6。月曜からの経過日数は (day + 6) % 7（月=0, 日=6）
  const diffToMonday = (base.getDay() + 6) % 7;
  const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - diffToMonday);
  const mondayStr = formatDate(monday);

  // "YYYY-MM-DD" は文字列比較で日付順になる。today より後（未来）のログは今週に含めない
  const days = new Set(logs.filter((l) => l.date >= mondayStr && l.date <= today).map((l) => l.date));
  return days.size;
}

/**
 * 今日から遡って、ログがある日が何日連続しているか。
 * 今日のログがまだ無ければ 0（昨日までの連続は数えない＝旧 StatsCard と同じ挙動）。
 * 呼び出し元: app/home/page.tsx の日付ヘッダー右側
 */
export function getStreakDays(logs: DailyLog[], today: string): number {
  const logDates = new Set(logs.map((l) => l.date));
  const base = parseLocalDate(today);

  let streak = 0;
  // 無限ループ防止の上限 (旧実装と同じ 365 日)
  for (let i = 0; i < 365; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    if (logDates.has(formatDate(d))) streak++;
    else break;
  }
  return streak;
}
