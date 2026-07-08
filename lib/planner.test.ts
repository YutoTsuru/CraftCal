import { describe, expect, it } from "vitest";
import { generateMockPlan, parsePlannerIntent, splitStaleSuggestions } from "@/lib/planner";
import type { ScheduleSuggestion } from "@/lib/planner";
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
