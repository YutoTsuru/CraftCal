import { describe, expect, it } from "vitest";
import {
  ALLOWED_ICON_TYPES,
  MAX_ICON_BYTES,
  buildIconPath,
  formatBytes,
  pickPastedImage,
  validateIconFile
} from "@/lib/project-icon-rules";

describe("validateIconFile", () => {
  it.each(ALLOWED_ICON_TYPES)("%s は受け入れる", (type) => {
    const result = validateIconFile({ type, size: 1000 });
    expect(result.ok).toBe(true);
  });

  it("拡張子を MIME から決める", () => {
    const png = validateIconFile({ type: "image/png", size: 100 });
    const jpeg = validateIconFile({ type: "image/jpeg", size: 100 });
    expect(png.ok && png.extension).toBe("png");
    // JPEG は jpg に寄せる
    expect(jpeg.ok && jpeg.extension).toBe("jpg");
  });

  it("SVG は受け入れない（script を埋め込めるため）", () => {
    const result = validateIconFile({ type: "image/svg+xml", size: 100 });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("画像を選んでください");
  });

  it("画像以外は受け入れない", () => {
    expect(validateIconFile({ type: "application/pdf", size: 100 }).ok).toBe(false);
    expect(validateIconFile({ type: "", size: 100 }).ok).toBe(false);
  });

  it("上限を超えるサイズは弾き、実際のサイズと上限を理由に含める", () => {
    const result = validateIconFile({ type: "image/png", size: MAX_ICON_BYTES + 1 });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("2MB");
  });

  it("ちょうど上限なら受け入れる（境界）", () => {
    expect(validateIconFile({ type: "image/png", size: MAX_ICON_BYTES }).ok).toBe(true);
  });

  it("空ファイルは弾く", () => {
    const result = validateIconFile({ type: "image/png", size: 0 });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("空");
  });

  it("上限は呼び出し側で変えられる", () => {
    expect(validateIconFile({ type: "image/png", size: 500 }, { maxBytes: 100 }).ok).toBe(false);
  });
});

describe("formatBytes", () => {
  it("単位を切り替える", () => {
    expect(formatBytes(512)).toBe("512B");
    expect(formatBytes(2048)).toBe("2KB");
    expect(formatBytes(1024 * 1024)).toBe("1MB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5MB");
  });
});

describe("buildIconPath", () => {
  it("先頭が user_id になる（Storage のポリシーがこれで書き込みを制限している）", () => {
    const path = buildIconPath("user-1", "project-1", "png", 1000);
    expect(path.split("/")[0]).toBe("user-1");
  });

  it("差し替えるたびに違うパスになる（キャッシュに古い画像が残らないよう）", () => {
    const a = buildIconPath("user-1", "project-1", "png", 1000);
    const b = buildIconPath("user-1", "project-1", "png", 2000);
    expect(a).not.toBe(b);
  });

  it("拡張子が末尾に付く", () => {
    expect(buildIconPath("user-1", "project-1", "webp", 1000).endsWith(".webp")).toBe(true);
  });
});

describe("pickPastedImage", () => {
  it("画像が含まれていれば返す", () => {
    const png = { type: "image/png" };
    expect(pickPastedImage([png])).toBe(png);
  });

  it("複数あれば最初の画像を返す", () => {
    const first = { type: "image/png" };
    const second = { type: "image/jpeg" };
    expect(pickPastedImage([{ type: "text/plain" }, first, second])).toBe(first);
  });

  it("画像が無ければ null（テキストの貼り付けを横取りしないため）", () => {
    expect(pickPastedImage([{ type: "text/plain" }])).toBeNull();
    expect(pickPastedImage([])).toBeNull();
  });

  it("未設定でも落ちない", () => {
    expect(pickPastedImage(null)).toBeNull();
    expect(pickPastedImage(undefined)).toBeNull();
  });

  it("SVG も image/ なのでここでは拾う（弾くのは validateIconFile の役目）", () => {
    const svg = { type: "image/svg+xml" };
    expect(pickPastedImage([svg])).toBe(svg);
    expect(validateIconFile({ type: "image/svg+xml", size: 100 }).ok).toBe(false);
  });
});
