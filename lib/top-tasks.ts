import type { Task } from "@/types/dev-calendar";

/**
 * lib/top-tasks.ts: ホーム画面 (app/page.tsx) の「今日やるべき Top3」セクション用。
 * 未完了タスクに加点式のスコアを付け、優先して手を付けるべき順に並べ替える。
 * 日付の比較方法は lib/planner.ts の getDueDateScore と揃えている
 * ("YYYY-MM-DD" 文字列を `${s}T00:00:00` として解釈しローカル日付として扱う)。
 */

// 期限が近いほど高得点になるスコア。today基準で日割りする
function getDueDateScore(dueDate: string | null | undefined, today: string): number {
  if (!dueDate) return 0;

  const due = new Date(`${dueDate}T00:00:00`);
  const base = new Date(`${today}T00:00:00`);

  if (Number.isNaN(due.getTime()) || Number.isNaN(base.getTime())) {
    return 0;
  }

  const diffDays = Math.ceil((due.getTime() - base.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return 60; // 期限切れ・今日締切
  if (diffDays <= 2) return 40; // 2日以内
  if (diffDays <= 5) return 20; // 5日以内
  return 0;
}

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

  score += getDueDateScore(task.dueDate, today);

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
