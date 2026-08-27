"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import { useDevCalendarActions } from "@/components/AppProvider";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { WeightBadge } from "@/components/WeightBadge";
import type { Task, TaskStatus, TaskPriority } from "@/types/dev-calendar";

// ユーザーが手動で設定できるステータスのみ選択肢に出す
// (expired / paused / cancelled は将来の自動遷移用で、手動設定は想定しない)
const statusLabels: Partial<Record<TaskStatus, string>> = {
  todo: "未着手",
  doing: "進行中",
  done: "完了"
};

export function TaskList({ tasks, onEdit }: { tasks: Task[]; onEdit?: (task: Task) => void }) {
  // Issue #48: 表示するタスクは props で受け取り、ここではアクションしか使わないため
  // actions だけを購読する。
  // Issue #48 (レビュー指摘対応): context の state 購読をやめたので context 経由では再描画されない。
  // ただし親から tasks 配列を props で受け取っており、親が再レンダリングされれば
  // このコンポーネントも一緒に再描画される（tasks が毎回新しい配列参照になるため React.memo は付けていない）。
  const { deleteTask, updateTaskStatus } = useDevCalendarActions();

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-200 bg-surface p-6 text-center text-stone-700">
        まだタスクがありません。まずは小さめの作業から追加してみてください。
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <AnimatePresence>
        {tasks.map((task) => (
          <motion.article
            key={task.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className={`rounded-xl border border-stone-200 bg-surface p-5 shadow-md ${
              task.status === "done" ? "opacity-60" : ""
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
              {/* min-w-0 が無いと、長いタイトルが縮まずに右の操作エリアを押し出す */}
              <div className="min-w-0 flex-1">
                {/* バッジ行。以前は「タイトル＋状態」と「重さ＋優先度」の2組を横並びにしつつ、
                    後者にだけ mt-2 が付いていた。横並びのままだと後者だけ 8px 下がって
                    バッジの高さが揃わなかったので、1つの折り返し行にまとめる */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                  <h3 className="min-w-0 break-words text-lg font-semibold">{task.title}</h3>
                  <StatusBadge status={task.status} size="sm" />
                  <WeightBadge weight={task.weight} />
                  {task.priority && <PriorityBadge priority={task.priority as TaskPriority} />}
                </div>
                {task.memo && <p className={`mt-3 break-words text-sm text-stone-700 ${task.status === "done" ? "line-through" : ""}`}>{task.memo}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
                  {task.dueDate && <div>期限: {task.dueDate}</div>}
                  {task.scheduledDate && <div>予定日: {task.scheduledDate}</div>}
                  {typeof task.estimatedMinutes === "number" && <div>見積: {Math.round(task.estimatedMinutes / 60 * 10) / 10}h</div>}
                </div>
              </div>

              {/* カード右側の操作エリア: ステータス変更 / 編集 / 削除。
                  各ボタンは高さ44px (h-11) 基準で、スマホの指でも押しやすくしている (Issue #14) */}
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {/* ステータス変更のドロップダウン。変更すると即保存される */}
                <select
                  value={task.status}
                  onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskStatus)}
                  className="min-h-11 rounded-xl border border-stone-200 bg-surface px-3 py-2 text-sm text-stone-900 outline-none"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {/* 編集ボタン（鉛筆アイコン）。onEdit を渡された画面でのみ表示され、
                    押すと画面上部の入力フォームが編集モードに切り替わる */}
                {onEdit && (
                  <button
                    onClick={() => onEdit(task)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-stone-700 transition hover:border-lime-500/50 hover:bg-lime-100 hover:text-lime-700"
                    aria-label="タスクを編集"
                  >
                    <Pencil size={18} />
                  </button>
                )}
                {/* 削除ボタン（ゴミ箱アイコン） */}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-stone-700 transition hover:border-rose-400/50 hover:bg-rose-100 hover:text-rose-600"
                  aria-label="タスクを削除"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </AnimatePresence>
    </div>
  );
}
