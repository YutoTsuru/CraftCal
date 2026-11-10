"use client";

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

// タスク一覧（リスト表示）。app/projects/[projectId]/page.tsx の2カラムから使われる。
// Issue #112: 1件ずつの独立カード(motion.article + shadow-md)をやめ、
// 1つの枠の中に divide-y で区切った「行リスト」にした。
// カードの連続は視覚的に重く、件数が増えるほどスクロールも長くなるため。
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
    // リスト全体を包む1つの枠（影なし）
    <div className="rounded-xl border border-stone-200 bg-surface">
      <ul className="divide-y divide-stone-100">
        {tasks.map((task) => (
          // 1行 = 1タスク。完了済みは薄く表示する
          <li key={task.id} className={`px-4 py-3 ${task.status === "done" ? "opacity-60" : ""}`}>
            {/* Issue #112: フルード幅では右端固定(justify-between)だとタイトルと操作の間が間延びするため、
                操作をコンテンツ側に寄せた。狭い画面では操作群が下の行に折り返す */}
            <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
              {/* min-w-0 が無いと、長いタイトルが縮まずに操作エリアを押し出す。max-w-3xl で伸びすぎも防ぐ */}
              <div className="min-w-0 max-w-3xl">
                {/* タイトル + バッジを1つの折り返し行にまとめる（高さを揃えるため） */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="min-w-0 break-words text-base font-semibold">{task.title}</h3>
                  <StatusBadge status={task.status} size="sm" />
                  <WeightBadge weight={task.weight} />
                  {task.priority && <PriorityBadge priority={task.priority as TaskPriority} />}
                </div>
                {task.memo && <p className={`mt-1 break-words text-sm text-stone-700 ${task.status === "done" ? "line-through" : ""}`}>{task.memo}</p>}

                {/* 期限 / 予定日 / 見積 */}
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
                  {task.dueDate && <div>期限: {task.dueDate}</div>}
                  {task.scheduledDate && <div>予定日: {task.scheduledDate}</div>}
                  {typeof task.estimatedMinutes === "number" && <div>見積: {Math.round(task.estimatedMinutes / 60 * 10) / 10}h</div>}
                </div>
              </div>

              {/* コンテンツ直後の操作エリア: ステータス変更 / 編集 / 削除。
                  行リスト化に合わせて高さを h-9 に下げた (Issue #14 の h-11 から。モーダル内は別) */}
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {/* ステータス変更のドロップダウン。変更すると即保存される */}
                <select
                  value={task.status}
                  onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskStatus)}
                  className="h-9 rounded-xl border border-stone-200 bg-surface px-2 text-sm text-stone-900 outline-none"
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
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-stone-700 transition hover:border-lime-500/50 hover:bg-lime-100 hover:text-lime-700"
                    aria-label="タスクを編集"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {/* 削除ボタン（ゴミ箱アイコン） */}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-stone-700 transition hover:border-rose-400/50 hover:bg-rose-100 hover:text-rose-600"
                  aria-label="タスクを削除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
