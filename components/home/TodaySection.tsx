"use client";

// Home の「今日」セクション (Issue #112)。
//
// 【なぜ統合したか】
// 以前の Home は「今日やるべき Top3」(app/home/page.tsx 内のカード3枚) と
// 「今日のタスク」(components/TodayList.tsx) の2か所で、ほぼ同じ"今日やること"を二重に出していた。
// Things 3 / Sunsama のような Today ビューに倣い、1つのリストに統合している:
//   上位: selectTopTasks の Top3（順位つき） → その下: getTodayTasks の残り（Top3 と id 重複するものは除外）
// 旧 TodayList 内の日付ヘッダーカードは、ページ先頭の日付と重複するため廃止した。
//
// 旧 TodayList の「ステータス select」「完了モーダル (Issue #71)」「作業ログモーダル」
// 「チェックボックス」はそのまま引き継いでいる（モーダルのロジックは変更なし）。

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import { getTodayString, getTodayTasks } from "@/lib/schedule";
import { selectTopTasks } from "@/lib/top-tasks";
import type { Task, TaskStatus } from "@/types/dev-calendar";
import { saveOrUpdateDailyLog, getAllLogs } from "@/lib/dailyLogs";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { WeightBadge } from "@/components/WeightBadge";
import { DEFAULT_PROJECT_COLOR } from "@/lib/colors";
import { formatScheduledTimeRange } from "@/lib/scheduled-time";

/** 行内のプロジェクト名（色ドット + 名前）。旧 TodayList から移設 */
function ProjectBadge({ projectId, projects }: { projectId: string; projects: { id: string; name: string; color?: string | null }[] }) {
  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
      <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: project.color ?? DEFAULT_PROJECT_COLOR }} />
      <span className="text-xs text-stone-500">{project.name}</span>
    </span>
  );
}

export default function TodaySection() {
  const { schedule, updateTaskStatus, tasks, projects, completeTask } = useDevCalendar();
  const today = getTodayString();

  // 今日のリスト = Top3（順位つき）+ 今日のタスクの残り（Top3 と重複排除）
  const topTasks = useMemo(() => selectTopTasks(tasks, today), [tasks, today]);
  const restTasks = useMemo(() => {
    const topIds = new Set(topTasks.map((t) => t.id));
    return getTodayTasks(schedule, tasks).filter((t) => !topIds.has(t.id));
  }, [schedule, tasks, topTasks]);
  const totalCount = topTasks.length + restTasks.length;

  // 作業ログのモーダル
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [did, setDid] = useState("");
  const [blocked, setBlocked] = useState("");
  const [next, setNext] = useState("");

  // 完了のモーダル (Issue #71)。
  // 以前は confirm/prompt を使っていたが、ブラウザが「このページでこれ以上ダイアログを
  // 表示しない」を有効にすると confirm が常に false を返し、完了操作が無反応になっていた。
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [completionUrl, setCompletionUrl] = useState("");

  const openCompleteDialog = (taskId: string) => {
    setCompletingTaskId(taskId);
    setCompletionNote("");
    setCompletionUrl("");
  };

  const confirmComplete = () => {
    if (!completingTaskId) return;
    completeTask(completingTaskId, completionNote.trim() || null, completionUrl.trim() || null);
    setCompletingTaskId(null);
  };

  // 作業ログの保存。doneToday は活動グリッド (ActivityGrid) の濃さに使われる指標で、
  // タスクの status とは別物。タスクを完了にするかは呼び出し側のボタンで決める
  const saveLog = (taskId: string | null) => {
    if (!taskId) return;
    saveOrUpdateDailyLog({ taskId, date: today, did, blocked, next, doneToday: true });
  };

  /** リスト1行分（<li>）。rank を渡すと左に小さな順位番号を出す（Top3 のみ） */
  const renderRow = (task: Task, rank?: number) => (
    <li
      key={task.id}
      // モバイル: 上に内容・下に操作の縦積み / sm 以上: 左に内容・右に操作 (Issue #14)
      className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${task.status === "done" ? "opacity-60" : ""}`}
    >
      {/* min-w-0: 付けないと長いタイトルが右の操作エリアを押し出す */}
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {/* チェックボックス: ON で完了、OFF で未着手に戻す */}
        <input
          type="checkbox"
          checked={task.status === "done"}
          onChange={(e) => {
            if (e.target.checked) {
              completeTask(task.id);
            } else {
              updateTaskStatus(task.id, "todo");
            }
          }}
          className="mt-1 h-4 w-4 shrink-0"
          aria-label={`完了 ${task.title}`}
        />
        {/* 順位番号（Top3 の行のみ） */}
        {rank !== undefined && (
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-semibold text-white"
            aria-label={`${rank}位`}
          >
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className={`min-w-0 break-words font-medium ${task.status === "done" ? "line-through text-stone-500" : "text-stone-900"}`}>{task.title}</div>
            <StatusBadge status={task.status} size="sm" />
          </div>
          {task.memo && <div className="mt-1 truncate text-sm text-stone-500">{task.memo}</div>}
          {/* メタ情報: プロジェクト・時刻・重さ・優先度・見積 */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
            <ProjectBadge projectId={task.projectId} projects={projects} />
            {/* Issue #51: 時刻があるときだけ表示（時刻なしは終日扱いで何も出さない） */}
            {formatScheduledTimeRange(task.scheduledStartTime, task.scheduledEndTime) && (
              <div className="whitespace-nowrap">{formatScheduledTimeRange(task.scheduledStartTime, task.scheduledEndTime)}</div>
            )}
            <WeightBadge weight={task.weight} />
            {task.priority && <PriorityBadge priority={task.priority} />}
            {typeof task.estimatedMinutes === "number" && <div className="whitespace-nowrap">{Math.round(task.estimatedMinutes / 60 * 10) / 10}h</div>}
          </div>
        </div>
      </div>

      {/* 操作ボタン群（ステータス select / 完了モーダル / 作業ログモーダル）。狭い画面では折り返す */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 pl-7 sm:pl-0">
        <select
          value={task.status}
          onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskStatus)}
          aria-label={`ステータス ${task.title}`}
          className="min-h-9 rounded-lg border border-stone-200 bg-surface px-2 py-1 text-sm text-stone-900 outline-none"
        >
          <option value="todo">未着手</option>
          <option value="doing">進行中</option>
          <option value="done">完了</option>
        </select>
        <button
          onClick={() => openCompleteDialog(task.id)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-lime-700 px-3 py-1 text-sm font-semibold text-white transition hover:bg-lime-800"
        >
          <CheckCircle2 size={16} />
          完了
        </button>
        <button
          onClick={() => {
            // このタスクの今日ぶんの作業ログを開く（既にあれば読み込んで編集）
            const logs = getAllLogs();
            const existing = logs.find((l) => l.taskId === task.id && l.date === today);
            setEditingTaskId(task.id);
            setDid(existing?.did ?? "");
            setBlocked(existing?.blocked ?? "");
            setNext(existing?.next ?? "");
          }}
          className="inline-flex min-h-9 items-center rounded-lg border border-stone-300 bg-surface px-3 py-1 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
        >
          作業ログを書く
        </button>
      </div>
    </li>
  );

  return (
    <section>
      {/* セクション見出し「今日」+ 件数 */}
      <h3 className="text-sm font-semibold text-stone-500">
        今日 <span className="ml-1 font-normal">{totalCount}件</span>
      </h3>

      {totalCount === 0 ? (
        // 空状態: 今日のタスクが0件のとき。タスク画面へ誘導する
        <p className="mt-3 text-sm text-stone-600">
          今日のタスクはありません。{" "}
          <Link href="/tasks" className="text-lime-700 underline-offset-2 hover:underline">タスクを追加・確認する</Link>
        </p>
      ) : (
        // 1つのカードの中に Top3 → 残りを続けて並べる。行の区切りは divide-y
        <ul className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-surface px-4">
          {topTasks.map((task, index) => renderRow(task, index + 1))}
          {restTasks.map((task) => renderRow(task))}
        </ul>
      )}

      {editingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-dialog-title"
            className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-lg"
          >
            <h3 id="log-dialog-title" className="text-lg font-semibold">作業ログを記録</h3>
            <p className="text-sm text-stone-500">今日やったこと・詰まったこと・次にやることを入力してください。空でも保存できます。</p>

            <div className="mt-4 grid gap-3">
              <label className="text-sm">今日やったこと (did)</label>
              <textarea value={did} onChange={(e) => setDid(e.target.value)} className="h-24 w-full rounded-md border px-3 py-2" />

              <label className="text-sm">詰まったこと (blocked)</label>
              <textarea value={blocked} onChange={(e) => setBlocked(e.target.value)} className="h-24 w-full rounded-md border px-3 py-2" />

              <label className="text-sm">次にやること (next)</label>
              <input value={next} onChange={(e) => setNext(e.target.value)} className="w-full rounded-md border px-3 py-2" />
            </div>

            {/* Issue #71: ログだけ保存するのか、タスクも完了にするのかを選べるように分ける */}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setEditingTaskId(null)}
                className="min-h-11 rounded-xl border border-stone-300 px-3 py-1 text-sm"
              >
                閉じる
              </button>
              <button
                onClick={() => {
                  saveLog(editingTaskId);
                  setEditingTaskId(null);
                }}
                className="min-h-11 rounded-xl border border-stone-300 bg-surface px-3 py-1 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
              >
                保存する
              </button>
              <button
                onClick={() => {
                  const taskId = editingTaskId;
                  saveLog(taskId);
                  setEditingTaskId(null);
                  // ログ保存に続けてタスク自体も完了にする
                  if (taskId) completeTask(taskId);
                }}
                className="min-h-11 rounded-xl bg-lime-700 px-3 py-1 text-sm font-semibold text-white transition hover:bg-lime-800"
              >
                保存してタスクを完了にする
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 完了の確認モーダル (Issue #71)。ブラウザの「これ以上ダイアログを表示しない」設定に左右されないようアプリ内で表示 */}
      {completingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="complete-dialog-title"
            className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-lg"
          >
            <h3 id="complete-dialog-title" className="text-lg font-semibold">
              タスクを完了にする
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              メモとURLは任意です。個人情報やAPIキーは入力しないでください。
            </p>

            <div className="mt-4 grid gap-3">
              <label className="text-sm" htmlFor="completion-note">
                完了メモ（任意）
              </label>
              <textarea
                id="completion-note"
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                className="h-24 w-full rounded-md border border-stone-300 px-3 py-2"
              />

              <label className="text-sm" htmlFor="completion-url">
                関連URL（任意）
              </label>
              <input
                id="completion-url"
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={completionUrl}
                onChange={(e) => setCompletionUrl(e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-2"
              />
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setCompletingTaskId(null)}
                className="min-h-11 rounded-xl border border-stone-300 px-3 py-1 text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={confirmComplete}
                className="min-h-11 rounded-xl bg-lime-700 px-3 py-1 text-sm font-semibold text-white transition hover:bg-lime-800"
              >
                完了にする
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
