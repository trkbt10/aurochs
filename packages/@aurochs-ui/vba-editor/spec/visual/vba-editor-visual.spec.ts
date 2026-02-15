/**
 * @file VBA Editor Visual Regression Tests
 *
 * Screenshot-based visual testing for VBA Editor UI.
 * Captures screenshots and compares against baselines.
 */

import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { createServer, type ViteDevServer } from "vite";
import path from "node:path";
import fs from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

// =============================================================================
// Configuration
// =============================================================================

const PORT = 5182;
const BASE_URL = `http://localhost:${PORT}`;
const VIEWPORT = { width: 1280, height: 800 };

const BASELINE_DIR = path.join(__dirname, "baseline");
const OUTPUT_DIR = path.join(__dirname, "__output__");
const DIFF_DIR = path.join(__dirname, "__diff__");

/** Maximum allowed pixel difference percentage */
const DIFF_THRESHOLD = 0.5; // 0.5%

// =============================================================================
// Helpers
// =============================================================================

async function findChrome(): Promise<string> {
  const paths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    process.env.CHROME_PATH,
  ].filter(Boolean) as string[];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  throw new Error("Chrome not found. Set CHROME_PATH environment variable.");
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadPng(filePath: string): PNG | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath);
  return PNG.sync.read(data);
}

function savePng(filePath: string, png: PNG): void {
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
}

/**
 * Compare two images and return diff percentage.
 */
function compareImages(
  actual: PNG,
  expected: PNG
): { diffPercent: number; diffPng: PNG } {
  const { width, height } = expected;
  const diffPng = new PNG({ width, height });

  const diffPixels = pixelmatch(
    expected.data,
    actual.data,
    diffPng.data,
    width,
    height,
    { threshold: 0.1 }
  );

  const totalPixels = width * height;
  const diffPercent = (diffPixels / totalPixels) * 100;

  return { diffPercent, diffPng };
}

// =============================================================================
// Test Scenarios
// =============================================================================

type VisualScenario = {
  name: string;
  setup: (page: Page) => Promise<void>;
};

const SCENARIOS: VisualScenario[] = [
  {
    name: "default-state",
    setup: async (_page) => {
      // Default state - no setup needed
    },
  },
  {
    name: "module-selected",
    setup: async (page) => {
      // Click on the module in the sidebar
      await page.click('[data-item-id="TestModule"]');
      await new Promise((r) => setTimeout(r, 200));
    },
  },
  {
    name: "cursor-in-editor",
    setup: async (page) => {
      // Focus editor and position cursor
      await page.click("textarea");
      await page.keyboard.press("Home");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await new Promise((r) => setTimeout(r, 300));
    },
  },
  {
    name: "text-selected",
    setup: async (page) => {
      // Select some text
      await page.click("textarea");
      await page.keyboard.press("Home");
      await page.keyboard.down("Shift");
      await page.keyboard.press("End");
      await page.keyboard.up("Shift");
      await new Promise((r) => setTimeout(r, 300));
    },
  },
  {
    name: "search-open",
    setup: async (page) => {
      // Open search with Cmd+F
      await page.click("textarea");
      await page.keyboard.down("Meta");
      await page.keyboard.press("f");
      await page.keyboard.up("Meta");
      await new Promise((r) => setTimeout(r, 300));
    },
  },
];

// =============================================================================
// Main Test Runner
// =============================================================================

type TestResult = {
  scenario: string;
  status: "pass" | "fail" | "new";
  diffPercent?: number;
  message?: string;
};

async function captureScenario(
  page: Page,
  scenario: VisualScenario
): Promise<Buffer> {
  // Reset page state
  await page.goto(BASE_URL, { waitUntil: "networkidle0" });
  await page.waitForSelector('[data-testid="vba-editor-container"]', {
    timeout: 5000,
  });
  await new Promise((r) => setTimeout(r, 500));

  // Run scenario setup
  await scenario.setup(page);
  await new Promise((r) => setTimeout(r, 200));

  // Capture screenshot
  const screenshot = await page.screenshot({ fullPage: false });
  return screenshot as Buffer;
}

async function runVisualTests(options: {
  updateBaselines?: boolean;
}): Promise<TestResult[]> {
  const { updateBaselines = false } = options;
  const results: TestResult[] = [];

  console.log("Starting VBA Editor Visual Tests...\n");
  console.log(`Mode: ${updateBaselines ? "UPDATE BASELINES" : "COMPARE"}`);

  // Ensure directories exist
  ensureDir(BASELINE_DIR);
  ensureDir(OUTPUT_DIR);
  ensureDir(DIFF_DIR);

  // Start Vite server
  const server: ViteDevServer = await createServer({
    configFile: path.join(__dirname, "../e2e/vite.config.ts"),
    server: { port: PORT },
  });
  await server.listen();
  console.log(`Vite server started at ${BASE_URL}\n`);

  // Launch browser
  const executablePath = await findChrome();
  const browser: Browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  try {
    for (const scenario of SCENARIOS) {
      console.log(`Testing: ${scenario.name}`);

      const screenshotBuffer = await captureScenario(page, scenario);
      const actualPng = PNG.sync.read(screenshotBuffer);

      const baselinePath = path.join(BASELINE_DIR, `${scenario.name}.png`);
      const outputPath = path.join(OUTPUT_DIR, `${scenario.name}.png`);
      const diffPath = path.join(DIFF_DIR, `${scenario.name}.png`);

      // Save actual output
      savePng(outputPath, actualPng);

      if (updateBaselines) {
        // Update baseline mode
        savePng(baselinePath, actualPng);
        results.push({
          scenario: scenario.name,
          status: "new",
          message: "Baseline updated",
        });
        console.log(`  → Baseline updated\n`);
      } else {
        // Compare mode
        const baselinePng = loadPng(baselinePath);

        if (!baselinePng) {
          results.push({
            scenario: scenario.name,
            status: "new",
            message: "No baseline exists. Run with --update to create.",
          });
          console.log(`  → No baseline (run with --update)\n`);
        } else {
          const { diffPercent, diffPng } = compareImages(actualPng, baselinePng);

          if (diffPercent <= DIFF_THRESHOLD) {
            results.push({
              scenario: scenario.name,
              status: "pass",
              diffPercent,
            });
            console.log(`  → Pass (diff: ${diffPercent.toFixed(2)}%)\n`);
          } else {
            savePng(diffPath, diffPng);
            results.push({
              scenario: scenario.name,
              status: "fail",
              diffPercent,
              message: `Diff exceeds threshold: ${diffPercent.toFixed(2)}% > ${DIFF_THRESHOLD}%`,
            });
            console.log(`  → FAIL (diff: ${diffPercent.toFixed(2)}%)\n`);
          }
        }
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  return results;
}

// =============================================================================
// CLI Entry Point
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const updateBaselines = args.includes("--update") || args.includes("-u");

  const results = await runVisualTests({ updateBaselines });

  // Summary
  console.log("\n=== Summary ===\n");

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const newScenarios = results.filter((r) => r.status === "new").length;

  for (const result of results) {
    const icon =
      result.status === "pass" ? "✓" : result.status === "fail" ? "✗" : "○";
    console.log(`${icon} ${result.scenario}`);
    if (result.message) {
      console.log(`  ${result.message}`);
    }
  }

  console.log(`\nPassed: ${passed}, Failed: ${failed}, New: ${newScenarios}`);

  if (failed > 0) {
    console.log(`\nDiff images saved to: ${DIFF_DIR}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
