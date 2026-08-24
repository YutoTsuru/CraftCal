"use client";

import type { Task } from "@/types/dev-calendar";

type Props = {
  tasks: Task[];
  /** 配置先を選ぶ待ちになっているタスクの id（null = 未選択） */
  placingTaskId: string | null;
  /** タスクのチップを押したとき。同じタスクをもう一度押すと解除する挙動は呼び出し側で持つ */
  onToggle: (taskId: string) => void;
  onClear: () => void;
};

/**
 * 未配置タスク置き場 (Issue #56 で CalendarView.tsx から抽出)。
 *
 * 予定日がまだ決まっていないタスクをチップで並べる。1つ選ぶと「配置モード」になり、
 * カレンダーの日付をクリックするとその日に置ける。配置そのものの処理は呼び出し側の担当で、
 * ここは「どれを選んでいるか」を表示して選択を切り替えるだけ。
 *
 * 対応するUI: /calendar ページのカレンダー上部にある「未配置のタスク（N件）」のカード。
 */
export default function UnplacedTaskTray({ tasks, placingTaskId, onToggle, onClear }: Props) {
  if (tasks.length === 0) {
    return null;
  }

  const placingTask = tasks.find((t) => t.id === placingTaskId) ?? null;

  return (
    <section
      className={`rounded-xl border bg-surface p-4 shadow-md ${placingTask ? "border-lime-500" : "border-stone-200"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-stone-700">未配置のタスク（{tasks.length}件）</h3>
          <p className="mt-1 text-xs text-stone-500">
            {placingTask
              ? `「${placingTask.title}」を配置する日をカレンダーでクリックしてください`
              : "タスクを選んでからカレンダーの日付をクリックすると、予定日を設定できます。"}
          </p>
        </div>
        {placingTask && (
          <button
            onClick={onClear}
            className="rounded-lg border border-stone-200 bg-surface px-3 py-1 text-xs text-stone-600 hover:bg-stone-100"
          >
            選択解除
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => onToggle(t.id)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              placingTaskId === t.id
                ? "border-lime-600 bg-lime-50 font-semibold text-lime-800"
                : "border-stone-200 bg-stone-100 text-stone-700 hover:border-lime-300 hover:bg-lime-50"
            }`}
          >
            {t.title}
            {t.dueDate && <span className="ml-2 text-xs text-stone-500">期限 {t.dueDate}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
