import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAllDailyLogs } from "@/lib/dailyLogs";

const KEY = "craftcal-dailylogs";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** localStorage の最小スタブ。jsdom を入れずに挙動だけ確かめる */
function stubLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k)
    }
  });
  return store;
}

describe("clearAllDailyLogs", () => {
  it("作業ログのキーを消す", () => {
    const store = stubLocalStorage({ [KEY]: "[]" });

    clearAllDailyLogs();

    expect(store.has(KEY)).toBe(false);
  });

  it("他のキーには触らない", () => {
    const store = stubLocalStorage({ [KEY]: "[]", "craftcal-state": "{}", other: "x" });

    clearAllDailyLogs();

    expect(store.get("craftcal-state")).toBe("{}");
    expect(store.get("other")).toBe("x");
  });

  it("サーバー側（window が無い）で呼んでも落ちない", () => {
    vi.stubGlobal("window", undefined);
    expect(() => clearAllDailyLogs()).not.toThrow();
  });
});
