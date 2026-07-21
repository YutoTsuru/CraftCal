"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import { getTodayString, getTodayTasks } from "@/lib/schedule";
import type { TaskStatus } from "@/types/dev-calendar";
import { saveOrUpdateDailyLog, getAllLogs } from "@/lib/dailyLogs";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { DEFAULT_PROJECT_COLOR } from "@/lib/colors";

// タスクの重さの日本語表記 (Issue #71)。優先度・状態は各バッジ側で日本語化済み
const WEIGHT_LABEL: Record<string, string> = {
  light: "軽い",
  medium: "普通",
  heavy: "重い"
};

// Issue #51: 開始/終了時刻を "HH:MM–HH:MM" 形式にする。片方だけ入力されていればその時刻だけ表示し、
// どちらも無ければ null（呼び出し側は時刻を出さない＝従来どおり終日扱い）。CalendarView.tsx の同名関数と同じ表示ルール。
function formatScheduledTimeRange(start?: string | null, end?: string | null): string | null {
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  if (end) return end;
  return null;
}

function ProjectBadge({ projectId, projects }: { projectId: string; projects: { id: string; name: string; color?: string | null }[] }) {
  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;

  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: project.color ?? DEFAULT_PROJECT_COLOR }} />
      <span className="text-xs text-stone-500">{project.name}</span>
    </span>
  );
}

export default function TodayList() {
  const { schedule, updateTaskStatus, tasks } = useDevCalendar();
  const { projects } = useDevCalendar();
  const { completeTask } = useDevCalendar();
  const today = getTodayString();
  const tasksForToday = getTodayTasks(schedule, tasks);

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

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-stone-200 bg-surface p-4 shadow-md">
        <p className="text-sm text-stone-700">今日の日付</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold">{today}</h2>
          <p className="text-sm text-stone-700">今日のタスク {tasksForToday.length} 件</p>
        </div>
      </div>

      {tasksForToday.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-surface p-6 text-center text-stone-700">
          今日に割り振られたタスクはありません。
        </div>
      ) : (
        <ul className="grid gap-2">
          {/* タスク1件分の行 (<li>)。
              モバイル: 上に内容、下に操作ボタンの縦積み (flex-col)
              sm(640px)以上: 左に内容、右にボタンの横並び (sm:flex-row)
              — 横並び固定だとボタン群が375px幅からはみ出すため (Issue #14) */}
          {tasksForToday.map((task) => (
            <li key={task.id} className={`flex flex-col gap-3 rounded-xl border border-stone-200 bg-surface p-3 sm:flex-row sm:items-center sm:justify-between ${task.status === "done" ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
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
                  className="mt-1 h-4 w-4"
                  aria-label={`完了 ${task.title}`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <ProjectBadge projectId={task.projectId} projects={projects} />
                    <div className="flex items-center gap-2">
                      <StatusBadge status={task.status} size="sm" />
                      <div className={`font-medium ${task.status === "done" ? "line-through text-stone-500" : "text-stone-900"}`}>{task.title}</div>
                    </div>
                  </div>
                  {task.memo && <div className={`text-sm ${task.status === "done" ? "line-through text-stone-500" : "text-stone-600"}`}>{task.memo}</div>}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                    {/* Issue #51: 時刻があるときだけ表示（時刻なしのタスクは従来どおり終日扱いで何も出さない） */}
                    {formatScheduledTimeRange(task.scheduledStartTime, task.scheduledEndTime) && (
                      <div>{formatScheduledTimeRange(task.scheduledStartTime, task.scheduledEndTime)}</div>
                    )}
                    {/* Issue #71: medium / heavy と英語の生の値が出ていたため日本語にする */}
                    <div>{WEIGHT_LABEL[task.weight] ?? task.weight}</div>
                    {task.priority && <PriorityBadge priority={task.priority} />}
                    {typeof task.estimatedMinutes === "number" && <div>{Math.round(task.estimatedMinutes / 60 * 10) / 10}h</div>}
                  </div>
                </div>
              </div>

              {/* 操作ボタン群。flex-wrap で狭い画面では折り返す。
                  min-h-11 (44px) はタップしやすさの基準 (Issue #14) */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={task.status}
                  onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskStatus)}
                  className="min-h-11 rounded-xl border border-stone-200 bg-surface px-3 py-1 text-sm text-stone-900 outline-none"
                >
                  <option value="todo">未着手</option>
                  <option value="doing">進行中</option>
                  <option value="done">完了</option>
                </select>
                <button
                  onClick={() => openCompleteDialog(task.id)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-lime-700 px-3 py-1 text-sm font-semibold text-white transition hover:bg-lime-800"
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
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-300 bg-surface px-3 py-1 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                >
                  作業ログを書く
                </button>
              </div>
            </li>
          ))}
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

            {/* Issue #71: 以前はボタンが1つで「保存して今日分完了にする」と書かれていたが、
                実際はログを保存するだけでタスクの status を変えていなかった。
                ログだけ保存するのか、タスクも完了にするのかを選べるように分ける */}
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
                  // ログ保存に続けてタスク自体も完了にする（ここが以前抜けていた）
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

      {/* 完了の確認 (Issue #71)。
          以前は confirm / prompt で聞いていたが、ブラウザの「これ以上ダイアログを表示しない」
          が有効になると confirm が常に false を返し、完了ボタンが無反応になっていた。
          アプリ内のモーダルに置き換えて、ブラウザの設定に左右されないようにする */}
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
    </div>
  );
}
