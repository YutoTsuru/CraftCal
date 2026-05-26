import React from "react";

type Priority = "high" | "medium" | "low";

export function PriorityBadge({ priority, size = "sm" }: { priority: Priority; size?: "sm" | "md" }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
  const map: Record<Priority, string> = {
    high: "bg-soft-rose/10 text-soft-rose border border-soft-rose/20",
    medium: "bg-accent-amber/10 text-accent-amber border border-accent-amber/20",
    low: "bg-soft-sky/10 text-soft-sky border border-soft-sky/20"
  };

  const sizeClass = size === "md" ? "text-sm px-3 py-1" : "text-xs";

  return <span className={`${base} ${sizeClass} ${map[priority]}`}>{priority}</span>;
}
