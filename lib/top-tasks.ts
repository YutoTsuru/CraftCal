import type { Task } from "@/types/dev-calendar";
import { getDueUrgencyScore } from "@/lib/due-score";

/**
 * lib/top-tasks.ts: ホーム画面 (app/page.tsx) の「今日やるべき Top3」セクション用。
 * 未完了タスクに加点式のスコアを付け、優先して手を付けるべき順に並べ替える。
 * 期限スコアの計算は lib/due-score.ts の getDueUrgencyScore を
 * lib/planner.ts と共有している（基準を1か所に集約）。
 */

// 1タスク分の優先度スコアを計算する（加点式）
function scoreTopTask(task: Task, today: string): number {
  let score = 0;

  if (task.status === "doing") {
    score += 30;
  }

  if (task.priority === "high") {
    score += 30;
  } else if (task.priority === "medium") {
    score += 15;
  }

  // 期限スコアは planner.ts と共通（lib/due-score.ts）
  score += getDueUrgencyScore(task.dueDate, today);

  if (task.scheduledDate === today) {
    score += 25;
  }

  return score;
}

/**
 * 「今日やるべき Top3」として表示するタスクを選ぶ。
 * - status === "done" のタスクは対象外
 * - スコア降順。同点は createdAt 昇順（古いタスクを先に出す）
 * - 上位 limit 件（デフォルト3件）だけ返す
 */
export function selectTopTasks(tasks: Task[], today: string, limit = 3): Task[] {
  return tasks
    .filter((task) => task.status !== "done")
    .map((task) => ({ task, score: scoreTopTask(task, today) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.task.createdAt.localeCompare(b.task.createdAt);
    })
    .slice(0, limit)
    .map((entry) => entry.task);
}
