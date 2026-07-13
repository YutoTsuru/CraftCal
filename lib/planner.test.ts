import { describe, expect, it } from "vitest";
import { buildFreeSlots, generateMockPlan, parsePlannerIntent, splitStaleSuggestions } from "@/lib/planner";
import type { PlannerIntent, ScheduleSuggestion } from "@/lib/planner";
import { getTodayString } from "@/lib/schedule";
import type { Project, Task } from "@/types/dev-calendar";

let seq = 0;

function makeTask(overrides: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `task-${seq}`,
    projectId: "inbox",
    title: `タスク${seq}`,
    memo: "",
    weight: "medium",
    priority: "medium",
    dueDate: null,
    scheduledDate: null,
    estimatedMinutes: null,
    status: "todo",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    name: "CraftCal",
    description: null,
    overviewUrl: null,
    color: null,
    status: "active",
    goal: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("parsePlannerIntent", () => {
  it("デフォルトは今日・時間帯指定なし・通常優先", () => {
    const intent = parsePlannerIntent("予定を組んで");

    expect(intent.targetDate).toBe("today");
    expect(intent.timeWindow).toBe("anytime");
    expect(intent.difficulty).toBe("any");
    expect(intent.priorityMode).toBe("normal");
    expect(intent.durationLimitMinutes).toBeNull();
    expect(intent.projectName).toBeNull();
  });

  it("対象日を読み取る", () => {
    expect(parsePlannerIntent("明日の予定").targetDate).toBe("tomorrow");
    expect(parsePlannerIntent("今週中に進めたい").targetDate).toBe("thisWeek");
  });

  it("時間帯を読み取る", () => {
    expect(parsePlannerIntent("朝にやりたい").timeWindow).toBe("morning");
    expect(parsePlannerIntent("午後に進める").timeWindow).toBe("afternoon");
    expect(parsePlannerIntent("夜に作業").timeWindow).toBe("evening");
  });

  it("重さの希望を読み取る", () => {
    expect(parsePlannerIntent("軽めのタスクを入れて").difficulty).toBe("light");
    expect(parsePlannerIntent("がっつり集中したい").difficulty).toBe("heavy");
  });

  it("優先モードを読み取る", () => {
    expect(parsePlannerIntent("締切が近いものから").priorityMode).toBe("dueDate");
    expect(parsePlannerIntent("進行中のタスクを続けたい").priorityMode).toBe("inProgress");
    expect(parsePlannerIntent("短時間で終わるもの").priorityMode).toBe("short");
  });

  it("時間の上限を読み取る", () => {
    expect(parsePlannerIntent("30分だけ").durationLimitMinutes).toBe(30);
    expect(parsePlannerIntent("1時間で").durationLimitMinutes).toBe(60);
    expect(parsePlannerIntent("2時間とれる").durationLimitMinutes).toBe(120);
  });

  // Issue #30: ハードコードだった時間指定を正規表現で汎用化
  it("任意の時間指定を読み取る (90分・1時間半・4時間)", () => {
    expect(parsePlannerIntent("90分だけ作業").durationLimitMinutes).toBe(90);
    expect(parsePlannerIntent("1時間半とれる").durationLimitMinutes).toBe(90);
    expect(parsePlannerIntent("4時間がっつり").durationLimitMinutes).toBe(240);
  });

  it("プロジェクト名を検出する", () => {
    const projects = [makeProject({ name: "CraftCal" })];
    expect(parsePlannerIntent("craftcalを進めたい", projects).projectName).toBe("CraftCal");
    expect(parsePlannerIntent("別の作業", projects).projectName).toBeNull();
  });
});

describe("generateMockPlan", () => {
  it("タスクがない場合は提案ゼロで案内メッセージを返す", () => {
    const result = generateMockPlan("今日の予定を組んで", [], []);

    expect(result.suggestions).toEqual([]);
    expect(result.message).toContain("見つかりませんでした");
  });

  it("未完了タスクから提案を作る", () => {
    const task = makeTask({ title: "実装作業", estimatedMinutes: 60 });
    const result = generateMockPlan("今日の予定を組んで", [task], []);

    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].taskId).toBe(task.id);
    expect(result.suggestions[0].taskTitle).toBe("実装作業");
  });

  it("完了済みタスクは提案に含めない", () => {
    const done = makeTask({ status: "done" });
    const result = generateMockPlan("今日の予定を組んで", [done], []);

    expect(result.suggestions).toEqual([]);
  });

  it("提案は最大3件まで", () => {
    const tasks = Array.from({ length: 10 }, () => makeTask({ estimatedMinutes: 30 }));
    const result = generateMockPlan("今日の予定を組んで", tasks, []);

    expect(result.suggestions.length).toBeLessThanOrEqual(3);
  });

  it("軽め希望のときは重いタスクより軽いタスクを優先する", () => {
    const heavy = makeTask({ weight: "heavy", title: "重い作業" });
    const light = makeTask({ weight: "light", title: "軽い作業" });
    const result = generateMockPlan("今日は軽めのタスクを入れて", [heavy, light], []);

    expect(result.suggestions[0].taskTitle).toBe("軽い作業");
  });

  it("時間上限を守る", () => {
    const tasks = [
      makeTask({ estimatedMinutes: 60 }),
      makeTask({ estimatedMinutes: 60 }),
      makeTask({ estimatedMinutes: 60 })
    ];
    const result = generateMockPlan("1時間だけ作業したい", tasks, []);
    const total = result.suggestions.reduce((sum, s) => sum + s.estimatedMinutes, 0);

    expect(total).toBeLessThanOrEqual(60);
  });

  it("同じタスクを二重に提案しない", () => {
    const tasks = [makeTask(), makeTask()];
    const result = generateMockPlan("今週の予定を組んで", tasks, []);
    const ids = result.suggestions.map((s) => s.taskId);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("提案時間はブロック同士が重ならない", () => {
    const tasks = [makeTask({ estimatedMinutes: 30 }), makeTask({ estimatedMinutes: 30 }), makeTask({ estimatedMinutes: 30 })];
    const result = generateMockPlan("今日の夜に予定を組んで", tasks, []);

    const sameDay = result.suggestions.filter((s) => s.date === result.suggestions[0]?.date);
    for (let i = 1; i < sameDay.length; i++) {
      expect(sameDay[i].startTime >= sameDay[i - 1].endTime).toBe(true);
    }
  });

  it("プロジェクト名を提案に含める", () => {
    const project = makeProject({ id: "p1", name: "CraftCal" });
    const task = makeTask({ projectId: "p1" });
    const result = generateMockPlan("今日の予定を組んで", [task], [project]);

    expect(result.suggestions[0].projectName).toBe("CraftCal");
  });

  // スコアが拮抗している(同条件)ときは代替案(B案)を用意する
  it("同条件のタスクが拮抗するときは代替案を返す", () => {
    const taskA = makeTask({ title: "タスクA", weight: "medium", priority: "medium", status: "todo", estimatedMinutes: 60 });
    const taskB = makeTask({ title: "タスクB", weight: "medium", priority: "medium", status: "todo", estimatedMinutes: 60 });
    const result = generateMockPlan("今日の予定を組んで", [taskA, taskB], []);

    expect(result.alternative).not.toBeNull();
    // 主案と代替案では選ばれる1件目のタスクが入れ替わる
    expect(result.alternative?.[0].taskId).not.toBe(result.suggestions[0].taskId);
  });

  // 明確にスコア差があるときは断定して1案のみ(代替案なし)
  it("スコア差が明確なときは代替案を返さない", () => {
    const strong = makeTask({ title: "進行中の重要作業", status: "doing", priority: "high", dueDate: getTodayString(), estimatedMinutes: 60 });
    const weak = makeTask({ title: "後回しでよい作業", status: "todo", priority: "low", dueDate: null, estimatedMinutes: 60 });
    const result = generateMockPlan("今日の予定を組んで", [strong, weak], []);

    expect(result.alternative).toBeNull();
  });

  // 候補が1件だけなら比較対象がないので代替案なし
  it("タスクが1件だけなら代替案を返さない", () => {
    const only = makeTask({ title: "唯一のタスク", estimatedMinutes: 60 });
    const result = generateMockPlan("今日の予定を組んで", [only], []);

    expect(result.alternative).toBeNull();
  });
});

// Issue #30: 現在時刻を考慮した空き時間計算のテスト。now を固定して検証する
describe("buildFreeSlots", () => {
  // intent を組み立てるヘルパー。timeWindow と targetDate 以外はデフォルト値
  function makeIntent(overrides: Partial<PlannerIntent> = {}): PlannerIntent {
    return {
      targetDate: "today",
      timeWindow: "anytime",
      difficulty: "any",
      priorityMode: "normal",
      durationLimitMinutes: null,
      projectName: null,
      ...overrides
    };
  }

  it("午後14:10の anytime → 昼の残り(14:30〜)から始まり、朝の窓は含まれない", () => {
    const now = new Date(2026, 0, 5, 14, 10); // 2026-01-05 14:10
    const slots = buildFreeSlots(makeIntent(), now);

    expect(slots[0].startTime).toBe("14:30");
    expect(slots[0].endTime).toBe("16:00");
    expect(slots[0].date).toBe("2026-01-05");
    // 朝(09:00)の窓が過去として除外されている
    expect(slots.some((s) => s.startTime === "09:00")).toBe(false);
    // 夜の窓は丸ごと残っている
    expect(slots.some((s) => s.startTime === "19:00" && s.date === "2026-01-05")).toBe(true);
  });

  it("23:00の anytime → 今日の窓は全て終わっているので明日の全窓になる", () => {
    const now = new Date(2026, 0, 5, 23, 0);
    const slots = buildFreeSlots(makeIntent(), now);

    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.date === "2026-01-06")).toBe(true);
  });

  it("12:00に朝を指定 → 今日の朝は終わっているので明日の朝になる", () => {
    const now = new Date(2026, 0, 5, 12, 0);
    const slots = buildFreeSlots(makeIntent({ timeWindow: "morning" }), now);

    expect(slots).toHaveLength(1);
    expect(slots[0].date).toBe("2026-01-06");
    expect(slots[0].startTime).toBe("09:00");
    expect(slots[0].endTime).toBe("11:00");
  });

  it("10:00に朝を指定 → 今日の朝の残り(10:00〜11:00)にクランプされる", () => {
    const now = new Date(2026, 0, 5, 10, 0);
    const slots = buildFreeSlots(makeIntent({ timeWindow: "morning" }), now);

    expect(slots).toHaveLength(1);
    expect(slots[0].date).toBe("2026-01-05");
    expect(slots[0].startTime).toBe("10:00");
    expect(slots[0].durationMinutes).toBe(60);
  });

  it("15:45に昼を指定 → 残り30分未満なので今日の昼は捨てて明日の昼になる", () => {
    const now = new Date(2026, 0, 5, 15, 45); // 切り上げ後16:00 → 昼窓(〜16:00)の残り0分
    const slots = buildFreeSlots(makeIntent({ timeWindow: "afternoon" }), now);

    expect(slots).toHaveLength(1);
    expect(slots[0].date).toBe("2026-01-06");
    expect(slots[0].startTime).toBe("13:00");
  });

  it("明日指定はクランプされない (現在時刻に関係なく窓そのまま)", () => {
    const now = new Date(2026, 0, 5, 23, 0);
    const slots = buildFreeSlots(makeIntent({ targetDate: "tomorrow", timeWindow: "evening" }), now);

    expect(slots).toHaveLength(1);
    expect(slots[0].date).toBe("2026-01-06");
    expect(slots[0].startTime).toBe("19:00");
  });

  it("generateMockPlan 経由でも過去時刻の提案が出ない", () => {
    const now = new Date(2026, 0, 5, 20, 30);
    const task = makeTask({ estimatedMinutes: 60 });
    const result = generateMockPlan("今日の予定を組んで", [task], [], now);

    for (const s of result.suggestions) {
      // 今日の提案なら 20:30 以降に開始すること
      if (s.date === "2026-01-05") {
        expect(s.startTime >= "20:30").toBe(true);
      }
    }
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

describe("splitStaleSuggestions", () => {
  function makeSuggestion(date: string): ScheduleSuggestion {
    return {
      date,
      dateLabel: date,
      startTime: "19:00",
      endTime: "20:00",
      taskId: `task-${date}`,
      taskTitle: "タスク",
      projectName: "Inbox",
      estimatedMinutes: 60,
      reason: ""
    };
  }

  it("今日以降の提案は valid、過去日付は stale に分ける", () => {
    const past = makeSuggestion("2026-01-01");
    const today = makeSuggestion("2026-01-05");
    const future = makeSuggestion("2026-01-06");

    const { valid, stale } = splitStaleSuggestions([past, today, future], "2026-01-05");

    expect(valid).toEqual([today, future]);
    expect(stale).toEqual([past]);
  });

  it("空配列は両方空を返す", () => {
    expect(splitStaleSuggestions([], "2026-01-05")).toEqual({ valid: [], stale: [] });
  });
});
