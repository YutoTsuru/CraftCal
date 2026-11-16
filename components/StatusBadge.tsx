import React from "react";
import { BADGE_BASE, badgeSizeClass, badgeDotClass } from "@/lib/badge-style";

/**
 * StatusBadge: プロジェクト／タスクの状態バッジ（色ドット + テキスト）。
 *
 * Issue #69: 英語の生の値を日本語表記にした。
 * Issue #112: 塗りつぶしピルをやめ、色ドット + テキストに変更。
 *   done / paused / cancelled は文字色も薄くして視覚的な重みを下げる
 *   （終わった・止まっているものより、動いているものが目立つようにするため）。
 *   doing のラベルは TaskList の select 表記と統一して「進行中」にした。
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
  doing: "進行中",
  done: "完了",
  expired: "期限切れ",
  paused: "保留",
  cancelled: "中止"
};

// ドット色。進行中＝琥珀、完了＝オリーブ、期限切れ＝赤、止まっている系＝無彩色
const PROJECT_DOT: Record<ProjectStatus, string> = {
  active: "bg-amber-500",
  paused: "bg-stone-300",
  done: "bg-lime-600"
};

const TASK_DOT: Record<TaskStatus, string> = {
  todo: "bg-stone-300",
  doing: "bg-amber-500",
  done: "bg-lime-600",
  expired: "bg-rose-500",
  paused: "bg-stone-300",
  cancelled: "bg-stone-300"
};

// 文字色を薄くするタスク状態（重みを下げる）
const TASK_MUTED: ReadonlySet<TaskStatus> = new Set<TaskStatus>(["done", "paused", "cancelled"]);

export function StatusBadge({
  status,
  kind = "task",
  size = "sm"
}: {
  status: Status;
  kind?: "project" | "task";
  size?: "sm" | "md";
}) {
  const isProject = kind === "project";
  const dot = isProject
    ? PROJECT_DOT[status as ProjectStatus]
    : TASK_DOT[status as TaskStatus];
  const label = isProject
    ? PROJECT_LABEL[status as ProjectStatus]
    : TASK_LABEL[status as TaskStatus];
  // プロジェクト側の完了・休止も同様に薄くする
  const muted = isProject
    ? status === "done" || status === "paused"
    : TASK_MUTED.has(status as TaskStatus);
  const textClass = muted ? "text-stone-400" : "";

  return (
    <span className={`${BADGE_BASE} ${badgeSizeClass(size)} ${textClass}`}>
      {/* 状態を示す色ドット。意味は隣のテキストが担うので装飾扱い */}
      <span className={`${badgeDotClass(size)} ${dot ?? "bg-stone-300"}`} aria-hidden="true" />
      {label ?? status}
    </span>
  );
}
