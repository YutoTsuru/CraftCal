import { describe, expect, it } from "vitest";
import {
  clampBarDragRange,
  getSwipeDirection,
  isDateInRange,
  normalizeDateRange,
  resolveSelectionRange,
  SWIPE_THRESHOLD_PX
} from "@/lib/calendar-interaction";

describe("normalizeDateRange", () => {
  it("順方向はそのまま", () => {
    expect(normalizeDateRange("2026-08-01", "2026-08-05")).toEqual({
      start: "2026-08-01",
      end: "2026-08-05"
    });
  });

  it("逆方向になぞったときは入れ替える", () => {
    expect(normalizeDateRange("2026-08-05", "2026-08-01")).toEqual({
      start: "2026-08-01",
      end: "2026-08-05"
    });
  });

  it("同じ日なら1日分の範囲になる", () => {
    expect(normalizeDateRange("2026-08-03", "2026-08-03")).toEqual({
      start: "2026-08-03",
      end: "2026-08-03"
    });
  });

  it("月をまたいでも日付順で並ぶ（辞書順比較の確認）", () => {
    expect(normalizeDateRange("2026-09-01", "2026-08-31")).toEqual({
      start: "2026-08-31",
      end: "2026-09-01"
    });
  });
});

describe("isDateInRange", () => {
  const range = { start: "2026-08-10", end: "2026-08-12" };

  it("両端を含む", () => {
    expect(isDateInRange("2026-08-10", range)).toBe(true);
    expect(isDateInRange("2026-08-12", range)).toBe(true);
  });

  it("範囲内", () => {
    expect(isDateInRange("2026-08-11", range)).toBe(true);
  });

  it("範囲外", () => {
    expect(isDateInRange("2026-08-09", range)).toBe(false);
    expect(isDateInRange("2026-08-13", range)).toBe(false);
  });

  it("範囲が無いときは常に false", () => {
    expect(isDateInRange("2026-08-11", null)).toBe(false);
  });
});

describe("resolveSelectionRange", () => {
  const base = {
    dragStart: null,
    dragEnd: null,
    rangeSelecting: false,
    formStart: null,
    formEnd: null
  };

  it("なぞっている最中はその範囲を返す", () => {
    expect(
      resolveSelectionRange({ ...base, dragStart: "2026-08-05", dragEnd: "2026-08-07" })
    ).toEqual({ start: "2026-08-05", end: "2026-08-07" });
  });

  it("なぞりが逆方向でも並べ直す", () => {
    expect(
      resolveSelectionRange({ ...base, dragStart: "2026-08-07", dragEnd: "2026-08-05" })
    ).toEqual({ start: "2026-08-05", end: "2026-08-07" });
  });

  it("指を離した後は範囲選択モード中だけフォームの値を源にする", () => {
    expect(
      resolveSelectionRange({
        ...base,
        rangeSelecting: true,
        formStart: "2026-08-05",
        formEnd: "2026-08-09"
      })
    ).toEqual({ start: "2026-08-05", end: "2026-08-09" });
  });

  it("範囲選択モードを抜けているならフォームに値があってもハイライトしない", () => {
    expect(
      resolveSelectionRange({ ...base, formStart: "2026-08-05", formEnd: "2026-08-09" })
    ).toBeNull();
  });

  it("終了日が未入力なら開始日だけの1日分になる", () => {
    expect(
      resolveSelectionRange({ ...base, rangeSelecting: true, formStart: "2026-08-05" })
    ).toEqual({ start: "2026-08-05", end: "2026-08-05" });
  });

  it("なぞり中の値はフォームより優先される", () => {
    expect(
      resolveSelectionRange({
        dragStart: "2026-08-01",
        dragEnd: "2026-08-02",
        rangeSelecting: true,
        formStart: "2026-08-20",
        formEnd: "2026-08-25"
      })
    ).toEqual({ start: "2026-08-01", end: "2026-08-02" });
  });

  it("どの源も無ければ null", () => {
    expect(resolveSelectionRange(base)).toBeNull();
  });
});

describe("clampBarDragRange", () => {
  const range = { start: "2026-08-10", end: "2026-08-15" };

  it("終了側を後ろへ伸ばす", () => {
    expect(clampBarDragRange("end", range, "2026-08-20")).toEqual({
      start: "2026-08-10",
      end: "2026-08-20"
    });
  });

  it("終了側を開始より前へ引いても開始でクランプされる（最小1日）", () => {
    expect(clampBarDragRange("end", range, "2026-08-01")).toEqual({
      start: "2026-08-10",
      end: "2026-08-10"
    });
  });

  it("開始側を前へ伸ばす", () => {
    expect(clampBarDragRange("start", range, "2026-08-01")).toEqual({
      start: "2026-08-01",
      end: "2026-08-15"
    });
  });

  it("開始側を終了より後ろへ押しても終了でクランプされる（最小1日）", () => {
    expect(clampBarDragRange("start", range, "2026-08-20")).toEqual({
      start: "2026-08-15",
      end: "2026-08-15"
    });
  });

  it("掴んでいない側は動かない", () => {
    expect(clampBarDragRange("end", range, "2026-08-12").start).toBe(range.start);
    expect(clampBarDragRange("start", range, "2026-08-12").end).toBe(range.end);
  });
});

describe("getSwipeDirection", () => {
  it("左へ払うと次の期間へ", () => {
    expect(getSwipeDirection(-80, 0)).toBe("next");
  });

  it("右へ払うと前の期間へ", () => {
    expect(getSwipeDirection(80, 0)).toBe("prev");
  });

  it("しきい値未満は無視する", () => {
    expect(getSwipeDirection(-(SWIPE_THRESHOLD_PX - 1), 0)).toBeNull();
  });

  it("しきい値ちょうどは反応する", () => {
    expect(getSwipeDirection(-SWIPE_THRESHOLD_PX, 0)).toBe("next");
  });

  it("縦が優勢なら無視する（縦スクロールで期間が飛ばないように）", () => {
    expect(getSwipeDirection(-80, 100)).toBeNull();
  });

  it("縦と横が同じでも無視する", () => {
    expect(getSwipeDirection(-80, 80)).toBeNull();
  });

  it("縦に動いていても横が優勢なら反応する", () => {
    expect(getSwipeDirection(-80, 30)).toBe("next");
  });

  it("動いていなければ無視する", () => {
    expect(getSwipeDirection(0, 0)).toBeNull();
  });
});
