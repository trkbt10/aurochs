/** @file Playwright configuration for OOXML components end-to-end tests. */
import { defineConfig } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 5193;

export default defineConfig({
  testDir: __dirname,
  testMatch: "**/*.e2e.ts",
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: "chromium",
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: `npx vite --config spec/e2e/vite.config.ts --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 15_000,
    cwd: resolve(__dirname, "../.."),
  },
});
