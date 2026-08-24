"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import { formatDate } from "@/lib/schedule";
import type { Task } from "@/types/dev-calendar";
import CalendarRangeHeader from "@/components/CalendarRangeHeader";
import { addDays, addMonths, getMonthMatrix, getWeekRange } from "@/lib/calendar-grid";
import { getTasksForDateKey } from "@/lib/calendar-bars";
import UnplacedTaskTray from "@/components/calendar/UnplacedTaskTray";
import MonthGrid from "@/components/calendar/MonthGrid";
import WeekGrid from "@/components/calendar/WeekGrid";
import DayDetailPanel from "@/components/calendar/DayDetailPanel";
import {
  clampBarDragRange,
  getSwipeDirection,
  isDateInRange,
  normalizeDateRange,
  resolveSelectionRange
} from "@/lib/calendar-interaction";

type ViewMode = "month" | "week";

export default function CalendarView() {
  // Issue #56: タスクの追加・編集・削除は選択日パネル側（components/calendar/）に移したので、
  // ここが直接使うのは一覧の取得と、未配置への付け替え・バー端ドラッグでの期間変更だけになった
  const { tasks, rescheduleTask, updateTask } = useDevCalendar();
  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // 未配置タスクの「配置モード」: 選択中のタスクID
  const [placingTaskId, setPlacingTaskId] = useState<string | null>(null);

  // Issue #42 追加フォームの期間（開始日/終了日）。
  // Issue #56: 追加フォームは DayTaskAddForm へ移したが、この2つだけはカレンダーの
  // 選択ハイライトと源を共有するため、ここに残して受け渡している
  const [newStart, setNewStart] = useState<string | null>(null);
  const [newEnd, setNewEnd] = useState<string | null>(null);

  // Issue #42 なぞって期間指定: 範囲選択モードの ON/OFF と、選択中の開始/終了候補日
  const [rangeSelecting, setRangeSelecting] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  // Issue #42 バー端ドラッグ: ドラッグ中のタスクIDと掴んでいる端（開始/終了）、および現在のプレビュー期間
  const [dragTask, setDragTask] = useState<{ id: string; edge: "start" | "end" } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ start: string; end: string } | null>(null);

  const today = useMemo(() => new Date(), []);

  const unplacedTasks = useMemo(
    () => tasks.filter((t) => !t.scheduledDate && t.status !== "done"),
    [tasks]
  );

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
    // Issue #46: 指を離す（pointerup）とキャンセル（pointercancel）の後始末は共通。
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      // 期間を追加フォームへ反映。ハイライトは以後 newStart/newEnd を源に描き続ける。
      // 逆方向になぞった場合の入れ替えは normalizeDateRange 側で行う
      const range = normalizeDateRange(startKey, endKey);
      setNewStart(range.start);
      setNewEnd(range.end);
      // ライブ表示用の一時 state だけ消す。範囲選択モードは維持し、もう一度なぞれば選び直せる。
      setRangeStart(null);
      setRangeEnd(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }

  // Issue #46: 選択ハイライトの表示源。どの範囲を光らせるかの判断は
  // lib/calendar-interaction.ts の resolveSelectionRange に置いた（テスト付き）。
  const selectionRange = resolveSelectionRange({
    dragStart: rangeStart,
    dragEnd: rangeEnd,
    rangeSelecting,
    formStart: newStart,
    formEnd: newEnd
  });

  function inSelectingRange(key: string) {
    return isDateInRange(key, selectionRange);
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
    // 掴んでいない側の基準になる元の期間。ドラッグ中は変えない
    const origin = { start: startKey, end: endKey };
    let preview = origin;
    setDragTask({ id: task.id, edge });
    setDragPreview(origin);
    const move = (ev: PointerEvent) => {
      const k = cellDateFromPoint(ev.clientX, ev.clientY);
      if (!k) return;
      // クランプ（掴んでいない側を追い越さない）は lib/calendar-interaction.ts 側で行う
      preview = clampBarDragRange(edge, origin, k);
      setDragPreview(preview);
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
        scheduledDate: preview.start,
        dueDate: preview.end,
        // Issue #51: バー端ドラッグは期間（日付）だけを変えるドラッグなので、時刻は既存値を維持する
        // （updateTask は単純代入のため、ここで明示的に渡さないと時刻が消えてしまう）
        scheduledStartTime: task.scheduledStartTime,
        scheduledEndTime: task.scheduledEndTime
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
    // しきい値と横優勢の判定（縦スクロールやタップを妨げないため）は
    // lib/calendar-interaction.ts の getSwipeDirection に置いた
    const direction = getSwipeDirection(x - start.x, y - start.y);
    if (direction === "next") next();
    else if (direction === "prev") prev();
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

  // Issue #56: 日付の格子を組み立てる純関数は lib/calendar-grid.ts へ移した。
  // コンポーネント内の関数だと毎レンダーで別物になり、useMemo の依存に入れると
  // メモ化が効かなくなる（react-hooks/exhaustive-deps の警告が出ていた）。
  // モジュール側にあれば参照が固定されるので、依存は cursor だけで足りる。
  const monthMatrix = useMemo(() => getMonthMatrix(cursor), [cursor]);
  const weekRange = useMemo(() => getWeekRange(cursor), [cursor]);

  // Issue #56: 日ごとの抽出は lib/calendar-bars.ts に移した。
  // グリッド側は自分で取り出すので、ここに残るのは選択日パネルへ渡すぶんだけ
  const tasksForSelectedKey = (key: string) => getTasksForDateKey(displayTasks, key);

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

  // Issue #56: セルの押下・クリックの分岐はグリッド側に持たせず、ここに集約する。
  // グリッド（MonthGrid / WeekGrid）は日付キーを渡してくるだけの描画担当にした。
  function handleCellPointerDown(dateKey: string, e: React.PointerEvent<HTMLDivElement>) {
    if (!rangeSelecting) return;
    e.preventDefault();
    // Issue #46: タッチでも pointermove/up が届くようポインタをこのセルにキャプチャする
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startRangeDrag(dateKey);
  }

  /**
   * クリックの挙動は2通り:
   *  - 未配置タスクを選択中 → その日に配置 (placeTask)
   *  - 通常時 → その日を選択して下部に詳細パネルを表示
   *
   * なぞり選択中の click は rangeSelecting のガードで丸ごと無視する。
   * 以前は suppressClick という ref でも同じことを狙っていたが、true を立てる箇所が
   * どこにも無く常に false のままだった（分割前から死んでいた）。なぞり選択は
   * rangeSelecting が true のときしか起きないので、このガードだけで足りる。
   */
  function handleCellClick(dateKey: string) {
    if (rangeSelecting) return;
    if (placeTask(dateKey)) return;
    setSelectedDate(selectedDate === dateKey ? null : dateKey);
  }

  // 週表示は月表示と違い、日付を押しても詳細パネルは開かない（未配置タスクの配置のみ）。
  // 抽出前からの挙動をそのまま保つため、ハンドラを分けている
  function handleWeekCellClick(dateKey: string) {
    if (rangeSelecting) return;
    placeTask(dateKey);
  }

  const monthLabel = `${cursor.getFullYear()}年 ${cursor.getMonth() + 1}月`;

  return (
    <div className="grid gap-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-lime-700">Calendar</p>
            <h2 className="mt-2 text-3xl font-bold">カレンダー</h2>
            <p className="mt-1 text-stone-400">月表示・週表示でタスクを確認できます。</p>
          </div>

          {/* 月表示/週表示の切替タブ。
              以前は hidden sm:flex でモバイル非表示だったが、モバイルでも切替できるよう常時表示に変更 (Issue #14)。
              py-2 はタップ領域確保のため */}
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-md bg-stone-100 p-1">
              <button onClick={() => setMode("month")} className={`rounded px-3 py-2 text-sm ${mode === "month" ? "bg-lime-700 text-white" : "text-stone-700"}`}>Month</button>
              <button onClick={() => setMode("week")} className={`rounded px-3 py-2 text-sm ${mode === "week" ? "bg-lime-700 text-white" : "text-stone-700"}`}>Week</button>
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
      <UnplacedTaskTray
        tasks={unplacedTasks}
        placingTaskId={placingTaskId}
        onToggle={(id) => setPlacingTaskId(placingTaskId === id ? null : id)}
        onClear={() => setPlacingTaskId(null)}
      />

      {/* Issue #42 なぞって期間指定モードの案内バー。
          開始日から終了日までなぞる操作を促し、キャンセルできるようにする */}
      {rangeSelecting && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-lime-300 bg-lime-50 px-4 py-3 text-sm text-lime-900">
          <span>開始日から終了日までカレンダーをなぞってください</span>
          <button
            onClick={() => {
              setRangeSelecting(false);
              setRangeStart(null);
              setRangeEnd(null);
            }}
            className="rounded-lg border border-lime-300 bg-surface px-3 py-1.5 text-xs text-lime-800 hover:bg-lime-100"
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
        className="rounded-xl border border-stone-200 bg-surface p-4 shadow-md"
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
          <MonthGrid
            weeks={monthMatrix}
            cursor={cursor}
            today={today}
            tasks={displayTasks}
            selectedDate={selectedDate}
            placingTaskId={placingTaskId}
            rangeSelecting={rangeSelecting}
            isInRange={inSelectingRange}
            onCellClick={handleCellClick}
            onCellPointerDown={handleCellPointerDown}
            onBarHandlePointerDown={startBarDrag}
          />
        ) : (
          <WeekGrid
            days={weekRange}
            tasks={displayTasks}
            placingTaskId={placingTaskId}
            rangeSelecting={rangeSelecting}
            isInRange={inSelectingRange}
            onCellClick={handleWeekCellClick}
            onCellPointerDown={handleCellPointerDown}
          />
        )}
      </section>

      {selectedDate && (
        <DayDetailPanel
          dateKey={selectedDate}
          tasks={tasksForSelectedKey(selectedDate)}
          onClose={() => setSelectedDate(null)}
          range={{
            start: newStart,
            end: newEnd,
            onChangeStart: setNewStart,
            onChangeEnd: setNewEnd,
            selecting: rangeSelecting,
            onToggleSelecting: () => {
              if (rangeSelecting) {
                setRangeSelecting(false);
                setRangeStart(null);
                setRangeEnd(null);
              } else {
                setRangeSelecting(true);
              }
            }
          }}
          onOpenAddForm={() => {
            // Issue #42 追加フォームを開くときは開始日を選択日で初期化する
            setNewStart(selectedDate);
            setNewEnd(null);
          }}
          onCloseAddForm={() => {
            // ハイライトの源になっている期間となぞり選択モードを戻す
            setNewStart(null);
            setNewEnd(null);
            setRangeSelecting(false);
            setRangeStart(null);
            setRangeEnd(null);
          }}
        />
      )}
    </div>
  );
}
