/* Shared theme surface for every demo.
 * The palette matches assets/css/site.css (dataviz reference palette,
 * slots 1–5) so libraries are compared on rendering, not colour choice. */

export const PALETTE_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
export const PALETTE_DARK  = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"];

export const FONT_SANS =
  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const FONT_MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

export function isDark() {
  const stamp = document.documentElement.getAttribute("data-theme");
  if (stamp === "dark") return true;
  if (stamp === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Live palette + ink tokens for the current theme. */
export function theme() {
  const dark = isDark();
  return {
    dark,
    palette: dark ? PALETTE_DARK : PALETTE_LIGHT,
    surface:   dark ? "#1a1a19" : "#fcfcfb",
    page:      dark ? "#0d0d0d" : "#f9f9f7",
    text:      dark ? "#ffffff" : "#0b0b0b",
    textSecondary: dark ? "#c3c2b7" : "#52514e",
    muted:     "#898781",
    grid:      dark ? "#2c2c2a" : "#e1e0d9",
    baseline:  dark ? "#383835" : "#c3c2b7",
    fontSans: FONT_SANS,
    fontMono: FONT_MONO,
  };
}

/** Call `fn` whenever the effective theme changes (OS flip or toggle). */
export function onThemeChange(fn) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", fn);
  new MutationObserver(fn).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}

/** Wire up a `.toggle` button: cycles light → dark → system. */
export function installThemeToggle(btn) {
  const label = () => {
    const s = document.documentElement.getAttribute("data-theme") || "system";
    btn.textContent = s === "system" ? "Theme: system" : `Theme: ${s}`;
  };
  btn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "system";
    const next = cur === "system" ? "light" : cur === "light" ? "dark" : "system";
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("lc-theme", next); } catch {}
    label();
  });
  label();
}

/** Restore a saved toggle choice as early as possible. */
export function restoreTheme() {
  try {
    const s = localStorage.getItem("lc-theme");
    if (s === "light" || s === "dark") {
      document.documentElement.setAttribute("data-theme", s);
    }
  } catch {}
}
