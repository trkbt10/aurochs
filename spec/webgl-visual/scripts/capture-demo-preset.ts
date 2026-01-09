#!/usr/bin/env bun
/**
 * Capture Screenshot of Demo WordArt Preset
 *
 * This script captures the actual rendering of a WordArt preset from the running demo.
 * Use this to verify the actual visual output matches expectations.
 *
 * Usage:
 *   bun run spec/webgl-visual/scripts/capture-demo-preset.ts [preset-name]
 *
 * Example:
 *   bun run spec/webgl-visual/scripts/capture-demo-preset.ts "Rainbow 3D Alt"
 */

import * as path from "node:path";
import * as fs from "node:fs";
import puppeteer from "puppeteer";

const OUTPUT_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "__output__",
);

async function capturePreset(presetName: string): Promise<void> {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Capturing preset: "${presetName}"`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      "--enable-webgl",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const page = await browser.newPage();

  // Capture console logs
  page.on("console", (msg) => {
    console.log(`[browser ${msg.type()}]`, msg.text());
  });
  page.on("pageerror", (err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[browser error]", error.message);
  });

  try {
    // Navigate directly to the WebGL text test page (which contains WordArt gallery)
    // Note: Uses HashRouter, so route is after #
    const demoUrl = "http://localhost:5174/web-pptx/#/drawing-ml/webgl/text";
    console.log(`Navigating to ${demoUrl}...`);

    await page.goto(demoUrl, { waitUntil: "networkidle0", timeout: 30000 });

    // Debug: capture current state
    const debugPath = path.join(OUTPUT_DIR, "debug-page-state.png");
    await page.screenshot({ path: debugPath, fullPage: true });
    console.log(`Debug screenshot saved: ${debugPath}`);

    // Try to find what's on the page
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        bodyClasses: document.body.className,
        mainContent: document.body.innerHTML.substring(0, 500),
      };
    });
    console.log("Page content:", JSON.stringify(pageContent, null, 2));

    // Wait for the WordArt gallery to load
    await page.waitForSelector(".wordart-gallery", { timeout: 10000 });

    console.log("Page loaded, looking for preset...");

    // Find and click the preset thumbnail
    const clicked = await page.evaluate((name: string) => {
      const buttons = Array.from(document.querySelectorAll(".wordart-thumbnail"));
      for (const btn of buttons) {
        if (btn.getAttribute("title") === name) {
          (btn as HTMLElement).click();
          return true;
        }
      }
      return false;
    }, presetName);

    if (!clicked) {
      console.error(`Preset "${presetName}" not found!`);
      console.log("Available presets:");

      const presets = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll(".wordart-thumbnail"));
        return buttons.map((btn) => btn.getAttribute("title"));
      });
      presets.forEach((p) => console.log(`  - ${p}`));

      await browser.close();
      return;
    }

    console.log(`Selected preset "${presetName}", waiting for render...`);

    // Wait for WebGL to render
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Find the preview canvas
    const previewElement = await page.$(".wordart-preview-canvas");
    if (!previewElement) {
      console.error("Preview canvas not found!");
      await browser.close();
      return;
    }

    // Capture screenshot of just the preview area
    const safeName = presetName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const screenshotPath = path.join(OUTPUT_DIR, `demo-${safeName}.png`);

    await previewElement.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved: ${screenshotPath}`);

    // Also capture full page for context
    const fullPagePath = path.join(OUTPUT_DIR, `demo-${safeName}-full.png`);
    await page.screenshot({ path: fullPagePath, fullPage: false });
    console.log(`Full page screenshot saved: ${fullPagePath}`);

  } finally {
    await browser.close();
  }
}

// Main
const presetName = process.argv[2] || "Rainbow 3D Alt";
capturePreset(presetName).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
