import { describe, expect, it } from "vitest";
import { getDueUrgencyScore } from "@/lib/due-score";

// lib/due-score.ts の境界値テスト。基準日は 2026-06-10 に固定する。
describe("getDueUrgencyScore", () => {
  const today = "2026-06-10";

  it("期限切れは 60", () => {
    expect(getDueUrgencyScore("2026-06-09", today)).toBe(60);
  });

  it("当日は 60", () => {
    expect(getDueUrgencyScore("2026-06-10", today)).toBe(60);
  });

  it("+1日は 40", () => {
    expect(getDueUrgencyScore("2026-06-11", today)).toBe(40);
  });

  it("+2日は 40", () => {
    expect(getDueUrgencyScore("2026-06-12", today)).toBe(40);
  });

  it("+3日は 20", () => {
    expect(getDueUrgencyScore("2026-06-13", today)).toBe(20);
  });

  it("+5日は 20", () => {
    expect(getDueUrgencyScore("2026-06-15", today)).toBe(20);
  });

  it("+6日は 0", () => {
    expect(getDueUrgencyScore("2026-06-16", today)).toBe(0);
  });

  it("期限なし（null / undefined / 空文字）は 0", () => {
    expect(getDueUrgencyScore(null, today)).toBe(0);
    expect(getDueUrgencyScore(undefined, today)).toBe(0);
    expect(getDueUrgencyScore("", today)).toBe(0);
  });

  it("不正な日付は 0", () => {
    expect(getDueUrgencyScore("not-a-date", today)).toBe(0);
    expect(getDueUrgencyScore("2026-06-10", "bad")).toBe(0);
  });
});
