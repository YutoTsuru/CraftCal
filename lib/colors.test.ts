import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_COLOR,
  GCAL_EVENT_COLORS,
  PALETTE_COLUMNS,
  PROJECT_COLORS,
  contrastRatioOnWhite,
  findPaletteColor,
  isPaletteColor,
  normalizeHex
} from "@/lib/colors";

describe("パレット定義", () => {
  it("10色ちょうどで、列数で割り切れる（グリッドが欠けない）", () => {
    expect(PROJECT_COLORS).toHaveLength(10);
    expect(PROJECT_COLORS.length % PALETTE_COLUMNS).toBe(0);
  });

  it("id・hex・gcalColorId に重複がない", () => {
    const unique = (values: string[]) => new Set(values).size === values.length;

    expect(unique(PROJECT_COLORS.map((c) => c.id))).toBe(true);
    expect(unique(PROJECT_COLORS.map((c) => c.hex))).toBe(true);
    expect(unique(PROJECT_COLORS.map((c) => c.gcalColorId))).toBe(true);
  });

  it("全色が正規化済みの6桁HEXで書かれている", () => {
    for (const color of PROJECT_COLORS) {
      expect(color.hex).toBe(normalizeHex(color.hex));
    }
  });

  it("gcalColorId は Google カレンダーの範囲 (1〜11) に収まっている", () => {
    for (const color of PROJECT_COLORS) {
      const id = Number(color.gcalColorId);
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(11);
    }
  });

  // gcalColorId だけだと対応ミスに気づけないため、併記した色名と突き合わせて検証する。
  // ID→色名の表 (GCAL_EVENT_COLORS) は3つの独立した情報源で一致を確認したもの。
  it("gcalColorId と gcalColorName の組み合わせが Google の定義と一致する", () => {
    for (const color of PROJECT_COLORS) {
      expect(GCAL_EVENT_COLORS[color.gcalColorId]).toBe(color.gcalColorName);
    }
  });

  it("デフォルト色がパレットに含まれている", () => {
    expect(isPaletteColor(DEFAULT_PROJECT_COLOR)).toBe(true);
  });
});

describe("コントラスト (Issue #57 の受け入れ基準)", () => {
  // バッジのドットや進捗バーは白いカードの上に置かれるため、
  // 非テキスト要素の基準 3:1 (WCAG 1.4.11) を全色が満たす必要がある。
  it.each(PROJECT_COLORS.map((c) => [c.labelJa, c.hex] as const))(
    "%s (%s) は白背景に対して 3:1 以上",
    (_label, hex) => {
      expect(contrastRatioOnWhite(hex)).toBeGreaterThanOrEqual(3);
    }
  );

  it("既知の値と一致する（計算式の回帰チェック）", () => {
    // 黒は 21:1、白は 1:1 になるのが WCAG の定義
    expect(contrastRatioOnWhite("#000000")).toBeCloseTo(21, 5);
    expect(contrastRatioOnWhite("#ffffff")).toBeCloseTo(1, 5);
  });

  it("旧デフォルトの emerald-500 は基準を割っていた（変更の根拠）", () => {
    expect(contrastRatioOnWhite("#10b981")).toBeLessThan(3);
  });
});

describe("normalizeHex", () => {
  it("大文字を小文字に揃える", () => {
    expect(normalizeHex("#E11D48")).toBe("#e11d48");
  });

  it("3桁表記を6桁に展開する", () => {
    expect(normalizeHex("#abc")).toBe("#aabbcc");
  });

  it("先頭の # がなくても受け付ける", () => {
    expect(normalizeHex("059669")).toBe("#059669");
  });

  it("前後の空白を無視する", () => {
    expect(normalizeHex("  #059669  ")).toBe("#059669");
  });

  it("HEXとして解釈できない値は null", () => {
    expect(normalizeHex("rgb(0,0,0)")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("#zzzzzz")).toBeNull();
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex(null)).toBeNull();
    expect(normalizeHex(undefined)).toBeNull();
  });
});

describe("findPaletteColor", () => {
  it("パレットの色を表記ゆれ込みで見つけられる", () => {
    expect(findPaletteColor("#059669")?.id).toBe("emerald");
    expect(findPaletteColor("#059669".toUpperCase())?.id).toBe("emerald");
  });

  it("パレット外の色は undefined（既存データの色を潰さないための判定）", () => {
    // 旧デフォルトの emerald-500。既存プロジェクトに残っている想定
    expect(findPaletteColor("#10b981")).toBeUndefined();
    expect(findPaletteColor(null)).toBeUndefined();
  });
});
