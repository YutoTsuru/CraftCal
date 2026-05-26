import React from "react";

type ProjectStatus = "active" | "paused" | "done";
type TaskStatus = "todo" | "doing" | "done";

export type Status = ProjectStatus | TaskStatus;

export function StatusBadge({
  status,
  kind = "task",
  size = "sm"
}: {
  status: Status;
  kind?: "project" | "task";
  size?: "sm" | "md";
}) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";

  const projectMap: Record<ProjectStatus, string> = {
    active: "bg-accent-blue/10 text-accent-blue border border-accent-blue/20",
    paused: "bg-accent-amber/10 text-accent-amber border border-accent-amber/20",
    done: "bg-accent-purple/10 text-accent-purple border border-accent-purple/20"
  };

  const taskMap: Record<TaskStatus, string> = {
    todo: "bg-slate-50 text-slate-700 border border-slate-100",
    doing: "bg-accent-blue/10 text-accent-blue border border-accent-blue/20",
    done: "bg-emerald-50 text-emerald-700 border border-emerald-100"
  };

  const sizeClass = size === "md" ? "text-sm px-3 py-1" : "text-xs";

  const cls = kind === "project" ? projectMap[status as ProjectStatus] : taskMap[status as TaskStatus];

  return <span className={`${base} ${sizeClass} ${cls}`}>{status}</span>;
}
