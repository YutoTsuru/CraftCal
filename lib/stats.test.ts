import { describe, expect, it } from "vitest";
import { getStreakDays, getThisWeekWorkDays } from "@/lib/stats";
import type { DailyLog } from "@/types/dev-calendar";

function makeLog(date: string, overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    id: `${date}-${Math.random()}`,
    taskId: "task-1",
    date,
    did: "",
    blocked: "",
    next: "",
    doneToday: true,
    createdAt: "",
    updatedAt: "",
    ...overrides
  };
}

// 2026-11-09 は月曜、2026-11-15 は日曜
describe("getThisWeekWorkDays", () => {
  it("ログが空なら 0", () => {
    expect(getThisWeekWorkDays([], "2026-11-10")).toBe(0);
  });

  it("月曜当日は月曜のログだけ数える（前週の日曜は含めない）", () => {
    const logs = [makeLog("2026-11-08"), makeLog("2026-11-09")];
    expect(getThisWeekWorkDays(logs, "2026-11-09")).toBe(1);
  });

  it("日曜は同じ週の月曜〜日曜を数える（翌週月曜は含めない）", () => {
    const logs = [makeLog("2026-11-08"), makeLog("2026-11-09"), makeLog("2026-11-15"), makeLog("2026-11-16")];
    expect(getThisWeekWorkDays(logs, "2026-11-15")).toBe(2);
  });

  it("同じ日の複数ログは 1 日と数える", () => {
    const logs = [makeLog("2026-11-10"), makeLog("2026-11-10"), makeLog("2026-11-11")];
    expect(getThisWeekWorkDays(logs, "2026-11-11")).toBe(2);
  });

  it("月をまたぐ週でも月曜起点で数える", () => {
    // 2026-12-02(水) の週の月曜は 11-30
    const logs = [makeLog("2026-11-29"), makeLog("2026-11-30"), makeLog("2026-12-01")];
    expect(getThisWeekWorkDays(logs, "2026-12-02")).toBe(2);
  });
});

describe("getStreakDays", () => {
  it("ログが空なら 0", () => {
    expect(getStreakDays([], "2026-11-10")).toBe(0);
  });

  it("今日のログが無ければ 0（昨日までの連続は数えない）", () => {
    const logs = [makeLog("2026-11-09"), makeLog("2026-11-08")];
    expect(getStreakDays(logs, "2026-11-10")).toBe(0);
  });

  it("昨日まで 3 連続 + 今日ありなら 4", () => {
    const logs = ["2026-11-10", "2026-11-09", "2026-11-08", "2026-11-07"].map((d) => makeLog(d));
    expect(getStreakDays(logs, "2026-11-10")).toBe(4);
  });

  it("途切れた日があればそこまで", () => {
    const logs = [makeLog("2026-11-10"), makeLog("2026-11-09"), makeLog("2026-11-07")];
    expect(getStreakDays(logs, "2026-11-10")).toBe(2);
  });

  it("月・年をまたいでも連続を数える", () => {
    const logs = [makeLog("2027-01-01"), makeLog("2026-12-31"), makeLog("2026-12-30")];
    expect(getStreakDays(logs, "2027-01-01")).toBe(3);
  });
});
