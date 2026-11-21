/* datahub.io's Google Tag Manager container. It feeds the same GA4 property
 * as the rest of datahub.io, split by hostname (bead tables-sck).
 *
 * Two cases are skipped on purpose:
 * - `?bare=1`, the gallery embeds: the front page loads nine of them, and
 *   each would count as a page view.
 * - `navigator.webdriver`, which Playwright sets: the e2e tests and every
 *   measurement script (measure-all, measure-sort, edit-test,
 *   screenshot-front) would otherwise log visits and load GTM into the pages
 *   they time. */
const GTM_ID = "GTM-TLRT3HLR";

const skip =
  typeof window === "undefined" ||
  navigator.webdriver ||
  new URLSearchParams(location.search).get("bare") === "1";

if (!skip) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);
}
