/**
 * lib/due-score.ts: 「期限の緊急度スコア」を1か所に集約したモジュール。
 *
 * 以前は lib/planner.ts（AIプランナーの候補スコア）と lib/top-tasks.ts
 * （ホームの Top3 選定）に同じ加点基準が別々に実装されており、
 * 片方だけ基準を変えると食い違う危険があったため共通化した。
 *
 * 基準（日数差 = 期限 - 基準日）:
 *   - 0日以下（期限切れ・当日） +60
 *   - 1〜2日 +40
 *   - 3〜5日 +20
 *   - それ以外（6日以降）・期限なし・不正な日付 0
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 期限日と基準日（どちらも "YYYY-MM-DD"）から緊急度スコアを返す。
 * 呼び出し元:
 *   - lib/planner.ts の scoreTask（基準日 = 今日のローカル日付）
 *   - lib/top-tasks.ts の scoreTopTask（基準日 = 画面から渡された today）
 * 日付は `${s}T00:00:00`（ローカル時刻の0時）として解釈する。
 */
export function getDueUrgencyScore(
  dueDate: string | null | undefined,
  today: string
): number {
  if (!dueDate) return 0;

  const due = new Date(`${dueDate}T00:00:00`);
  const base = new Date(`${today}T00:00:00`);

  if (Number.isNaN(due.getTime()) || Number.isNaN(base.getTime())) {
    return 0;
  }

  const diffDays = Math.ceil((due.getTime() - base.getTime()) / MS_PER_DAY);

  if (diffDays <= 0) return 60; // 期限切れ・今日締切
  if (diffDays <= 2) return 40; // 2日以内
  if (diffDays <= 5) return 20; // 5日以内
  return 0;
}
