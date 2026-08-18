import { describe, expect, it } from "vitest";
import {
  MAX_BARS_PER_DAY,
  MAX_BAR_LANES,
  buildWeekBarLayout,
  getTasksForDate,
  isMultiDayTask,
  taskDisplayScore
} from "@/lib/calendar-bars";
import type { Task, TaskPriority, TaskStatus } from "@/types/dev-calendar";

// 2026-08-16(日) 〜 2026-08-22(土) の1週間
const WEEK = [16, 17, 18, 19, 20, 21, 22].map((d) => new Date(2026, 7, d));

let seq = 0;
function makeTask(overrides: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `task-${seq}`,
    projectId: "project-1",
    title: `タスク${seq}`,
    memo: "",
    weight: "medium",
    priority: "medium",
    dueDate: null,
    scheduledDate: null,
    estimatedMinutes: null,
    status: "todo",
    completedAt: null,
    completionNote: null,
    completionUrl: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides
  };
}

/** 期間つきタスクを作る（scheduledDate 〜 dueDate） */
function span(start: string, end: string, overrides: Partial<Task> = {}): Task {
  return makeTask({ scheduledDate: start, dueDate: end, ...overrides });
}

describe("isMultiDayTask", () => {
  it("開始と終了が異なる日付なら true", () => {
    expect(isMultiDayTask(span("2026-08-17", "2026-08-19"))).toBe(true);
  });

  it("同じ日付なら false（単日タスクはチップで表示する）", () => {
    expect(isMultiDayTask(span("2026-08-17", "2026-08-17"))).toBe(false);
  });

  it("どちらかが欠けていれば false", () => {
    expect(isMultiDayTask(makeTask({ scheduledDate: "2026-08-17" }))).toBe(false);
    expect(isMultiDayTask(makeTask({ dueDate: "2026-08-19" }))).toBe(false);
  });
});

describe("taskDisplayScore", () => {
  it("状態が優先度より強く効く（作業中 > 未着手 > 完了）", () => {
    const doingLow = makeTask({ status: "doing", priority: "low" });
    const todoHigh = makeTask({ status: "todo", priority: "high" });
    expect(taskDisplayScore(doingLow)).toBeGreaterThan(taskDisplayScore(todoHigh));
  });

  it("同じ状態なら優先度の高い順", () => {
    const statuses: TaskStatus[] = ["todo"];
    const priorities: TaskPriority[] = ["high", "medium", "low"];
    const scores = priorities.map((priority) =>
      taskDisplayScore(makeTask({ status: statuses[0], priority }))
    );
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
  });

  it("完了は最下位", () => {
    expect(taskDisplayScore(makeTask({ status: "done", priority: "high" }))).toBeLessThan(
      taskDisplayScore(makeTask({ status: "todo", priority: "low" }))
    );
  });
});

describe("getTasksForDate", () => {
  it("期間の内側の日を拾う（両端を含む）", () => {
    const task = span("2026-08-17", "2026-08-19");
    expect(getTasksForDate([task], new Date(2026, 7, 17))).toHaveLength(1);
    expect(getTasksForDate([task], new Date(2026, 7, 18))).toHaveLength(1);
    expect(getTasksForDate([task], new Date(2026, 7, 19))).toHaveLength(1);
  });

  it("期間の外側は拾わない", () => {
    const task = span("2026-08-17", "2026-08-19");
    expect(getTasksForDate([task], new Date(2026, 7, 16))).toHaveLength(0);
    expect(getTasksForDate([task], new Date(2026, 7, 20))).toHaveLength(0);
  });

  it("片方だけの日付は単日として扱う", () => {
    const onlyScheduled = makeTask({ scheduledDate: "2026-08-18" });
    expect(getTasksForDate([onlyScheduled], new Date(2026, 7, 18))).toHaveLength(1);
    expect(getTasksForDate([onlyScheduled], new Date(2026, 7, 19))).toHaveLength(0);
  });

  it("日付が無い・壊れているタスクは除外する", () => {
    expect(getTasksForDate([makeTask()], new Date(2026, 7, 18))).toHaveLength(0);
    expect(getTasksForDate([span("いつか", "2026-08-19")], new Date(2026, 7, 18))).toHaveLength(0);
  });
});

describe("buildWeekBarLayout", () => {
  it("単日タスクはバーにしない", () => {
    const layout = buildWeekBarLayout(WEEK, [span("2026-08-18", "2026-08-18")]);
    expect(layout.lanes).toHaveLength(0);
    expect(layout.laneCount).toBe(0);
  });

  it("週の内側に収まる期間は1本のセグメントになる", () => {
    const task = span("2026-08-17", "2026-08-19");
    const layout = buildWeekBarLayout(WEEK, [task]);

    expect(layout.lanes).toHaveLength(1);
    const [segment] = layout.lanes[0];
    expect(segment.startIndex).toBe(1); // 月曜
    expect(segment.length).toBe(3);
    expect(segment.task.id).toBe(task.id);
  });

  it("週をまたぐ期間は、その週にかかる範囲だけに切り詰められる", () => {
    // 前の週から次の週まで通しでかかるタスク
    const layout = buildWeekBarLayout(WEEK, [span("2026-08-10", "2026-08-30")]);

    const [segment] = layout.lanes[0];
    expect(segment.startIndex).toBe(0);
    expect(segment.length).toBe(7);
  });

  it("重なるバーは別々の段に積まれる", () => {
    const a = span("2026-08-17", "2026-08-19");
    const b = span("2026-08-18", "2026-08-20");
    const layout = buildWeekBarLayout(WEEK, [a, b]);

    expect(layout.lanes).toHaveLength(2);
    expect(layout.laneCount).toBe(2);
  });

  it("重ならないバーは同じ段に詰められる", () => {
    const a = span("2026-08-16", "2026-08-17");
    const b = span("2026-08-19", "2026-08-20");
    const layout = buildWeekBarLayout(WEEK, [a, b]);

    expect(layout.lanes).toHaveLength(1);
    expect(layout.lanes[0]).toHaveLength(2);
  });

  it("1日に載るバーは上限まで。溢れたタスクはスコアの低いものから外れる", () => {
    // 同じ期間で3本。作業中 > 未着手 > 完了 の順で2本だけ残る
    const doing = span("2026-08-17", "2026-08-19", { status: "doing", title: "作業中" });
    const todo = span("2026-08-17", "2026-08-19", { status: "todo", title: "未着手" });
    const done = span("2026-08-17", "2026-08-19", { status: "done", title: "完了" });

    const layout = buildWeekBarLayout(WEEK, [done, todo, doing]);
    const titles = layout.lanes.flat().map((s) => s.task.title);

    expect(titles).toHaveLength(MAX_BARS_PER_DAY);
    expect(titles).toContain("作業中");
    expect(titles).toContain("未着手");
    expect(titles).not.toContain("完了");
  });

  it("途中の日で上位から外れると、そこでバーが切れて2本になる", () => {
    // 長期タスクは週を通してかかるが、火〜木は優先度の高い2本に押し出される
    const long = span("2026-08-16", "2026-08-22", { status: "todo", priority: "low", title: "長期" });
    // 押し出し役。単日タスクはバー対象外なので期間つきにする（火〜木 = index 2〜4）
    const blockA = span("2026-08-18", "2026-08-20", { status: "doing", priority: "high", title: "A" });
    const blockB = span("2026-08-18", "2026-08-20", { status: "doing", priority: "high", title: "B" });

    const layout = buildWeekBarLayout(WEEK, [long, blockA, blockB]);
    const longSegments = layout.lanes.flat().filter((s) => s.task.title === "長期");

    // 日〜月 (0〜1) と 金〜土 (5〜6) の2本に分かれる
    expect(longSegments).toHaveLength(2);
    expect(longSegments[0].startIndex).toBe(0);
    expect(longSegments[0].length).toBe(2);
    expect(longSegments[1].startIndex).toBe(5);
    expect(longSegments[1].length).toBe(2);
  });

  it("段数の上限を超えても lanes には残るが、laneCount は上限で頭打ちになる", () => {
    // 全て同じ期間なので段が積み上がる。1日あたりの上限があるため maxPerDay を上げて検証する
    const tasks = [1, 2, 3].map((i) =>
      span("2026-08-17", "2026-08-19", { title: `重なり${i}` })
    );
    const layout = buildWeekBarLayout(WEEK, tasks, { maxPerDay: 3 });

    expect(layout.lanes.length).toBe(3);
    expect(layout.laneCount).toBe(MAX_BAR_LANES);
  });

  it("shownTaskIdsByDay には、隠れた段のバーを含めない", () => {
    const tasks = [1, 2, 3].map((i) =>
      span("2026-08-17", "2026-08-19", { title: `重なり${i}` })
    );
    const layout = buildWeekBarLayout(WEEK, tasks, { maxPerDay: 3 });

    // 月曜(index 1)を通るバーは3本あるが、描画されるのは上限段の2本だけ
    expect(layout.shownTaskIdsByDay[1].size).toBe(MAX_BAR_LANES);
    // バーがかからない日は空
    expect(layout.shownTaskIdsByDay[0].size).toBe(0);
  });

  it("曜日ごとの集合は7日ぶん必ず返る", () => {
    const layout = buildWeekBarLayout(WEEK, []);
    expect(layout.shownTaskIdsByDay).toHaveLength(7);
  });
});
