"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDevCalendarActions } from "@/components/AppProvider";
import { Sparkles, ChevronRight, Clock, Pencil, Check, X } from "lucide-react";
import { generateTasks, type PlannedTask } from "@/lib/planner-templates";
import { ColorPicker } from "@/components/ColorPicker";
import { DEFAULT_PROJECT_COLOR } from "@/lib/colors";

type Step = "input" | "review";

const WEIGHT_LABEL: Record<string, string> = {
  light: "軽",
  medium: "中",
  heavy: "重",
};

const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-stone-100 text-stone-600",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

function formatMinutes(min: number) {
  if (min < 60) return `${min}分`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

export default function ProjectPlanPage() {
  const router = useRouter();
  // Issue #48 (レビュー指摘対応): この画面は addProject / addTask しか使わないので
  // actions だけを購読する。tasks などの state 変化ではこの画面は再レンダリングされない
  const { addProject, addTask } = useDevCalendarActions();

  const [step, setStep] = useState<Step>("input");
  const [isSaving, setIsSaving] = useState(false);

  // form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  // Issue #57: 以前はここだけ初期値が indigo で他画面 (emerald) と食い違っていたため揃えた
  const [color, setColor] = useState(DEFAULT_PROJECT_COLOR);

  // generated tasks
  const [tasks, setTasks] = useState<PlannedTask[]>([]);

  // inline edit state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMinutes, setEditMinutes] = useState(0);

  const handleGenerate = () => {
    if (!name.trim()) return;
    const generated = generateTasks(name, description, goal);
    setTasks(generated);
    setStep("review");
  };

  const startEdit = (i: number) => {
    setEditingIndex(i);
    setEditTitle(tasks[i].title);
    setEditMinutes(tasks[i].estimatedMinutes);
  };

  const commitEdit = () => {
    if (editingIndex === null) return;
    setTasks((cur) =>
      cur.map((t, i) =>
        i === editingIndex
          ? { ...t, title: editTitle.trim() || t.title, estimatedMinutes: editMinutes }
          : t
      )
    );
    setEditingIndex(null);
  };

  const cancelEdit = () => setEditingIndex(null);

  const moveUp = (i: number) => {
    if (i === 0) return;
    setTasks((cur) => {
      const next = [...cur];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };

  const moveDown = (i: number) => {
    if (i === tasks.length - 1) return;
    setTasks((cur) => {
      const next = [...cur];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  };

  const removeTask = (i: number) => {
    setTasks((cur) => cur.filter((_, idx) => idx !== i));
  };

  const handleSave = () => {
    if (isSaving) return;
    setIsSaving(true);
    const projectId = crypto.randomUUID();

    addProject({
      id: projectId,
      name: name.trim(),
      description: description.trim() || null,
      goal: goal.trim() || null,
      overviewUrl: null,
      color,
      status: "active",
    } as any);

    tasks.forEach((t) => {
      addTask({
        projectId,
        title: t.title,
        memo: t.dependency ?? "",
        weight: t.weight,
        priority: t.priority,
        estimatedMinutes: t.estimatedMinutes,
      });
    });

    router.push(`/projects/${projectId}`);
  };

  const totalMinutes = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-indigo-600">Projects / Plan</p>
        <h2 className="mt-2 text-3xl font-bold">プロジェクトを計画する</h2>
        <p className="mt-2 text-stone-400">プロジェクトの概要を入力すると、タスクに自動分解します。</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className={`rounded-full px-3 py-1 font-medium ${step === "input" ? "bg-indigo-600 text-white" : "bg-stone-100 text-stone-500"}`}>
          1 プロジェクト入力
        </span>
        <ChevronRight size={16} className="text-stone-400" />
        <span className={`rounded-full px-3 py-1 font-medium ${step === "review" ? "bg-indigo-600 text-white" : "bg-stone-100 text-stone-500"}`}>
          2 タスク確認・編集
        </span>
      </div>

      {step === "input" && (
        <div className="rounded-xl border border-stone-200 bg-surface p-6 shadow-md">
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                プロジェクト名 <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder="例: ユーザー認証機能の実装"
                className="w-full rounded-xl border border-stone-200 px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">説明</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: メールとパスワードでのログイン、JWT認証、パスワードリセット機能を実装する"
                rows={3}
                className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">ゴール</label>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="例: ユーザーが安全にログイン・ログアウトできる状態"
                className="w-full rounded-xl border border-stone-200 px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Issue #57: OSのカラーダイアログではなくプリセットから選ぶ */}
            <ColorPicker value={color} onChange={setColor} label="プロジェクトカラー" />

            <button
              onClick={handleGenerate}
              disabled={!name.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={18} />
              タスクを自動生成
            </button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="grid gap-4">
          {/* summary bar */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-stone-200 bg-surface px-5 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <span className="h-3 w-3 rounded-full" style={{ background: color }} />
              <span className="font-medium">{name}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-stone-500">
              <Clock size={14} />
              合計 {formatMinutes(totalMinutes)}
            </div>
            <div className="text-sm text-stone-500">{tasks.length} タスク</div>
            <button
              onClick={() => setStep("input")}
              className="ml-auto text-xs text-indigo-600 hover:underline"
            >
              入力に戻る
            </button>
          </div>

          {/* task list */}
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-surface shadow-md">
            <div className="border-b border-stone-100 px-5 py-3">
              <p className="text-sm text-stone-500">
                タスクの順序・内容を確認・編集してください
              </p>
            </div>
            <ol className="divide-y divide-stone-100">
              {tasks.map((task, i) => (
                <li key={i} className="group flex items-start gap-3 px-5 py-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-bold text-stone-500">
                    {i + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    {editingIndex === i ? (
                      <div className="grid gap-2">
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                          className="w-full rounded-lg border border-indigo-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-stone-500">所要時間(分)</label>
                          <input
                            type="number"
                            min={5}
                            max={480}
                            value={editMinutes}
                            onChange={(e) => setEditMinutes(Number(e.target.value))}
                            className="w-20 rounded-lg border border-stone-200 px-2 py-1 text-sm outline-none"
                          />
                          <button
                            onClick={commitEdit}
                            className="flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-1 text-xs text-white"
                          >
                            <Check size={12} /> 保存
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1 text-xs text-stone-600"
                          >
                            <X size={12} /> キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-stone-800">{task.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1 text-xs text-stone-500">
                            <Clock size={11} />
                            {formatMinutes(task.estimatedMinutes)}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[task.priority]}`}>
                            優先度: {PRIORITY_LABEL[task.priority]}
                          </span>
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                            {WEIGHT_LABEL[task.weight]}
                          </span>
                          {task.dependency && (
                            <span className="text-xs text-stone-400">↳ {task.dependency}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {editingIndex !== i && (
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => moveUp(i)}
                        disabled={i === 0}
                        className="rounded p-1 text-stone-400 hover:bg-stone-200 disabled:opacity-30"
                        title="上へ"
                      >↑</button>
                      <button
                        onClick={() => moveDown(i)}
                        disabled={i === tasks.length - 1}
                        className="rounded p-1 text-stone-400 hover:bg-stone-200 disabled:opacity-30"
                        title="下へ"
                      >↓</button>
                      <button
                        onClick={() => startEdit(i)}
                        className="rounded p-1 text-stone-400 hover:bg-stone-200"
                        title="編集"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => removeTask(i)}
                        className="rounded p-1 text-red-400 hover:bg-red-50"
                        title="削除"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setStep("input"); setTasks([]); }}
              className="rounded-xl border border-stone-200 px-5 py-2 text-sm text-stone-600 hover:bg-stone-100"
            >
              最初からやり直す
            </button>
            <button
              onClick={handleSave}
              disabled={tasks.length === 0 || isSaving}
              className="rounded-xl bg-emerald-500 px-6 py-2 font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "保存中..." : "保存してプロジェクトを作成"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
