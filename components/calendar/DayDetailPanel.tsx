"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useDevCalendar } from "@/components/AppProvider";
import TaskCard from "@/components/calendar/TaskCard";
import TaskEditForm from "@/components/calendar/TaskEditForm";
import DayTaskAddForm, { type DayRangeBinding } from "@/components/calendar/DayTaskAddForm";
import type { Task } from "@/types/dev-calendar";

type Props = {
  dateKey: string;
  tasks: Task[];
  onClose: () => void;
  range: DayRangeBinding;
  /** 追加フォームを開くとき: 親側で開始日を選択日に初期化する */
  onOpenAddForm: () => void;
  /** 追加フォームを閉じるとき: 親側の期間・なぞり選択モードを後始末する */
  onCloseAddForm: () => void;
};

/**
 * 選択した日のタスク一覧パネル (Issue #38/#42/#44。Issue #56 で CalendarView.tsx から抽出)。
 *
 * 一覧・編集・追加の3つをまとめる器で、編集フォームと追加フォームは別コンポーネントに分けてある。
 * 「どのタスクを編集中か」はこのパネルの中だけの関心なので、ここで持つ。
 * 追加フォームの開閉もここで持つが、期間だけはカレンダーのハイライトと源を共有するため
 * 親（CalendarView）から range で受け渡す。
 *
 * 対応するUI: /calendar ページでカレンダーの日付をクリックすると下に出るカード。
 */
export default function DayDetailPanel({
  dateKey,
  tasks,
  onClose,
  range,
  onOpenAddForm,
  onCloseAddForm
}: Props) {
  const { rescheduleTask, deleteTask } = useDevCalendar();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Issue #38 削除: 誤タップ防止に confirm を挟む
  function handleDelete(task: Task) {
    if (confirm(`「${task.title}」を削除しますか？`)) {
      deleteTask(task.id);
    }
  }

  function closeAddForm() {
    setIsAdding(false);
    onCloseAddForm();
  }

  return (
    <section className="mt-4 rounded-xl border border-stone-200 bg-surface p-5 shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-600">{dateKey}</p>
          <h3 className="mt-1 text-lg font-semibold">この日のタスク</h3>
        </div>
        <div>
          <button
            onClick={() => {
              // 閉じるときは追加の途中状態も後始末する
              // （編集フォームはこのパネルごとアンマウントされるので何もしなくてよい）
              closeAddForm();
              onClose();
            }}
            className="rounded-xl border border-stone-200 bg-surface px-3 py-1 text-sm"
          >
            閉じる
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-stone-500">この日のタスクはありません。</p>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
              {editingTaskId === t.id ? (
                <TaskEditForm task={t} onClose={() => setEditingTaskId(null)} />
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <TaskCard task={t} />
                  </div>
                  {/* Issue #38: 各タスク行の操作ボタン。h-11 w-11 (44px) 基準で
                      「未配置に戻す」と並べて配置する（見た目は TaskList.tsx が手本） */}
                  <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2">
                    {/* 編集ボタン（鉛筆） */}
                    <button
                      onClick={() => setEditingTaskId(t.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-stone-700 transition hover:border-lime-500/50 hover:bg-lime-100 hover:text-lime-700"
                      aria-label="タスクを編集"
                    >
                      <Pencil size={18} />
                    </button>
                    {/* 削除ボタン（ゴミ箱） */}
                    <button
                      onClick={() => handleDelete(t)}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-stone-700 transition hover:border-rose-400/50 hover:bg-rose-100 hover:text-rose-600"
                      aria-label="タスクを削除"
                    >
                      <Trash2 size={18} />
                    </button>
                    {t.scheduledDate && (
                      <button
                        onClick={() => rescheduleTask(t.id, null)}
                        className="rounded-lg border border-stone-200 bg-surface px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                        title="予定日を外して未配置に戻す"
                      >
                        未配置に戻す
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Issue #38/#42 追加: パネル下部の「+ この日にタスクを追加」。
          押すとタイトル・期間（開始日/終了日）・重さ・見積時間を入力できるインラインフォームに切り替わる */}
      <div className="mt-4 border-t border-stone-100 pt-4">
        {isAdding ? (
          <DayTaskAddForm dateKey={dateKey} range={range} onDone={closeAddForm} />
        ) : (
          <button
            onClick={() => {
              setIsAdding(true);
              onOpenAddForm();
            }}
            className="flex items-center gap-1 rounded-lg border border-dashed border-stone-300 bg-surface px-3 py-2 text-sm text-stone-600 transition hover:border-lime-500 hover:text-lime-800"
          >
            <Plus size={16} />
            この日にタスクを追加
          </button>
        )}
      </div>
    </section>
  );
}
