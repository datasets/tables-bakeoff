/* Mounts a React element into a harness host, so the two React demos satisfy
 * the same contract as the vanilla ones.
 *
 * Two things here are deliberate, and both exist to stop the card reporting a
 * number that is not the truth:
 *
 * 1. flushSync. `root.render(el)` on a concurrent root returns almost
 *    immediately — it schedules. Timed as-is, TanStack would "render 500,000
 *    rows in 0.2 ms", which is a measurement of a scheduling call and nothing
 *    else. flushSync forces the whole render + commit to happen inside the
 *    clock, which is what the vanilla demos are already charged for.
 *
 * 2. An optional `isPainted(host)` predicate, awaited frame by frame. React's
 *    commit puts nodes in the DOM but a canvas grid (Glide) draws from an
 *    effect on a later frame, and a virtualizer may need one measurement pass
 *    before it knows how many rows fit. The predicate lets each demo say what
 *    "there are rows on screen" means for it, and costs nothing when the
 *    answer is already yes.
 *
 * What this deliberately does NOT do is wait for the compositor. The vanilla
 * demos are timed to "DOM built + layout forced" (mount.js reads offsetHeight
 * inside the clock); adding a paint wait here would tack a variable frame of
 * pure idling onto the React demos only, and the small card's 4 ms would
 * become 20 ms of mostly waiting. Same finish line for everyone.
 *
 * Returns a promise of a cleanup function — the contract allows it, and
 * mount.js awaits it inside the timed region. */

import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

const FRAME_BUDGET = 600; // ~10s at 60fps; a card that never paints should say so, not hang.

export function mountReact(host, element, isPainted) {
  const root = createRoot(host);
  flushSync(() => root.render(element));
  const cleanup = () => root.unmount();
  if (!isPainted) return Promise.resolve(cleanup);
  return waitForFrames(() => isPainted(host)).then(() => cleanup);
}

/** Resolve on the first animation frame where `check()` is true. Rejecting
 *  rather than resolving on exhaustion is the point: mount.js prints a thrown
 *  error in the card, and "nothing ever appeared" is a result worth showing. */
function waitForFrames(check) {
  return new Promise((resolve, reject) => {
    let frames = 0;
    const tick = () => {
      let ok = false;
      try { ok = check(); } catch { ok = false; }
      if (ok) return resolve();
      if (++frames > FRAME_BUDGET) {
        return reject(new Error("React mounted but nothing was painted within 600 frames"));
      }
      requestAnimationFrame(tick);
    };
    // Check immediately: if the commit already put rows on screen there is no
    // reason to charge this demo a frame the vanilla ones never paid.
    tick();
  });
}
