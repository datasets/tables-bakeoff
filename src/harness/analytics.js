/* Umami on umami.lifeitself.org ("Tables Bake-off", Datopian team), kept
 * apart from datahub.io's own GA4. `data-domains` limits counting to the
 * live host, so local dev and branch previews don't log visits.
 *
 * Two cases are skipped on purpose:
 * - `?bare=1`, the gallery embeds: the front page loads nine of them, and
 *   each would count as a page view.
 * - `navigator.webdriver`, which Playwright sets: the e2e tests and every
 *   measurement script (measure-all, measure-sort, edit-test,
 *   screenshot-front) would otherwise log visits and load the tracker into
 *   the pages they time. */
const UMAMI_WEBSITE_ID = "a54bd59b-a2b1-4aee-b05f-44e57c467507";

const skip =
  typeof window === "undefined" ||
  navigator.webdriver ||
  new URLSearchParams(location.search).get("bare") === "1";

if (!skip) {
  const s = document.createElement("script");
  s.defer = true;
  s.src = "https://umami.lifeitself.org/script.js";
  s.dataset.websiteId = UMAMI_WEBSITE_ID;
  s.dataset.domains = "tables.datahub.io";
  document.head.appendChild(s);
}
