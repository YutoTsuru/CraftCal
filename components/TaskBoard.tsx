"use client";

/**
 * TaskBoard: /tasks のカンバン表示 (Issue #5)。
 * ステータス (未着手/進行中/完了) の3列でタスクを並べ、
 * カード下部の「← 前へ / 次へ →」ボタンで隣の列に移動できる (D&Dはやらない)。
 * 選択は app/tasks/page.tsx のビュー切替タブ (list / board) で行う。
 */

import { useDevCalendarActions } from "@/components/AppProvider";
import { PriorityBadge } from "@/components/PriorityBadge";
import { WeightBadge } from "@/components/WeightBadge";
import type { Task, TaskStatus, TaskPriority } from "@/types/dev-calendar";

// カンバンの列順序。この配列のインデックスで「前へ/次へ」の移動先を決める
const statusOrder: TaskStatus[] = ["todo", "doing", "done"];

// statusOrder には todo/doing/done しか入らないが、型は TaskStatus のままなので
// Partial にしておき (TaskList.tsx の statusLabels と同じ考え方)、未使用のステータスは持たない
const statusLabels: Partial<Record<TaskStatus, string>> = {
  todo: "未着手",
  doing: "進行中",
  done: "完了"
};

export function TaskBoard({ tasks }: { tasks: Task[] }) {
  // Issue #48: 表示するタスクは props で受け取り、ここでは updateTaskStatus しか使わないため
  // actions だけを購読する。
  // Issue #48 (レビュー指摘対応): context の state 購読をやめたので context 経由では再描画されない。
  // ただし親（app/tasks/page.tsx）から tasks 配列を props で受け取っており、
  // 親が再レンダリングされればこのコンポーネントも一緒に再描画される（React.memo は付けていない）。
  const { updateTaskStatus } = useDevCalendarActions();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {statusOrder.map((status, columnIndex) => {
        const columnTasks = tasks.filter((task) => task.status === status);
        const prevStatus = columnIndex > 0 ? statusOrder[columnIndex - 1] : null;
        const nextStatus = columnIndex < statusOrder.length - 1 ? statusOrder[columnIndex + 1] : null;

        return (
          <div key={status} className="rounded-xl bg-stone-100/80 p-3">
            {/* 列ヘッダー: ステータスの日本語ラベルと件数バッジ */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-stone-800">{statusLabels[status]}</h3>
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">
                {columnTasks.length}
              </span>
            </div>

            {columnTasks.length === 0 ? (
              <p className="text-sm text-stone-400">タスクなし</p>
            ) : (
              <div className="grid gap-3">
                {columnTasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-lg border border-stone-200 bg-surface p-4 shadow-sm"
                  >
                    {/* 長いタイトルはカード幅で折り返す（列が狭いので truncate だと読めない） */}
                    <h4
                      className={`break-words font-medium ${
                        task.status === "done" ? "text-stone-500 line-through opacity-60" : "text-stone-900"
                      }`}
                    >
                      {task.title}
                    </h4>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <WeightBadge weight={task.weight} />
                      {task.priority && <PriorityBadge priority={task.priority as TaskPriority} />}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
                      {typeof task.estimatedMinutes === "number" && (
                        <div>{Math.round((task.estimatedMinutes / 60) * 10) / 10}h</div>
                      )}
                      {task.dueDate && <div>期限: {task.dueDate}</div>}
                    </div>

                    {/* 列移動ボタン: 先頭列には←を、末尾列には→を出さない */}
                    <div className="mt-4 flex items-center gap-2">
                      {prevStatus && (
                        <button
                          onClick={() => updateTaskStatus(task.id, prevStatus)}
                          className="min-h-11 flex-1 rounded-lg border border-stone-200 bg-stone-100 px-2 text-sm text-stone-700 transition hover:border-lime-500/50 hover:bg-lime-100 hover:text-lime-700"
                        >
                          ← 前へ
                        </button>
                      )}
                      {nextStatus && (
                        <button
                          onClick={() => updateTaskStatus(task.id, nextStatus)}
                          className="min-h-11 flex-1 rounded-lg border border-stone-200 bg-stone-100 px-2 text-sm text-stone-700 transition hover:border-lime-500/50 hover:bg-lime-100 hover:text-lime-700"
                        >
                          次へ →
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
