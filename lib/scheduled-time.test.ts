import { describe, expect, it } from "vitest";
import { formatScheduledTimeRange, validateScheduledTimeRange } from "@/lib/scheduled-time";

describe("formatScheduledTimeRange", () => {
  it("両方あるときは範囲で返す", () => {
    expect(formatScheduledTimeRange("09:00", "10:30")).toBe("09:00–10:30");
  });

  it("片方だけならその時刻だけ返す", () => {
    expect(formatScheduledTimeRange("09:00", null)).toBe("09:00");
    expect(formatScheduledTimeRange(null, "10:30")).toBe("10:30");
  });

  it("どちらも無ければ null（終日扱いで時刻行を出さない）", () => {
    expect(formatScheduledTimeRange(null, null)).toBeNull();
    expect(formatScheduledTimeRange(undefined, undefined)).toBeNull();
  });

  it("空文字は未入力として扱う（<input type=\"time\"> の初期値）", () => {
    expect(formatScheduledTimeRange("", "")).toBeNull();
    expect(formatScheduledTimeRange("09:00", "")).toBe("09:00");
  });
});

describe("validateScheduledTimeRange", () => {
  it("開始 < 終了 は通す", () => {
    expect(validateScheduledTimeRange("09:00", "10:30")).toBeNull();
  });

  it("開始 > 終了 はエラーにする", () => {
    expect(validateScheduledTimeRange("18:00", "09:00")).toBe("終了時刻は開始時刻以降にしてください");
  });

  it("同時刻は所要 0 分の予定として許可する", () => {
    expect(validateScheduledTimeRange("10:00", "10:00")).toBeNull();
  });

  it("片方だけの入力は検証対象外", () => {
    expect(validateScheduledTimeRange("18:00", null)).toBeNull();
    expect(validateScheduledTimeRange(null, "09:00")).toBeNull();
    expect(validateScheduledTimeRange(null, null)).toBeNull();
  });

  it("分だけが違うケースも正しく比較する（辞書順比較の確認）", () => {
    expect(validateScheduledTimeRange("09:30", "09:05")).toBe("終了時刻は開始時刻以降にしてください");
    expect(validateScheduledTimeRange("09:05", "09:30")).toBeNull();
  });
});
