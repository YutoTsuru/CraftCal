/**
 * lib/daily-capacity.ts: 「1日の作業時間（容量）」の設定と、今日リストの絞り込み (Issue #112)。
 *
 * 役割:
 *   「1日に11件も並ぶと多すぎる」というフィードバックへの対応。
 *   ユーザーが決めた1日の作業時間に収まる範囲だけを Home の「今日」に出し、残りは折りたたむ。
 *
 * 保存先:
 *   端末ごとの好みなので DB ではなく localStorage に置く（スキーマ変更なし）。
 *
 * UI対応箇所:
 *   - app/settings/page.tsx … 「作業時間の目安」入力（setDailyCapacityHours）
 *   - components/home/TodaySection.tsx … 読み込み（getDailyCapacityHours）と絞り込み（selectWithinCapacity）
 */

import type { Task, TaskWeight } from "@/types/dev-calendar";

/** 既定の1日の作業時間（時間） */
export const DEFAULT_DAILY_CAPACITY_HOURS = 3;

/** 設定できる範囲（時間） */
const MIN_CAPACITY_HOURS = 0.5;
const MAX_CAPACITY_HOURS = 12;

/** localStorage のキー */
const STORAGE_KEY = "craftcal-daily-capacity-hours";

/** 容量を超えていても必ず表示する最低件数（Top3 を隠さないため） */
const MIN_VISIBLE_COUNT = 3;

/** 見積未入力でも重さから概算するための換算表（分） */
const WEIGHT_MINUTES: Record<TaskWeight, number> = {
  light: 30,
  medium: 60,
  heavy: 120
};

/** 範囲 0.5〜12 に収める。数値でない・有限でない値は既定値にする */
export function clampCapacityHours(value: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_DAILY_CAPACITY_HOURS;
  return Math.min(MAX_CAPACITY_HOURS, Math.max(MIN_CAPACITY_HOURS, value));
}

/** 保存済みの容量（時間）を読む。未保存・不正値・localStorage 使用不可なら既定値 */
export function getDailyCapacityHours(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_DAILY_CAPACITY_HOURS;
    return clampCapacityHours(Number(raw));
  } catch {
    // プライベートモード等で localStorage が使えない場合は既定値で動かす
    return DEFAULT_DAILY_CAPACITY_HOURS;
  }
}

/** 容量（時間）を保存する。範囲外はクランプ、不正値は既定値として保存する */
export function setDailyCapacityHours(hours: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(clampCapacityHours(hours)));
  } catch {
    // 保存できなくても画面操作は止めない
  }
}

/**
 * タスク1件の所要時間（分）。
 * 見積(estimatedMinutes)があればそれを使い、未入力でも重さから概算する（容量計算を止めないため）。
 */
export function estimateTaskMinutes(task: Task): number {
  if (typeof task.estimatedMinutes === "number" && task.estimatedMinutes > 0) {
    return task.estimatedMinutes;
  }
  return WEIGHT_MINUTES[task.weight] ?? WEIGHT_MINUTES.medium;
}

/**
 * 入力順を保ったまま、先頭から累積所要時間が容量以内の間だけ visible に積む。
 * - 最低 3 件は容量を超えても visible に入れる（Top3 は必ず見せる）
 * - 完了済みは容量を消費しない（もう終わった作業で枠を埋めない）
 * - 一度超えたら以降は hidden（順序が飛ばないよう、小さいタスクの後詰めはしない）
 */
export function selectWithinCapacity(
  tasks: Task[],
  capacityHours: number
): { visible: Task[]; hidden: Task[] } {
  const limitMinutes = capacityHours * 60;
  const visible: Task[] = [];
  const hidden: Task[] = [];
  let used = 0;
  let overflowed = false;

  for (const task of tasks) {
    const minutes = task.status === "done" ? 0 : estimateTaskMinutes(task);
    if (!overflowed && (visible.length < MIN_VISIBLE_COUNT || used + minutes <= limitMinutes)) {
      visible.push(task);
      used += minutes;
    } else {
      overflowed = true;
      hidden.push(task);
    }
  }

  return { visible, hidden };
}
