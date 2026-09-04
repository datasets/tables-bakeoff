import { describe, it, expect, vi } from "vitest";
import { time, formatMs, peakMemoryMB } from "../src/harness/metrics.js";

describe("time", () => {
  it("returns both the result and an elapsed measurement", () => {
    const { result, ms } = time(() => 6 * 7);
    expect(result).toBe(42);
    expect(ms).toBeGreaterThanOrEqual(0);
  });

  it("lets errors propagate rather than swallowing them", () => {
    expect(() => time(() => { throw new Error("boom"); })).toThrow("boom");
  });
});

describe("formatMs", () => {
  it("shows sub-millisecond timings without fake precision", () => {
    expect(formatMs(0.4)).toBe("<1 ms");
  });
  it("shows one decimal below 50ms", () => {
    expect(formatMs(12.34)).toBe("12.3 ms");
  });
  it("rounds above 50ms", () => {
    expect(formatMs(1234.5)).toBe("1235 ms");
  });
});

describe("peakMemoryMB", () => {
  it("returns null when performance.memory is unavailable", () => {
    vi.stubGlobal("performance", { now: () => 0 });
    expect(peakMemoryMB()).toBeNull();
    vi.unstubAllGlobals();
  });

  it("converts bytes to megabytes when available", () => {
    vi.stubGlobal("performance", { now: () => 0, memory: { usedJSHeapSize: 52_428_800 } });
    expect(peakMemoryMB()).toBe(50);
    vi.unstubAllGlobals();
  });

  // Both cases are real readings from headless Chromium: `total` sits at the
  // sentinel on an idle page and moves to 14,300,000 under memory pressure
  // while `used` stays pinned. The second case is the one that matters — it is
  // the state the large dataset actually produces.
  it("returns null for Chrome's placeholder heap rather than a fake 10 MB", () => {
    vi.stubGlobal("performance", {
      now: () => 0,
      memory: { usedJSHeapSize: 10_000_000, totalJSHeapSize: 10_000_000 },
    });
    expect(peakMemoryMB()).toBeNull();
    vi.unstubAllGlobals();
  });

  it("still detects the placeholder once totalJSHeapSize has grown past it", () => {
    vi.stubGlobal("performance", {
      now: () => 0,
      memory: { usedJSHeapSize: 10_000_000, totalJSHeapSize: 14_300_000 },
    });
    expect(peakMemoryMB()).toBeNull();
    vi.unstubAllGlobals();
  });
});
