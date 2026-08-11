/**
 * lib/due-status.ts: 期限までの残り日数と危険度を求める純関数 (Issue #69)。
 *
 * 役割:
 *   ホームの「期限が近いタスク」と、ヘッダーの「期限間近」カウントが同じ基準で動くようにする。
 *
 * 日付単位で比較する理由:
 *   以前は「期限日の 00:00」と「現在時刻」を引き算していたため、
 *   期限が今日のタスクは差が負になり（15時なら -0.625 日）、一覧からもカウントからも
 *   漏れていた。最も急ぐものが見えなくなるので、時刻を持たない日付同士で比較する。
 *
 * UI対応箇所:
 *   - app/home/page.tsx … 「期限が近いタスク」カードと「期限間近」の StatCard
 */

import type { Task } from "@/types/dev-calendar";

/** 危険度。色とテキストの両方に対応させ、色だけに依存させない */
export type DueSeverity =
  /** 期限を過ぎている */
  | "overdue"
  /** 今日が期限 */
  | "today"
  /** 明日・明後日 */
  | "soon"
  /** それ以降（既定では7日以内） */
  | "upcoming";

export type DueStatus = {
  severity: DueSeverity;
  /** 残り日数。負なら超過している日数 */
  daysLeft: number;
  /** 「今日まで」「あと3日」「2日超過」などの表示用テキスト */
  label: string;
};

/** 「期限が近い」とみなす日数の既定値 */
export const DUE_SOON_WITHIN_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * "YYYY-MM-DD" を、時刻を持たない Date（ローカル 00:00）として解釈する。
 * 解釈できない文字列なら null。
 */
function parseDateOnly(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * 期限日と基準日（通常は今日）から、残り日数を求める。
 * どちらも 00:00 同士なので、時刻による誤差が出ない。
 * 日付として解釈できない場合は null。
 */
export function getDaysLeft(dueDate: string, today: string): number | null {
  const due = parseDateOnly(dueDate);
  const base = parseDateOnly(today);
  if (!due || !base) return null;

  return Math.round((due.getTime() - base.getTime()) / MS_PER_DAY);
}

/**
 * 期限日から危険度と表示テキストを求める。
 * 日付として解釈できない場合は null（呼び出し側は期限なし扱いにする）。
 */
export function getDueStatus(dueDate: string, today: string): DueStatus | null {
  const daysLeft = getDaysLeft(dueDate, today);
  if (daysLeft === null) return null;

  if (daysLeft < 0) {
    return { severity: "overdue", daysLeft, label: `${-daysLeft}日超過` };
  }
  if (daysLeft === 0) {
    return { severity: "today", daysLeft, label: "今日まで" };
  }
  if (daysLeft === 1) {
    return { severity: "soon", daysLeft, label: "明日まで" };
  }
  if (daysLeft === 2) {
    return { severity: "soon", daysLeft, label: "あと2日" };
  }
  return { severity: "upcoming", daysLeft, label: `あと${daysLeft}日` };
}

export type TaskWithDue = { task: Task; due: DueStatus };

/**
 * 「期限が近いタスク」を抽出する。
 *
 * - 完了済みは除く（終わったものを急かしても仕方がない）
 * - **超過しているタスクも含める**。最も急ぐものが一覧から消えるのを防ぐ
 * - 危険な順（残り日数の少ない順）に並べ、同じ日数ならタイトル順で安定させる
 *
 * @param withinDays 何日先までを「近い」とみなすか
 * @param limit 返す最大件数。省略時は制限しない
 */
export function selectDueSoonTasks(
  tasks: Task[],
  today: string,
  { withinDays = DUE_SOON_WITHIN_DAYS, limit }: { withinDays?: number; limit?: number } = {}
): TaskWithDue[] {
  const result: TaskWithDue[] = [];

  for (const task of tasks) {
    if (task.status === "done") continue;
    if (!task.dueDate) continue;

    const due = getDueStatus(task.dueDate, today);
    if (!due) continue;
    if (due.daysLeft > withinDays) continue;

    result.push({ task, due });
  }

  result.sort((a, b) => {
    if (a.due.daysLeft !== b.due.daysLeft) return a.due.daysLeft - b.due.daysLeft;
    return a.task.title.localeCompare(b.task.title, "ja");
  });

  return limit === undefined ? result : result.slice(0, limit);
}
