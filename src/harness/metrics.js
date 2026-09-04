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

/* Chrome pins performance.memory.usedJSHeapSize to exactly 10,000,000 bytes
 * unless it was started with --enable-precise-memory-info. Measured in this
 * repo's headless Chromium, 2026-09:
 *
 *   fresh page                     used 10,000,000   total 10,000,000
 *   after decoding 500,000 rows    used 10,000,000   total 10,000,000
 *   holding 177 MB of live strings used 10,000,000   total 14,300,000
 *   ...with --enable-precise-memory-info:  used 2.2 MB → 16.5 MB
 *
 * Only `used` is the fixed sentinel. `total` is quantized on a different, much
 * coarser scale and does move once the heap really grows, so it must stay out
 * of the test: an earlier version of this guard required both to equal the
 * sentinel and therefore stopped firing exactly when memory pressure was
 * highest — the large dataset still printed a fabricated "heap 10 MB". */
const QUANTIZED_USED_HEAP_BYTES = 10_000_000;

/** Chromium-only, and only with --enable-precise-memory-info. Returns null both
 *  where performance.memory is absent and where Chrome is serving its fixed
 *  placeholder, because printing an identical invented "10 MB" against every
 *  library on every dataset would look like a measurement. Callers should say
 *  the number is unavailable rather than omit it silently — an absent number is
 *  honest, a silently missing one looks like an oversight. */
export function peakMemoryMB() {
  const m = performance.memory;
  if (!m || typeof m.usedJSHeapSize !== "number") return null;
  if (m.usedJSHeapSize === QUANTIZED_USED_HEAP_BYTES) return null;
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
