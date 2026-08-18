/**
 * lib/calendar-bars.ts: 月表示の「週またぎバー」の配置計算 (Issue #56)。
 *
 * もともと components/CalendarView.tsx の JSX の中に約80行べた書きされていた
 * ロジックを切り出したもの。週の行を描画するたびに走る計算で、
 * セグメントの結合と段の割り当てという間違えやすい処理を含むのに
 * テストが無かった。挙動は変えず、そのままここへ移してテストを付ける。
 *
 * 用語:
 *   セグメント … 1つの週の中で連続する日をつないだ1本のバー。
 *                 タスクが週をまたぐ場合は週ごとに別のセグメントになる。
 *   段 (lane)  … 同じ週で複数のバーが重なるときの縦位置。重ならないものは同じ段に詰める。
 *
 * 呼び出し元: components/CalendarView.tsx の月表示
 */

import { formatDate } from "@/lib/schedule";
import type { Task } from "@/types/dev-calendar";

/** 1日あたりに表示するバーの上限。これを超えたぶんはセルの「+N件」に回る */
export const MAX_BARS_PER_DAY = 2;

/** 1週間で確保するバーの段数の上限。セルの高さを揃えるため固定する */
export const MAX_BAR_LANES = 2;

/**
 * 期間持ち（複数日）タスクの判定 (Issue #46)。
 * 開始日と終了日が両方あり、かつ異なる日付のとき true。
 * 月表示では複数日タスクを週またぎのバーで、単日タスクをセル内チップで描き分ける。
 */
export function isMultiDayTask(task: Task): boolean {
  return !!(task.scheduledDate && task.dueDate && task.scheduledDate !== task.dueDate);
}

/**
 * 表示の優先順位スコア。1日に載せられるバーの本数に限りがあるため、
 * どれを残すかをこれで決める（作業中 > 未着手 > 完了、同順位なら優先度の高い順）。
 */
export function taskDisplayScore(task: Task): number {
  const statusScore = task.status === "doing" ? 2 : task.status === "todo" ? 1 : 0;
  const priorityScore = task.priority === "high" ? 2 : task.priority === "medium" ? 1 : 0;
  return statusScore * 10 + priorityScore;
}

/**
 * その日 ("YYYY-MM-DD") に「かかっている」タスクを返す。
 * 開始日〜終了日の範囲に含まれていれば対象（単日タスクは開始=終了）。
 * 日付が壊れている行は黙って除外する。
 *
 * CalendarView には Date 版とキー文字列版がほぼ同じ内容で2つ書かれていたため、
 * こちらを実体にして Date 版から呼ぶ形にまとめた (Issue #56)。
 */
export function getTasksForDateKey(tasks: Task[], key: string): Task[] {
  const target = new Date(`${key}T00:00:00`);
  if (Number.isNaN(target.getTime())) return [];

  return tasks.filter((task) => {
    const startKey = task.scheduledDate ?? task.dueDate ?? null;
    const endKey = task.dueDate ?? task.scheduledDate ?? null;
    if (!startKey || !endKey) return false;

    const start = new Date(`${startKey}T00:00:00`);
    const end = new Date(`${endKey}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

    return start.getTime() <= target.getTime() && target.getTime() <= end.getTime();
  });
}

/** getTasksForDateKey の Date 版 */
export function getTasksForDate(tasks: Task[], date: Date): Task[] {
  return getTasksForDateKey(tasks, formatDate(date));
}

/** 週の中の1本のバー */
export type WeekBarSegment = {
  task: Task;
  /** 週内の列位置 (0=日曜 〜 6=土曜) */
  startIndex: number;
  /** 何日ぶんまたぐか */
  length: number;
  segStart: Date;
  segEnd: Date;
};

export type WeekBarLayout = {
  /** 段ごとのセグメント。上限を超えたぶんも含む全段 */
  lanes: WeekBarSegment[][];
  /** 実際に描画する段数 (0〜maxLanes)。セル上部に確保する余白の高さに使う */
  laneCount: number;
  /** 曜日index → その日を通る「実際に描画される」バーのタスクID集合。セルの「+N件」計算に使う */
  shownTaskIdsByDay: Set<string>[];
};

/**
 * 1週間ぶんのバー配置を組み立てる。
 *
 * 手順:
 *   1. 各日について、複数日タスクをスコア順に上位 maxPerDay 件だけ残す
 *   2. 同じタスクが連続する日に残っていれば1本のセグメントにつなぐ
 *      （途中の日で上位から外れると、そこでバーが切れて2本になる）
 *   3. 重ならないセグメントを同じ段に詰める（先に来たものから順に空いている段へ）
 */
export function buildWeekBarLayout(
  week: Date[],
  tasks: Task[],
  {
    maxPerDay = MAX_BARS_PER_DAY,
    maxLanes = MAX_BAR_LANES
  }: { maxPerDay?: number; maxLanes?: number } = {}
): WeekBarLayout {
  const idToTask = new Map<string, Task>();
  for (const task of tasks) {
    idToTask.set(task.id, task);
  }

  // 1. 各日の上位 maxPerDay 件を求め、タスクIDごとに「その週で現れる列位置」を集める。
  //    Map の挿入順が後段の段割り当て順になるため、曜日の並び順で走査する
  const idToIndices = new Map<string, number[]>();
  week.forEach((date, index) => {
    const top = getTasksForDate(tasks, date)
      .filter(isMultiDayTask)
      .slice()
      .sort((a, b) => taskDisplayScore(b) - taskDisplayScore(a))
      .slice(0, maxPerDay);

    for (const task of top) {
      const indices = idToIndices.get(task.id);
      if (indices) {
        indices.push(index);
      } else {
        idToIndices.set(task.id, [index]);
      }
    }
  });

  // 2. 連続する列位置をひとまとめにしてセグメントにする
  const segments: WeekBarSegment[] = [];
  idToIndices.forEach((indices, id) => {
    const task = idToTask.get(id);
    if (!task) return;

    const sorted = [...indices].sort((a, b) => a - b);
    let startIdx = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i <= sorted.length; i++) {
      const current = sorted[i];
      if (current === prev + 1) {
        prev = current;
        continue;
      }
      // 連続が途切れた（または末尾に到達した）ので、ここまでを1本として確定する
      segments.push({
        task,
        startIndex: startIdx,
        length: prev - startIdx + 1,
        segStart: week[startIdx],
        segEnd: week[prev]
      });
      startIdx = current;
      prev = current;
    }
  });

  // 3. 重ならないものを同じ段に詰める（先着順に空いている段を探す）
  const lanes: WeekBarSegment[][] = [];
  for (const segment of segments) {
    const segEndIndex = segment.startIndex + segment.length - 1;
    const lane = lanes.find(
      (row) =>
        !row.some((placed) => {
          const placedEndIndex = placed.startIndex + placed.length - 1;
          // 「相手より完全に左」でも「完全に右」でもなければ重なっている
          return !(segEndIndex < placed.startIndex || segment.startIndex > placedEndIndex);
        })
    );

    if (lane) {
      lane.push(segment);
    } else {
      lanes.push([segment]);
    }
  }

  // 描画されるのは上限段まで。「+N件」の計算では隠れた段を数に入れてはいけない
  const shownTaskIdsByDay: Set<string>[] = week.map(() => new Set<string>());
  for (const lane of lanes.slice(0, maxLanes)) {
    for (const segment of lane) {
      for (let i = segment.startIndex; i < segment.startIndex + segment.length; i++) {
        shownTaskIdsByDay[i]?.add(segment.task.id);
      }
    }
  }

  return {
    lanes,
    laneCount: Math.min(lanes.length, maxLanes),
    shownTaskIdsByDay
  };
}
