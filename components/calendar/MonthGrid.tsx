"use client";

import type React from "react";
import { formatDate } from "@/lib/schedule";
import {
  MAX_BAR_LANES,
  buildWeekBarLayout,
  getTasksForDate,
  isMultiDayTask,
  taskDisplayScore
} from "@/lib/calendar-bars";
import type { Task } from "@/types/dev-calendar";

type Props = {
  /** 6週×7日の日付グリッド（lib/calendar-grid.ts の getMonthMatrix の結果） */
  weeks: Date[][];
  /** 表示中の月を判定するための基準日。この月以外のセルは薄く出す */
  cursor: Date;
  today: Date;
  /** 描画対象のタスク。バー端ドラッグ中はプレビュー値に差し替えたものが渡る */
  tasks: Task[];
  selectedDate: string | null;
  placingTaskId: string | null;
  rangeSelecting: boolean;
  /** その日がなぞり選択のハイライト範囲に入っているか */
  isInRange: (dateKey: string) => boolean;
  onCellClick: (dateKey: string) => void;
  onCellPointerDown: (dateKey: string, e: React.PointerEvent<HTMLDivElement>) => void;
  onBarHandlePointerDown: (task: Task, edge: "start" | "end", e: React.PointerEvent) => void;
};

// Issue #46: セル内チップ／週バーの状態色（done=緑 / doing=青 / その他=amber）。バーと同じ配色に統一。
function statusChipColor(status: Task["status"]) {
  return status === "done" ? "bg-lime-200" : status === "doing" ? "bg-amber-200" : "bg-amber-200";
}

/**
 * 月表示のカレンダーグリッド (Issue #56 で CalendarView.tsx から抽出)。
 *
 * 描画に徹していて、状態は持たない。クリックとドラッグ開始は呼び出し側へそのまま渡す
 * （なぞり選択中は無視する・未配置タスクを置く、といった分岐は CalendarView の担当）。
 *
 * 以前は min-w-[680px] でモバイルに横スクロールを強制していたが、
 * 画面幅に収まるグリッドに変更 (Issue #14)。
 * モバイルではセルを低くし、複数日バーの代わりにセル内のチップと「+N件」で伝える。
 *
 * 対応するUI: /calendar ページの Month タブ。
 */
export default function MonthGrid({
  weeks,
  cursor,
  today,
  tasks,
  selectedDate,
  placingTaskId,
  rangeSelecting,
  isInRange,
  onCellClick,
  onCellPointerDown,
  onBarHandlePointerDown
}: Props) {
  return (
    <div className="mt-4">
      <div>
        {/* weekday headers */}
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-stone-500">{d}</div>
          ))}
        </div>

        {/* weeks */}
        <div className="space-y-1">
          {weeks.map((week, wi) => {
            // Issue #56: 各日の上位N件の抽出・セグメントの結合・段の割り当ては
            // lib/calendar-bars.ts に切り出した。下の JSX が使っている名前に合わせて分割代入する
            const {
              lanes: rows,
              laneCount: barLaneCount,
              shownTaskIdsByDay: shownBarIdsByIndex
            } = buildWeekBarLayout(week, tasks);
            const maxRows = MAX_BAR_LANES;

            return (
              <div key={wi} className="relative grid grid-cols-7 gap-1">

                {/* day cells */}
                {week.map((d, di) => {
                  const key = formatDate(d);
                  const isCurrentMonth = d.getMonth() === cursor.getMonth();
                  const isToday = formatDate(d) === formatDate(today);
                  const items = getTasksForDate(tasks, d);
                  const isSelected = selectedDate === key;

                  const inRange = isInRange(key);

                  // Issue #46: 単日タスクはセル内にタスク名チップで表示（最大2件）。
                  const singleDayItems = items
                    .filter((t) => !isMultiDayTask(t))
                    .slice()
                    .sort((a, b) => taskDisplayScore(b) - taskDisplayScore(a));
                  const chipItems = singleDayItems.slice(0, 2);
                  // その日を通る（表示中の）バー数
                  const barsThrough = shownBarIdsByIndex[di]?.size ?? 0;
                  // 「+N件」= 全タスク数 −（表示チップ数 + 表示バー数）。負にならないようにclamp。
                  //  - デスクトップ: 複数日タスクはバーで見えるので差し引く（issueの式どおり）
                  //  - モバイル: バーは非表示なので複数日タスクも「隠れている件数」として +N に含める
                  const moreCountDesktop = Math.max(0, items.length - chipItems.length - barsThrough);
                  const moreCountMobile = Math.max(0, items.length - chipItems.length);

                  return (
                    /* 日付セル1個分。クリック・ドラッグ開始の中身は呼び出し側が決める。
                       data-date は Issue #42 のなぞり選択・バー端ドラッグで elementFromPoint から日付を引くために付与 */
                    <div
                      key={key}
                      data-date={key}
                      style={rangeSelecting ? { touchAction: "none" } : undefined}
                      onPointerDown={(e) => onCellPointerDown(key, e)}
                      onClick={() => onCellClick(key)}
                      className={`cursor-pointer h-24 sm:h-32 overflow-hidden rounded-md border p-1.5 sm:p-2 ${rangeSelecting ? 'touch-none' : ''} ${isCurrentMonth ? 'bg-surface' : 'bg-stone-100 opacity-60'} ${inRange ? 'bg-lime-100 ring-2 ring-lime-300' : ''} ${isSelected ? 'ring-2 ring-lime-300' : ''} ${placingTaskId ? 'hover:ring-2 hover:ring-lime-500' : ''}`}
                    >
                      {/* セル上段: 日付の数字（今日は緑丸で強調）と、タスク件数 */}
                      <div className="flex items-center justify-between">
                        <div className={`text-xs sm:text-sm ${isToday ? 'rounded-full bg-lime-700 px-1.5 py-0.5 sm:px-2 sm:py-1 text-white' : 'text-stone-700'}`}>
                          <span>{d.getDate()}</span>
                        </div>
                        <div className="hidden sm:block text-xs text-stone-400">{items.length ? `${items.length}` : ''}</div>
                      </div>

                      {/* Issue #46: 複数日バー用にセル上部へ確保する余白（デスクトップのみ）。
                          週内で同じ段数ぶん空けてバーの段を揃え、下のチップと重ならないようにする */}
                      {barLaneCount > 0 && (
                        <div className="hidden sm:block" style={{ height: barLaneCount * 28 }} aria-hidden />
                      )}

                      {/* Issue #46: 単日タスク名チップ（Googleカレンダー風）。最大2件。
                          pointer-events-none にしてタップはセル全体の選択挙動を維持する。
                          色はバーと同じ状態色（done=緑 / doing=青 / その他=amber）。
                          あふれた分（表示チップ＋表示バーを除く）は最下部に「+N件」で示す */}
                      <div className="mt-1 space-y-0.5">
                        {chipItems.map((t) => (
                          <div
                            key={t.id}
                            title={t.title}
                            className={`pointer-events-none truncate rounded px-1 py-0.5 text-[10px] leading-tight text-stone-800 sm:text-xs ${statusChipColor(t.status)}`}
                          >
                            {t.title}
                          </div>
                        ))}
                        {moreCountDesktop > 0 && (
                          <div className="hidden text-[10px] leading-tight text-stone-500 sm:block sm:text-xs">+{moreCountDesktop}件</div>
                        )}
                        {moreCountMobile > 0 && (
                          <div className="text-[10px] leading-tight text-stone-500 sm:hidden">+{moreCountMobile}件</div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* end week.map */}

                {/* event bars overlay（タスク名入りの横棒）。
                    セルの上に重ねて描画するデスクトップ専用の表示。
                    モバイルはセルが小さく読めないため hidden sm:block で消し、
                    代わりにセル内のチップで件数を伝える (Issue #14) */}
                <div className="absolute inset-x-0 top-8 px-2 pointer-events-none hidden sm:block">
                  <div className="relative h-0">
                    {rows.slice(0, maxRows).map((row, ri) => (
                      <div key={ri} className="absolute left-0 right-0" style={{ top: ri * 28 }}>
                        {row.map((seg) => {
                          const left = (seg.startIndex / 7) * 100;
                          const width = (seg.length / 7) * 100;
                          const bg = seg.task.status === 'done' ? 'bg-lime-200' : seg.task.status === 'doing' ? 'bg-amber-200' : 'bg-amber-200';
                          // Issue #42: このセグメントがタスクの実際の開始日/終了日を含むか。
                          // 含む端にだけドラッグハンドルを出す（週をまたぐタスクの中間セグメントには出さない）
                          const taskStartKey = seg.task.scheduledDate ?? seg.task.dueDate ?? null;
                          const taskEndKey = seg.task.dueDate ?? seg.task.scheduledDate ?? null;
                          const isStartSeg = taskStartKey !== null && formatDate(seg.segStart) === taskStartKey;
                          const isEndSeg = taskEndKey !== null && formatDate(seg.segEnd) === taskEndKey;
                          return (
                            <div key={seg.task.id} title={seg.task.title} className={`absolute h-7 overflow-hidden text-xs font-medium text-stone-800 shadow-sm`} style={{ left: `${left}%`, width: `${width}%` }}>
                              <div className={`${bg} rounded-md px-2 py-1 truncate` + (seg.startIndex === 0 ? ' rounded-l-lg' : '') + (seg.startIndex + seg.length === 7 ? ' rounded-r-lg' : '')}>
                                {seg.task.title}
                              </div>
                              {/* Issue #42 期間変更ハンドル（デスクトップ・マウス限定）。
                                  pointer-events-auto でこの8px幅だけドラッグ可能にする。
                                  親オーバーレイは pointer-events-none なのでバー本体はセルのクリックを妨げない */}
                              {isStartSeg && (
                                <div
                                  onPointerDown={(e) => onBarHandlePointerDown(seg.task, "start", e)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute left-0 top-0 h-7 w-2 cursor-ew-resize rounded-l-md bg-stone-500/30 pointer-events-auto hover:bg-stone-600/50"
                                  aria-label="開始日を変更"
                                />
                              )}
                              {isEndSeg && (
                                <div
                                  onPointerDown={(e) => onBarHandlePointerDown(seg.task, "end", e)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-0 h-7 w-2 cursor-ew-resize rounded-r-md bg-stone-500/30 pointer-events-auto hover:bg-stone-600/50"
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
                        <div className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">+{rows.length - maxRows} more</div>
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
  );
}
