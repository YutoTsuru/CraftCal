import { describe, expect, it } from "vitest";
import { EXCERPT_MAX_LENGTH, toPlainTextExcerpt } from "@/lib/project-summary";

describe("toPlainTextExcerpt", () => {
  it("空・未設定は空文字", () => {
    expect(toPlainTextExcerpt("")).toBe("");
    expect(toPlainTextExcerpt(null)).toBe("");
    expect(toPlainTextExcerpt(undefined)).toBe("");
  });

  it("リンクは表示テキストだけ残す（カードの入れ子 <a> を防ぐ目的）", () => {
    expect(toPlainTextExcerpt("詳細は [GitHub](https://github.com/a/b) を見る")).toBe(
      "詳細は GitHub を見る"
    );
  });

  it("画像は丸ごと落とす", () => {
    expect(toPlainTextExcerpt("![スクショ](https://example.com/a.png) 説明")).toBe("説明");
  });

  it("見出し・引用・箇条書き・番号付きの記号を落とす", () => {
    expect(toPlainTextExcerpt("## 概要\n- 機能A\n- 機能B")).toBe("概要 機能A 機能B");
    expect(toPlainTextExcerpt("> 引用文")).toBe("引用文");
    expect(toPlainTextExcerpt("1. 最初\n2. 次")).toBe("最初 次");
  });

  it("強調とインラインコードの記号を外す", () => {
    expect(toPlainTextExcerpt("**太字** と `code` と _斜体_")).toBe("太字 と code と 斜体");
  });

  it("コードブロックは中身ごと落とす", () => {
    expect(toPlainTextExcerpt("説明\n\n```ts\nconst a = 1;\n```\n\n続き")).toBe("説明 続き");
  });

  it("水平線を落とす", () => {
    expect(toPlainTextExcerpt("前\n\n---\n\n後")).toBe("前 後");
  });

  it("改行を含む連続空白は1つにまとめる", () => {
    expect(toPlainTextExcerpt("A\n\n\nB   C")).toBe("A B C");
  });

  it("長い文章は指定長で切って省略記号を付ける", () => {
    const result = toPlainTextExcerpt("あ".repeat(200), 10);
    expect(result).toBe(`${"あ".repeat(10)}…`);
  });

  it("ちょうど上限の長さなら省略記号を付けない", () => {
    expect(toPlainTextExcerpt("あ".repeat(10), 10)).toBe("あ".repeat(10));
  });

  it("切った末尾が空白なら空白を落としてから省略記号を付ける", () => {
    expect(toPlainTextExcerpt("abcde fghij", 6)).toBe("abcde…");
  });

  it("既定の上限が定数と一致する", () => {
    const long = "x".repeat(EXCERPT_MAX_LENGTH + 50);
    expect(toPlainTextExcerpt(long)).toHaveLength(EXCERPT_MAX_LENGTH + 1); // 本文 + 省略記号
  });
});
