/* Measurement helpers shared by every demo card, so the numbers on the site
 * are measured the same way for every library. */

export function time(fn) {
  const t0 = performance.now();
  const result = fn();
  return { result, ms: performance.now() - t0 };
}

export function formatMs(ms) {
  if (ms < 1) return "<1 ms";
  if (ms < 50) return `${ms.toFixed(1)} ms`;
  return `${Math.round(ms)} ms`;
}

/* Chrome reports performance.memory at reduced precision unless it was started
 * with --enable-precise-memory-info, and the reduction is not rounding: every
 * field comes back as exactly 10,000,000 bytes, before and after loading
 * 50,000 rows. Measured in Chromium 2026-09: default build reported
 * used = total = 10,000,000 throughout; the same page with precise memory info
 * reported 2.2 MB before and 16.5 MB after. */
const QUANTIZED_HEAP_BYTES = 10_000_000;

/** Chromium-only. Returns null elsewhere — and null, too, when Chrome is
 *  serving the quantized placeholder, because printing an identical invented
 *  "10 MB" against every library on every dataset would look like a
 *  measurement. An absent number is more honest than a misleading one. */
export function peakMemoryMB() {
  const m = performance.memory;
  if (!m || typeof m.usedJSHeapSize !== "number") return null;
  if (m.usedJSHeapSize === QUANTIZED_HEAP_BYTES && m.totalJSHeapSize === QUANTIZED_HEAP_BYTES) {
    return null;
  }
  return Math.round(m.usedJSHeapSize / 1_048_576);
}

/** Scroll `el` through `distance` px in `steps` increments, one per animation
 *  frame, and report the frame rate achieved. This is a scripted scroll rather
 *  than a synthetic benchmark: it exercises the library's real scroll path. */
export function measureScrollFps(el, { distance = 20000, steps = 120 } = {}) {
  return new Promise((resolve) => {
    const start = el.scrollTop;
    const step = distance / steps;
    let frames = 0, i = 0;
    const t0 = performance.now();

    function tick() {
      if (i >= steps) {
        const elapsed = performance.now() - t0;
        const fps = (frames / elapsed) * 1000;
        el.scrollTop = start;
        resolve({
          fps: Math.round(fps),
          frames,
          droppedFrames: Math.max(0, Math.round((elapsed / 16.67) - frames)),
        });
        return;
      }
      el.scrollTop = start + step * i;
      i++; frames++;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
