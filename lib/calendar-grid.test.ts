import { describe, expect, it } from "vitest";
import {
  DAYS_PER_WEEK,
  MONTH_MATRIX_WEEKS,
  addDays,
  addMonths,
  getMonthMatrix,
  getWeekRange,
  startOfMonth
} from "@/lib/calendar-grid";

/** 比較しやすいよう "YYYY-MM-DD" にする（ローカル日付として読む） */
function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("startOfMonth", () => {
  it("その月の1日を返す", () => {
    expect(ymd(startOfMonth(new Date(2026, 7, 21)))).toBe("2026-08-01");
  });

  it("時刻は 00:00 になる", () => {
    const result = startOfMonth(new Date(2026, 7, 21, 15, 30, 45));
    expect([result.getHours(), result.getMinutes(), result.getSeconds()]).toEqual([0, 0, 0]);
  });
});

describe("addMonths", () => {
  it("翌月・前月の1日を返す", () => {
    expect(ymd(addMonths(new Date(2026, 7, 15), 1))).toBe("2026-09-01");
    expect(ymd(addMonths(new Date(2026, 7, 15), -1))).toBe("2026-07-01");
  });

  it("年をまたげる", () => {
    expect(ymd(addMonths(new Date(2026, 11, 10), 1))).toBe("2027-01-01");
    expect(ymd(addMonths(new Date(2026, 0, 10), -1))).toBe("2025-12-01");
  });

  it("月末を基準にしても翌々月へ飛ばない（日を1に固定しているため）", () => {
    // 1月31日の1か月後を「2月31日」と解釈すると3月3日になってしまう
    expect(ymd(addMonths(new Date(2026, 0, 31), 1))).toBe("2026-02-01");
  });
});

describe("addDays", () => {
  it("前後に動かせる", () => {
    expect(ymd(addDays(new Date(2026, 7, 10), 5))).toBe("2026-08-15");
    expect(ymd(addDays(new Date(2026, 7, 10), -5))).toBe("2026-08-05");
  });

  it("月末・年末をまたげる", () => {
    expect(ymd(addDays(new Date(2026, 7, 31), 1))).toBe("2026-09-01");
    expect(ymd(addDays(new Date(2026, 11, 31), 1))).toBe("2027-01-01");
  });

  it("うるう年の2月29日を正しく扱う", () => {
    expect(ymd(addDays(new Date(2028, 1, 28), 1))).toBe("2028-02-29");
    expect(ymd(addDays(new Date(2028, 1, 29), 1))).toBe("2028-03-01");
  });

  it("元の Date を書き換えない", () => {
    const original = new Date(2026, 7, 10);
    addDays(original, 5);
    expect(ymd(original)).toBe("2026-08-10");
  });
});

describe("getMonthMatrix", () => {
  const matrix = getMonthMatrix(new Date(2026, 7, 21)); // 2026年8月

  it("どの月でも 6週 × 7日 になる（セルの高さが月替わりで動かない）", () => {
    expect(matrix).toHaveLength(MONTH_MATRIX_WEEKS);
    for (const week of matrix) {
      expect(week).toHaveLength(DAYS_PER_WEEK);
    }
  });

  it("先頭はその月の1日を含む週の日曜", () => {
    // 2026-08-01 は土曜なので、その週の日曜は 2026-07-26
    expect(ymd(matrix[0][0])).toBe("2026-07-26");
    expect(matrix[0][0].getDay()).toBe(0);
  });

  it("全セルが連続した日付になっている", () => {
    const flat = matrix.flat();
    for (let i = 1; i < flat.length; i++) {
      expect(ymd(flat[i])).toBe(ymd(addDays(flat[i - 1], 1)));
    }
  });

  it("各行の先頭が日曜、末尾が土曜", () => {
    for (const week of matrix) {
      expect(week[0].getDay()).toBe(0);
      expect(week[6].getDay()).toBe(6);
    }
  });

  it("1日がちょうど日曜の月でも、その週から始まる", () => {
    // 2026-11-01 は日曜
    const november = getMonthMatrix(new Date(2026, 10, 15));
    expect(ymd(november[0][0])).toBe("2026-11-01");
  });

  it("年をまたぐ月でも連続する", () => {
    const december = getMonthMatrix(new Date(2026, 11, 15));
    const flat = december.flat();
    expect(flat.some((d) => d.getFullYear() === 2027)).toBe(true);
  });
});

describe("getWeekRange", () => {
  it("指定日を含む週の日曜〜土曜を返す", () => {
    // 2026-08-21 は金曜
    const week = getWeekRange(new Date(2026, 7, 21));
    expect(week).toHaveLength(DAYS_PER_WEEK);
    expect(ymd(week[0])).toBe("2026-08-16");
    expect(ymd(week[6])).toBe("2026-08-22");
  });

  it("日曜を渡したらその日が先頭になる", () => {
    const week = getWeekRange(new Date(2026, 7, 16)); // 日曜
    expect(ymd(week[0])).toBe("2026-08-16");
  });

  it("月をまたぐ週も連続する", () => {
    const week = getWeekRange(new Date(2026, 7, 31)); // 月曜
    expect(ymd(week[0])).toBe("2026-08-30");
    expect(ymd(week[6])).toBe("2026-09-05");
  });
});
