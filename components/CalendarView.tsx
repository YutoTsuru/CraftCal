"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { useDevCalendar } from "@/components/AppProvider";
import { formatDate, getTodayString } from "@/lib/schedule";
import type { Task, TaskWeight } from "@/types/dev-calendar";
import CalendarRangeHeader from "@/components/CalendarRangeHeader";

type ViewMode = "month" | "week";

function TaskCard({ task }: { task: Task }) {
  const { projects } = useDevCalendar();
  const project = projects.find((p) => p.id === task.projectId);
  const today = getTodayString();
  const overdue = task.dueDate && task.dueDate < today && task.status !== "done";

  const priorityColor =
    task.priority === "high" ? "border-rose-500" : task.priority === "medium" ? "border-amber-400" : "border-emerald-400";

  return (
    <div className={`mb-2 overflow-hidden rounded-md border-l-4 bg-white p-2 text-sm shadow-sm ${priorityColor} ${overdue ? "bg-rose-50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: project?.color ?? "#10b981" }} />
          <div className={`truncate font-medium ${overdue ? "text-rose-600" : "text-slate-800"}`}>{task.title}</div>
        </div>
        <div className="text-xs text-slate-400">{task.estimatedMinutes ? `${task.estimatedMinutes}m` : ""}</div>
      </div>
      <div className="mt-1 text-xs text-slate-500 truncate">{task.memo}</div>
    </div>
  );
}

export default function CalendarView() {
  // Issue #38: カレンダーから直接タスクを追加・編集・削除するため CRUD 操作を取得
  const { tasks, rescheduleTask, addTask, updateTask, deleteTask } = useDevCalendar();
  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // 未配置タスクの「配置モード」: 選択中のタスクID
  const [placingTaskId, setPlacingTaskId] = useState<string | null>(null);

  // Issue #38 追加フォーム: 「この日にタスクを追加」を開いているかと入力中のタイトル
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  // Issue #42 追加フォーム拡張: 期間（開始日/終了日）・重さ・見積時間・エラー文言
  const [newStart, setNewStart] = useState<string | null>(null);
  const [newEnd, setNewEnd] = useState<string | null>(null);
  const [newWeight, setNewWeight] = useState<TaskWeight>("medium");
  const [newEstimateHours, setNewEstimateHours] = useState<number | "">("");
  const [addError, setAddError] = useState<string | null>(null);

  // Issue #42 なぞって期間指定: 範囲選択モードの ON/OFF と、選択中の開始/終了候補日
  const [rangeSelecting, setRangeSelecting] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  // 範囲選択の pointerup 直後に発火する click（日付選択）を1回だけ無視するためのフラグ
  const suppressClick = useRef(false);

  // Issue #42 バー端ドラッグ: ドラッグ中のタスクIDと掴んでいる端（開始/終了）、および現在のプレビュー期間
  const [dragTask, setDragTask] = useState<{ id: string; edge: "start" | "end" } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ start: string; end: string } | null>(null);

  // Issue #38 編集: インライン編集中のタスクIDと編集中タイトル
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const today = useMemo(() => new Date(), []);

  const unplacedTasks = useMemo(
    () => tasks.filter((t) => !t.scheduledDate && t.status !== "done"),
    [tasks]
  );
  const placingTask = unplacedTasks.find((t) => t.id === placingTaskId) ?? null;

  // Issue #42 バー端ドラッグのプレビュー用タスク配列。
  // ドラッグ中は対象タスクの scheduledDate/dueDate をプレビュー値に差し替える。
  // これを描画系（tasksForDate や週バー計算）が参照することで、既存ロジックのまま
  // バーがライブで伸縮して見える。
  const displayTasks = useMemo(() => {
    if (!dragTask || !dragPreview) return tasks;
    return tasks.map((t) =>
      t.id === dragTask.id ? { ...t, scheduledDate: dragPreview.start, dueDate: dragPreview.end } : t
    );
  }, [tasks, dragTask, dragPreview]);

  function placeTask(dateKey: string) {
    if (!placingTaskId) return false;
    rescheduleTask(placingTaskId, dateKey);
    setPlacingTaskId(null);
    return true;
  }

  // Issue #42 共通: 画面座標から data-date セルの日付キーを求める（なぞり選択・バー端ドラッグ共用）
  function cellDateFromPoint(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y);
    const cell = el?.closest("[data-date]") as HTMLElement | null;
    return cell?.getAttribute("data-date") ?? null;
  }

  // Issue #42 なぞって期間指定: セルを押した日を開始候補にし、pointermove で通過セルまで範囲を広げる。
  // 離した日を終了候補とし、開始より前で離したら開始/終了を入れ替えてフォームに反映する。
  function startRangeDrag(startKey: string) {
    setRangeStart(startKey);
    setRangeEnd(startKey);
    let endKey = startKey;
    const move = (ev: PointerEvent) => {
      const k = cellDateFromPoint(ev.clientX, ev.clientY);
      if (k) {
        endKey = k;
        setRangeEnd(k);
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      // 開始 > 終了 なら入れ替える（YYYY-MM-DD は辞書順=日付順）
      let a = startKey;
      let b = endKey;
      if (b < a) {
        a = endKey;
        b = startKey;
      }
      setNewStart(a);
      setNewEnd(b);
      setRangeSelecting(false);
      setRangeStart(null);
      setRangeEnd(null);
      // pointerup 直後の click（日付選択）を1回だけ握りつぶす
      suppressClick.current = true;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // 選択中の範囲（開始〜終了）に含まれる日付セルかどうか。ハイライト用
  function inSelectingRange(key: string) {
    if (!rangeStart || !rangeEnd) return false;
    const lo = rangeStart < rangeEnd ? rangeStart : rangeEnd;
    const hi = rangeStart < rangeEnd ? rangeEnd : rangeStart;
    return lo <= key && key <= hi;
  }

  // Issue #42 バー端ドラッグ（デスクトップ月表示のみ・マウス限定）。
  // pointermove 中は elementFromPoint で通過セルを特定し、掴んだ端をそのセルへ寄せる。
  // 開始>終了 にならないようクランプ（最小1日）。pointerup で updateTask に確定する。
  function startBarDrag(task: Task, edge: "start" | "end", e: React.PointerEvent) {
    if (e.pointerType !== "mouse") return; // タッチは対象外（モバイルはバー非表示）
    e.stopPropagation(); // 下のセルの click（日付選択）が発火しないよう保護
    e.preventDefault();
    const startKey = task.scheduledDate ?? task.dueDate ?? formatDate(new Date());
    const endKey = task.dueDate ?? task.scheduledDate ?? startKey;
    let previewStart = startKey;
    let previewEnd = endKey;
    setDragTask({ id: task.id, edge });
    setDragPreview({ start: startKey, end: endKey });
    const move = (ev: PointerEvent) => {
      const k = cellDateFromPoint(ev.clientX, ev.clientY);
      if (!k) return;
      if (edge === "end") {
        previewEnd = k < startKey ? startKey : k; // 終了は開始以降にクランプ
        setDragPreview({ start: startKey, end: previewEnd });
      } else {
        previewStart = k > endKey ? endKey : k; // 開始は終了以前にクランプ
        setDragPreview({ start: previewStart, end: endKey });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      updateTask(task.id, {
        title: task.title,
        memo: task.memo,
        weight: task.weight,
        priority: task.priority,
        projectId: task.projectId,
        estimatedMinutes: task.estimatedMinutes,
        scheduledDate: previewStart,
        dueDate: previewEnd
      });
      setDragTask(null);
      setDragPreview(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // Issue #39 スワイプ/ドラッグで期間移動。
  // touch と（マウスの）pointer 開始位置を覚えておき、終了時の移動量で判定する。
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  function beginSwipe(x: number, y: number) {
    swipeStart.current = { x, y };
  }

  function endSwipe(x: number, y: number) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = x - start.x;
    const dy = y - start.y;
    // 横移動50px以上 かつ 横優勢（縦スクロールやタップを妨げないため）
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next(); // 左スワイプ = 次の期間へ
      else prev(); // 右スワイプ = 前の期間へ
    }
  }

  // Issue #42 矢印キーで期間移動。ArrowLeft→前 / ArrowRight→次。
  // input/textarea/select にフォーカスがあるとき（日付入力中など）は無視する。
  // 範囲選択モード中も誤操作を避けるため無効化する。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (rangeSelecting) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // prev/next は mode に依存するため mode 変化時に貼り直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, rangeSelecting]);

  function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function addMonths(date: Date, months: number) {
    return new Date(date.getFullYear(), date.getMonth() + months, 1);
  }

  function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function getMonthMatrix(date: Date) {
    const first = startOfMonth(date);
    // week starts on Sunday (0)
    const start = addDays(first, -first.getDay());
    const matrix: Date[][] = [];

    let cur = new Date(start);
    for (let week = 0; week < 6; week++) {
      const row: Date[] = [];
      for (let i = 0; i < 7; i++) {
        row.push(new Date(cur));
        cur = addDays(cur, 1);
      }
      matrix.push(row);
    }

    return matrix;
  }

  function getWeekRange(date: Date) {
    const start = addDays(date, -date.getDay());
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }

  const monthMatrix = useMemo(() => getMonthMatrix(cursor), [cursor]);
  const weekRange = useMemo(() => getWeekRange(cursor), [cursor]);

  function tasksForDate(d: Date) {
    const key = formatDate(d);
    const sd = new Date(`${key}T00:00:00`);
    return displayTasks.filter((t) => {
      const startKey = t.scheduledDate ?? t.dueDate ?? null;
      const endKey = t.dueDate ?? t.scheduledDate ?? null;
      if (!startKey) return false;
      const start = new Date(`${startKey}T00:00:00`);
      const end = new Date(`${endKey}T00:00:00`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
      return start.getTime() <= sd.getTime() && sd.getTime() <= end.getTime();
    });
  }

  function tasksForSelectedKey(key: string) {
    const sd = new Date(`${key}T00:00:00`);
    return displayTasks.filter((t) => {
      const startKey = t.scheduledDate ?? t.dueDate ?? null;
      const endKey = t.dueDate ?? t.scheduledDate ?? null;
      if (!startKey) return false;
      const start = new Date(`${startKey}T00:00:00`);
      const end = new Date(`${endKey}T00:00:00`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
      return start.getTime() <= sd.getTime() && sd.getTime() <= end.getTime();
    });
  }

  function taskDisplayScore(t: Task) {
    const statusScore = t.status === 'doing' ? 2 : t.status === 'todo' ? 1 : 0;
    const priorityScore = t.priority === 'high' ? 2 : t.priority === 'medium' ? 1 : 0;
    return statusScore * 10 + priorityScore;
  }

  function goToday() {
    setCursor(new Date());
  }

  function prev() {
    if (mode === "month") setCursor((c) => addMonths(c, -1));
    else setCursor((c) => addDays(c, -7));
  }

  function next() {
    if (mode === "month") setCursor((c) => addMonths(c, 1));
    else setCursor((c) => addDays(c, 7));
  }

  // Issue #42 追加フォームを開くときは開始日を選択日で初期化し、他項目は既定値に戻す
  function openAdd() {
    setIsAdding(true);
    setNewStart(selectedDate);
    setNewEnd(null);
    setNewWeight("medium");
    setNewEstimateHours("");
    setAddError(null);
  }

  // 追加フォームの状態をすべてリセット（キャンセル/追加後/パネルを閉じたとき）
  function resetAddForm() {
    setIsAdding(false);
    setNewTitle("");
    setNewStart(null);
    setNewEnd(null);
    setNewWeight("medium");
    setNewEstimateHours("");
    setAddError(null);
    setRangeSelecting(false);
    setRangeStart(null);
    setRangeEnd(null);
  }

  // Issue #38/#42 追加: 選択日に予定日・期間・重さ・見積を設定してタスクを作る
  function submitAdd() {
    const title = newTitle.trim();
    if (!title) {
      setAddError("タスク名を入力してください");
      return;
    }
    const start = newStart ?? selectedDate;
    // 終了日 < 開始日 はエラー（送信しない）
    if (start && newEnd && newEnd < start) {
      setAddError("終了日は開始日以降の日付にしてください");
      return;
    }
    addTask({
      title,
      memo: "",
      weight: newWeight,
      scheduledDate: start,
      dueDate: newEnd || null,
      estimatedMinutes: typeof newEstimateHours === "number" ? Math.round(newEstimateHours * 60) : undefined
    });
    resetAddForm();
  }

  // Issue #38 編集: タイトルだけを書き換え、その他の項目は既存値を引き継ぐ
  function submitEdit(task: Task) {
    const title = editTitle.trim();
    if (!title) return;
    updateTask(task.id, {
      title,
      memo: task.memo,
      weight: task.weight,
      priority: task.priority,
      dueDate: task.dueDate,
      scheduledDate: task.scheduledDate,
      projectId: task.projectId,
      estimatedMinutes: task.estimatedMinutes
    });
    setEditingTaskId(null);
    setEditTitle("");
  }

  // Issue #38 削除: 誤タップ防止に confirm を挟む
  function handleDelete(task: Task) {
    if (confirm(`「${task.title}」を削除しますか？`)) {
      deleteTask(task.id);
    }
  }

  const monthLabel = `${cursor.getFullYear()}年 ${cursor.getMonth() + 1}月`;

  return (
    <div className="grid gap-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-600">Calendar</p>
            <h2 className="mt-2 text-3xl font-bold">カレンダー</h2>
            <p className="mt-1 text-slate-400">月表示・週表示でタスクを確認できます。</p>
          </div>

          {/* 月表示/週表示の切替タブ。
              以前は hidden sm:flex でモバイル非表示だったが、モバイルでも切替できるよう常時表示に変更 (Issue #14)。
              py-2 はタップ領域確保のため */}
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-md bg-slate-50 p-1">
              <button onClick={() => setMode("month")} className={`rounded px-3 py-2 text-sm ${mode === "month" ? "bg-emerald-600 text-white" : "text-slate-700"}`}>Month</button>
              <button onClick={() => setMode("week")} className={`rounded px-3 py-2 text-sm ${mode === "week" ? "bg-emerald-600 text-white" : "text-slate-700"}`}>Week</button>
            </div>
          </div>
        </div>
      </div>

      {/* Range header with controls */}
      <CalendarRangeHeader
        startDate={mode === "month" ? monthMatrix.flat()[0] : weekRange[0]}
        endDate={mode === "month" ? monthMatrix.flat()[monthMatrix.flat().length - 1] : weekRange[6]}
        totalDays={
          (Math.floor(( (mode === "month" ? monthMatrix.flat()[monthMatrix.flat().length - 1] : weekRange[6]).getTime() - (mode === "month" ? monthMatrix.flat()[0] : weekRange[0]).getTime() ) / (1000 * 60 * 60 * 24)) + 1)
        }
        onPrev={prev}
        onToday={goToday}
        onNext={next}
      />

      {/* 未配置タスク置き場: 予定日がまだ決まっていないタスク */}
      {unplacedTasks.length > 0 && (
        <section className={`rounded-xl border bg-white p-4 shadow-md ${placingTask ? "border-emerald-400" : "border-slate-200"}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">未配置のタスク（{unplacedTasks.length}件）</h3>
              <p className="mt-1 text-xs text-slate-500">
                {placingTask
                  ? `「${placingTask.title}」を配置する日をカレンダーでクリックしてください`
                  : "タスクを選んでからカレンダーの日付をクリックすると、予定日を設定できます。"}
              </p>
            </div>
            {placingTask && (
              <button
                onClick={() => setPlacingTaskId(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                選択解除
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {unplacedTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => setPlacingTaskId(placingTaskId === t.id ? null : t.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  placingTaskId === t.id
                    ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                }`}
              >
                {t.title}
                {t.dueDate && <span className="ml-2 text-xs text-slate-500">期限 {t.dueDate}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Issue #42 なぞって期間指定モードの案内バー。
          開始日から終了日までなぞる操作を促し、キャンセルできるようにする */}
      {rangeSelecting && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>開始日から終了日までカレンダーをなぞってください</span>
          <button
            onClick={() => {
              setRangeSelecting(false);
              setRangeStart(null);
              setRangeEnd(null);
            }}
            className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-100"
          >
            キャンセル
          </button>
        </div>
      )}

      {/* Issue #39/#42: カレンダーグリッドを包む section にタッチスワイプで期間移動を付ける。
          Issue #42 でマウスドラッグでの月/週移動は廃止し（PCは矢印キーに一本化）、タッチのみ残す。
          preventDefault はせず、縦スクロールやタップ（日付選択・配置）を妨げない。
          範囲選択モード中（rangeSelecting）は誤発火防止のためスワイプを無効化する */}
      <section
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-md"
        onTouchStart={(e) => {
          if (rangeSelecting) return;
          beginSwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }}
        onTouchEnd={(e) => {
          if (rangeSelecting) return;
          endSwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }}
      >
        <div className="flex items-center justify-between px-2">
          <div className="text-lg font-medium">{mode === "month" ? monthLabel : `${weekRange[0].getFullYear()}年 ${weekRange[0].getMonth() + 1}月 ${weekRange[0].getDate()}日 〜 ${weekRange[6].getMonth() + 1}/${weekRange[6].getDate()}`}</div>
        </div>

        {mode === "month" ? (
          /* ===== 月表示 =====
             以前は min-w-[680px] でモバイルに横スクロールを強制していたが、
             画面幅に収まるグリッドに変更 (Issue #14)。
             モバイルではセルを低くし、タスクは色ドットで表現する（下の day cells 参照） */
          <div className="mt-4">
            <div>
              {/* weekday headers */}
              <div className="grid grid-cols-7 gap-1">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500">{d}</div>
                ))}
              </div>

              {/* weeks */}
              <div className="space-y-1">
                {monthMatrix.map((week, wi) => {
                  const weekStart = week[0];
                  const weekEnd = week[6];

                  // events that overlap this week（ドラッグ中はプレビュー反映のため displayTasks を使う）
                  const events = displayTasks
                    .map((t) => {
                      const startKey = t.scheduledDate ?? t.dueDate ?? null;
                      const endKey = t.dueDate ?? t.scheduledDate ?? null;
                      if (!startKey) return null;
                      const start = new Date(`${startKey}T00:00:00`);
                      const end = new Date(`${endKey}T00:00:00`);
                      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
                      return { task: t, start, end };
                    })
                    .filter(Boolean) as { task: Task; start: Date; end: Date }[];

                  const overlapping = events.filter(({ start, end }) => !(end < weekStart || start > weekEnd));

                  // compute per-day top-2 map for this week to limit visible segments
                  const dayTopMap: Record<string, Set<string>> = {};
                  week.forEach((d) => {
                    const key = formatDate(d);
                    const items = tasksForDate(d)
                      .slice()
                      .sort((a, b) => taskDisplayScore(b) - taskDisplayScore(a))
                      .slice(0, 2);
                    dayTopMap[key] = new Set(items.map((t) => t.id));
                  });

                  // build segments for week based on per-day top-2 selection
                  // For each day, dayTopMap contains top-2 task ids; coalesce consecutive days per task into segments
                  const idToTask = new Map<string, Task>();
                  displayTasks.forEach((t) => idToTask.set(t.id, t));

                  const idToIndices = new Map<string, number[]>();
                  week.forEach((d, idx) => {
                    const key = formatDate(d);
                    const s = dayTopMap[key] ?? new Set<string>();
                    s.forEach((id) => {
                      if (!idToIndices.has(id)) idToIndices.set(id, []);
                      idToIndices.get(id)!.push(idx);
                    });
                  });

                  let segments: { task: Task; startIndex: number; length: number; segStart: Date; segEnd: Date }[] = [];
                  idToIndices.forEach((indices, id) => {
                    indices.sort((a, b) => a - b);
                    let startIdx = indices[0];
                    let prev = indices[0];
                    for (let i = 1; i <= indices.length; i++) {
                      const cur = indices[i];
                      if (cur === prev + 1) {
                        prev = cur;
                        continue;
                      }
                      // emit segment from startIdx..prev
                      const segStart = week[startIdx];
                      const segEnd = week[prev];
                      const startIndex = startIdx;
                      const length = prev - startIdx + 1;
                      const task = idToTask.get(id)!;
                      if (task) segments.push({ task, startIndex, length, segStart, segEnd });
                      // start new
                      startIdx = cur;
                      prev = cur;
                    }
                  });

                  // stack segments by assigning row index to avoid vertical overlap
                  const rows: Array<{ task: Task; startIndex: number; length: number; segStart: Date; segEnd: Date }[]> = [];
                  segments.forEach((seg) => {
                    let placed = false;
                    for (const row of rows) {
                      const conflict = row.some((r) => !(seg.startIndex + seg.length - 1 < r.startIndex || seg.startIndex > r.startIndex + r.length - 1));
                      if (!conflict) {
                        row.push(seg);
                        placed = true;
                        break;
                      }
                    }
                    if (!placed) rows.push([seg]);
                  });

                  const maxRows = 2;

                  return (
                    <div key={wi} className="relative grid grid-cols-7 gap-1">
                  
                      {/* day cells */}
                      {week.map((d) => {
                        const key = formatDate(d);
                        const isCurrentMonth = d.getMonth() === cursor.getMonth();
                        const isToday = formatDate(d) === formatDate(today);
                        const items = tasksForDate(d);
                        const isSelected = selectedDate === key;

                        const inRange = inSelectingRange(key);

                        return (
                          /* 日付セル1個分。クリックの挙動は2通り:
                             - 未配置タスクを選択中 → その日に配置 (placeTask)
                             - 通常時 → その日を選択して下部に詳細パネルを表示
                             範囲選択モード中は pointerdown でなぞり選択を開始し、click（選択/配置）は無効化する。
                             data-date は Issue #42 のなぞり選択・バー端ドラッグで elementFromPoint から日付を引くために付与 */
                          <div
                            key={key}
                            data-date={key}
                            style={rangeSelecting ? { touchAction: "none" } : undefined}
                            onPointerDown={(e) => {
                              if (!rangeSelecting) return;
                              e.preventDefault();
                              startRangeDrag(key);
                            }}
                            onClick={() => {
                              // なぞり選択の pointerup 直後の click は握りつぶす
                              if (suppressClick.current) {
                                suppressClick.current = false;
                                return;
                              }
                              if (rangeSelecting) return;
                              if (placeTask(key)) return;
                              setSelectedDate(isSelected ? null : key);
                            }}
                            className={`cursor-pointer min-h-[64px] sm:min-h-[110px] overflow-hidden rounded-md border p-1.5 sm:p-2 ${isCurrentMonth ? 'bg-white' : 'bg-slate-50 opacity-60'} ${inRange ? 'bg-emerald-100 ring-2 ring-emerald-300' : ''} ${isSelected ? 'ring-2 ring-emerald-300' : ''} ${placingTaskId ? 'hover:ring-2 hover:ring-emerald-400' : ''}`}
                          >
                            {/* セル上段: 日付の数字（今日は緑丸で強調）と、タスク件数 */}
                            <div className="flex items-center justify-between">
                              <div className={`text-xs sm:text-sm ${isToday ? 'rounded-full bg-emerald-600 px-1.5 py-0.5 sm:px-2 sm:py-1 text-white' : 'text-slate-700'}`}>
                                <span>{d.getDate()}</span>
                              </div>
                              <div className="hidden sm:block text-xs text-slate-400">{items.length ? `${items.length}` : ''}</div>
                            </div>

                            {/* モバイル用: タスクを色ドットで表現（最大3個 + 超過分は +N）。
                                バー表示はセルが小さすぎて読めないため、
                                「ドットで存在を示し、タップで下の詳細パネルを見る」方式 (Issue #13 の調査より) */}
                            <div className="mt-1 flex items-center gap-0.5 sm:hidden">
                              {items.slice(0, 3).map((t) => (
                                <span
                                  key={t.id}
                                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                                    t.status === 'done' ? 'bg-emerald-400' : t.status === 'doing' ? 'bg-blue-400' : 'bg-amber-400'
                                  }`}
                                />
                              ))}
                              {items.length > 3 && <span className="text-[10px] text-slate-500">+{items.length - 3}</span>}
                            </div>

                            {/* デスクトップ用: バー表示に収まらない分の「他N件」表示 */}
                            <div className="mt-2 hidden sm:block">
                              {(() => {
                                const keyFmt = formatDate(d);
                                const allItems = tasksForDate(d);
                                const selectedSet = dayTopMap[keyFmt] ?? new Set<string>();
                                const visibleCount = Math.min(2, selectedSet.size);
                                const more = Math.max(0, allItems.length - visibleCount);
                                return (
                                  <>
                                    {more > 0 && <div className="mt-1 text-xs text-slate-500">他{more}件</div>}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}

                      {/* end week.map */}

                      {/* event bars overlay（タスク名入りの横棒）。
                          セルの上に重ねて描画するデスクトップ専用の表示。
                          モバイルはセルが小さく読めないため hidden sm:block で消し、
                          代わりにセル内の色ドット（上記）で件数を伝える (Issue #14) */}
                      <div className="absolute inset-x-0 top-12 px-2 pointer-events-none hidden sm:block">
                        <div className="relative h-0">
                          {rows.slice(0, maxRows).map((row, ri) => (
                            <div key={ri} className="absolute left-0 right-0" style={{ top: ri * 28 }}>
                              {row.map((seg, i) => {
                                const left = (seg.startIndex / 7) * 100;
                                const width = (seg.length / 7) * 100;
                                const bg = seg.task.status === 'done' ? 'bg-emerald-200' : seg.task.status === 'doing' ? 'bg-blue-200' : 'bg-amber-200';
                                // Issue #42: このセグメントがタスクの実際の開始日/終了日を含むか。
                                // 含む端にだけドラッグハンドルを出す（週をまたぐタスクの中間セグメントには出さない）
                                const taskStartKey = seg.task.scheduledDate ?? seg.task.dueDate ?? null;
                                const taskEndKey = seg.task.dueDate ?? seg.task.scheduledDate ?? null;
                                const isStartSeg = taskStartKey !== null && formatDate(seg.segStart) === taskStartKey;
                                const isEndSeg = taskEndKey !== null && formatDate(seg.segEnd) === taskEndKey;
                                return (
                                  <div key={seg.task.id} title={seg.task.title} className={`absolute h-7 overflow-hidden text-xs font-medium text-slate-800 shadow-sm`} style={{ left: `${left}%`, width: `${width}%` }}>
                                    <div className={`${bg} rounded-md px-2 py-1 truncate` + (seg.startIndex === 0 ? ' rounded-l-lg' : '') + (seg.startIndex + seg.length === 7 ? ' rounded-r-lg' : '')}>
                                      {seg.task.title}
                                    </div>
                                    {/* Issue #42 期間変更ハンドル（デスクトップ・マウス限定）。
                                        pointer-events-auto でこの8px幅だけドラッグ可能にする。
                                        親オーバーレイは pointer-events-none なのでバー本体はセルのクリックを妨げない */}
                                    {isStartSeg && (
                                      <div
                                        onPointerDown={(e) => startBarDrag(seg.task, "start", e)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute left-0 top-0 h-7 w-2 cursor-ew-resize rounded-l-md bg-slate-500/30 pointer-events-auto hover:bg-slate-600/50"
                                        aria-label="開始日を変更"
                                      />
                                    )}
                                    {isEndSeg && (
                                      <div
                                        onPointerDown={(e) => startBarDrag(seg.task, "end", e)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 top-0 h-7 w-2 cursor-ew-resize rounded-r-md bg-slate-500/30 pointer-events-auto hover:bg-slate-600/50"
                                        aria-label="終了日を変更"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}

                          {/* more indicator */}
                          {rows.length > maxRows && (
                            <div className="absolute right-2" style={{ top: maxRows * 28 }}>
                              <div className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">+{rows.length - maxRows} more</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ===== 週表示 =====
             デスクトップ: 7列の横並び。
             モバイル: 以前は min-w-[700px] で横スクロールだったが、
             1列の縦リスト（アジェンダ形式）に変更 (Issue #14)。
             grid-cols-1 sm:grid-cols-7 = モバイル1列 → sm(640px)以上で7列 */
          <div className="mt-4">
            <div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
                {weekRange.map((d) => {
                  const key = formatDate(d);
                  const startKey = formatDate(weekRange[0]);
                  const endKey = formatDate(weekRange[6]);
                  const isStart = key === startKey;
                  const isEnd = key === endKey;

                  const inRange = inSelectingRange(key);

                  return (
                    <div
                      key={formatDate(d)}
                      data-date={key}
                      style={rangeSelecting ? { touchAction: "none" } : undefined}
                      onPointerDown={(e) => {
                        if (!rangeSelecting) return;
                        e.preventDefault();
                        startRangeDrag(key);
                      }}
                      onClick={() => {
                        if (suppressClick.current) {
                          suppressClick.current = false;
                          return;
                        }
                        if (rangeSelecting) return;
                        placeTask(key);
                      }}
                      className={`rounded-md border bg-white p-3 ${inRange ? 'bg-emerald-100 ring-2 ring-emerald-300' : ''} ${!isStart && !isEnd ? '' : 'opacity-100'} ${placingTaskId ? 'cursor-pointer hover:ring-2 hover:ring-emerald-400' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {isStart && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">開始</span>}
                          {isEnd && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">終了</span>}
                        </div>
                        <div className="text-xs text-slate-400">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                      </div>

                      <div className="mt-3">
                        {(() => {
                          const items = tasksForDate(d);
                          const visible = items
                            .slice()
                            .sort((a, b) => taskDisplayScore(b) - taskDisplayScore(a))
                            .slice(0, 2);
                          const more = items.length - visible.length;
                          return (
                            <>
                              {visible.map((t) => (
                                <TaskCard key={t.id} task={t} />
                              ))}
                              {more > 0 && <div className="mt-1 text-xs text-slate-500">他{more}件</div>}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {selectedDate && (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">{selectedDate}</p>
              <h3 className="mt-1 text-lg font-semibold">この日のタスク</h3>
            </div>
            <div>
              <button
                onClick={() => {
                  // 閉じるときは追加/編集の途中状態もリセットする
                  setSelectedDate(null);
                  resetAddForm();
                  setEditingTaskId(null);
                  setEditTitle("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm"
              >
                閉じる
              </button>
            </div>
          </div>

          <div className="mt-3">
            {tasksForSelectedKey(selectedDate).length === 0 ? (
              <p className="text-sm text-slate-500">この日のタスクはありません。</p>
            ) : (
              tasksForSelectedKey(selectedDate).map((t) => (
                <div key={t.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  {editingTaskId === t.id ? (
                    /* Issue #38 編集モード: その行がタイトルのインライン編集に切り替わる */
                    <div className="mb-2 min-w-0 flex-1">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          // 日本語IMEの変換確定Enterでは保存しない (Issue #24 と同様のガード)
                          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                          if (e.key === "Enter") {
                            e.preventDefault();
                            submitEdit(t);
                          }
                          if (e.key === "Escape") {
                            setEditingTaskId(null);
                            setEditTitle("");
                          }
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => submitEdit(t)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-emerald-700 transition hover:border-emerald-400/50 hover:bg-emerald-100"
                          aria-label="タイトルを保存"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingTaskId(null);
                            setEditTitle("");
                          }}
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
                          aria-label="編集をキャンセル"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
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
                          onClick={() => {
                            setEditingTaskId(t.id);
                            setEditTitle(t.title);
                          }}
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-indigo-400/50 hover:bg-indigo-100 hover:text-indigo-600"
                          aria-label="タスクを編集"
                        >
                          <Pencil size={18} />
                        </button>
                        {/* 削除ボタン（ゴミ箱） */}
                        <button
                          onClick={() => handleDelete(t)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-rose-400/50 hover:bg-rose-100 hover:text-rose-600"
                          aria-label="タスクを削除"
                        >
                          <Trash2 size={18} />
                        </button>
                        {t.scheduledDate && (
                          <button
                            onClick={() => rescheduleTask(t.id, null)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
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
          <div className="mt-3 border-t border-slate-100 pt-3">
            {isAdding ? (
              <div className="flex flex-col gap-3">
                {/* タイトル（IMEの変換確定Enterでは送信しない） */}
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    // 日本語IMEの変換確定Enterでは追加しない (Issue #24 と同様のガード)
                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitAdd();
                    }
                    if (e.key === "Escape") {
                      resetAddForm();
                    }
                  }}
                  placeholder="タスクのタイトル"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                />

                {/* 開始日 / 終了日（TaskInput.tsx の同項目が手本） */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex flex-col">
                    <span className="mb-1 text-xs text-slate-600">開始日</span>
                    <input
                      type="date"
                      value={newStart ?? ""}
                      onChange={(e) => setNewStart(e.target.value || null)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                      aria-label="開始日"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="mb-1 text-xs text-slate-600">終了日（任意）</span>
                    <input
                      type="date"
                      value={newEnd ?? ""}
                      onChange={(e) => setNewEnd(e.target.value || null)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                      aria-label="終了日"
                    />
                  </label>
                </div>

                {/* 重さ / 見積時間 / なぞって期間指定トグル */}
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col">
                    <span className="mb-1 text-xs text-slate-600">重さ</span>
                    <select
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value as TaskWeight)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                      aria-label="重さ"
                    >
                      <option value="light">軽め</option>
                      <option value="medium">普通</option>
                      <option value="heavy">重め</option>
                    </select>
                  </label>
                  <label className="flex flex-col">
                    <span className="mb-1 text-xs text-slate-600">見積時間 (h)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={newEstimateHours === "" ? "" : String(newEstimateHours)}
                      onChange={(e) => setNewEstimateHours(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="h"
                      className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                      aria-label="見積時間"
                    />
                  </label>
                  {/* Issue #42 なぞって期間指定モードへ入る/抜けるトグル */}
                  <button
                    type="button"
                    onClick={() => {
                      if (rangeSelecting) {
                        setRangeSelecting(false);
                        setRangeStart(null);
                        setRangeEnd(null);
                      } else {
                        setRangeSelecting(true);
                      }
                    }}
                    className={`h-11 rounded-lg border px-3 py-2 text-sm transition ${
                      rangeSelecting
                        ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
                    }`}
                  >
                    {rangeSelecting ? "なぞり選択を終了" : "カレンダーで期間を選ぶ"}
                  </button>
                </div>

                {/* 終了日 < 開始日 などのエラー（rose 色） */}
                {addError && <div className="text-sm text-rose-600">{addError}</div>}

                <div className="flex items-center gap-2">
                  <button
                    onClick={submitAdd}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    追加
                  </button>
                  <button
                    onClick={resetAddForm}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={openAdd}
                className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-emerald-400 hover:text-emerald-700"
              >
                <Plus size={16} />
                この日にタスクを追加
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
