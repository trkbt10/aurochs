import { defineConfig } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 5190;

export default defineConfig({
  testDir: resolve(__dirname, "e2e"),
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: "chromium",
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: `npx vite --config dev/vite.config.ts --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 15_000,
    cwd: __dirname,
  },
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFileName}/{arg}{ext}",
});
