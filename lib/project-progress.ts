import type { Task } from "@/types/dev-calendar";

/**
 * プロジェクトの進捗率(0〜100)を返す純関数 (Issue #112)。
 *
 * 使用箇所: プロジェクト一覧 (app/projects/page.tsx) の進捗バー、
 *           プロジェクト詳細 (app/projects/[projectId]/page.tsx) のゴールカード。
 * 以前は両ページに同じ計算が重複していたため、ここに一本化した。
 *
 * 進捗率 = 完了タスク数 / 全タスク数 * 100（四捨五入）。タスクが 0 件なら 0。
 */
export function getProjectProgress(tasks: Task[], projectId: string): number {
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  if (projectTasks.length === 0) return 0;
  const done = projectTasks.filter((t) => t.status === "done").length;
  return Math.round((done / projectTasks.length) * 100);
}
