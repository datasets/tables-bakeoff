import { defineConfig } from "@playwright/test";

/* The port is pinned with --strictPort: Vite silently falls forward to 5174
 * when 5173 is busy, and the baseURL below would then point at whatever else
 * was already listening. Failing to start is the better failure. */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180000,
  use: { baseURL: "http://localhost:5173", trace: "on-first-retry" },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: true,
  },
});
