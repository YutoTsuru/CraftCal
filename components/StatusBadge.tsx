import React from "react";

/**
 * StatusBadge: プロジェクト／タスクの状態バッジ。
 *
 * Issue #69 で直した点:
 *   - `todo` / `doing` / `active` と英語の生の値をそのまま出していた → 日本語表記にする
 *   - accent-blue（青）・accent-purple（紫）が Issue #67 の暖色化から取り残されていた
 *     （独自カラー名だったため一括置換から漏れていた）→ 暖色・無彩色へ
 */

type ProjectStatus = "active" | "paused" | "done";
type TaskStatus = "todo" | "doing" | "done" | "expired" | "paused" | "cancelled";

export type Status = ProjectStatus | TaskStatus;

const PROJECT_LABEL: Record<ProjectStatus, string> = {
  active: "進行中",
  paused: "休止中",
  done: "完了"
};

const TASK_LABEL: Record<TaskStatus, string> = {
  todo: "未着手",
  doing: "作業中",
  done: "完了",
  expired: "期限切れ",
  paused: "保留",
  cancelled: "中止"
};

// 進行中＝琥珀（動いている）、完了＝オリーブ（アクセント）、止まっている系＝無彩色
const PROJECT_TONE: Record<ProjectStatus, string> = {
  active: "bg-amber-50 text-amber-800 border-amber-200",
  paused: "bg-stone-100 text-stone-500 border-stone-200",
  done: "bg-lime-50 text-lime-800 border-lime-200"
};

const TASK_TONE: Record<TaskStatus, string> = {
  todo: "bg-stone-100 text-stone-700 border-stone-200",
  doing: "bg-amber-50 text-amber-800 border-amber-200",
  done: "bg-lime-50 text-lime-800 border-lime-200",
  expired: "bg-rose-50 text-rose-700 border-rose-200",
  paused: "bg-stone-100 text-stone-500 border-stone-200",
  cancelled: "bg-stone-100 text-stone-400 border-stone-200"
};

export function StatusBadge({
  status,
  kind = "task",
  size = "sm"
}: {
  status: Status;
  kind?: "project" | "task";
  size?: "sm" | "md";
}) {
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 font-medium";
  const sizeClass = size === "md" ? "text-sm px-3 py-1" : "text-xs";

  const isProject = kind === "project";
  const tone = isProject
    ? PROJECT_TONE[status as ProjectStatus]
    : TASK_TONE[status as TaskStatus];
  const label = isProject
    ? PROJECT_LABEL[status as ProjectStatus]
    : TASK_LABEL[status as TaskStatus];

  return <span className={`${base} ${sizeClass} ${tone}`}>{label ?? status}</span>;
}
