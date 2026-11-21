import { defineConfig } from "@playwright/test";

/* The port is pinned with --strictPort: Vite silently falls forward to 5174
 * when 5173 is busy, and the baseURL below would then point at whatever else
 * was already listening. Failing to start is the better failure. */
/* PW_PORT lets a second checkout (a git worktree) run the suite against its own
 * dev server. Without it, reuseExistingServer would attach this run to
 * whichever checkout happens to be serving 5173. */
const port = Number(process.env.PW_PORT) || 5173;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180000,
  use: { baseURL: `http://localhost:${port}`, trace: "on-first-retry" },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
  },
});
