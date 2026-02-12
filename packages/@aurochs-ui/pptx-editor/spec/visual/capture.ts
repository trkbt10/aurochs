/**
 * @file Capture screenshots of SlideShareViewer
 */

import puppeteer from "puppeteer-core";
import { createServer } from "vite";
import path from "node:path";
import fs from "node:fs";

const SCREENSHOTS_DIR = path.join(__dirname, "__screenshots__");

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

async function main() {
  // Start vite server
  const server = await createServer({
    configFile: path.join(__dirname, "vite.config.ts"),
    server: { port: 5175 },
  });
  await server.listen();
  console.log("Vite server started at http://localhost:5175");

  // Launch browser
  const executablePath = await findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });

  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const viewports = [
    { name: "desktop-large", width: 1920, height: 1080 },
    { name: "desktop", width: 1280, height: 800 },
    { name: "tablet", width: 1024, height: 768 },
    { name: "small", width: 800, height: 600 },
  ];

  const components = [
    { name: "slideshare", param: "" },
    { name: "embeddable", param: "?component=embeddable" },
  ];

  for (const comp of components) {
    for (const vp of viewports) {
      const filename = `${comp.name}-${vp.name}`;
      console.log(`Capturing ${filename} (${vp.width}x${vp.height})...`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`http://localhost:5175/${comp.param}`, { waitUntil: "networkidle0" });
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `${filename}.png`),
        fullPage: false,
      });
      await page.close();
    }
  }

  // Capture slideshow mode
  for (const vp of viewports.slice(0, 2)) {
    const filename = `slideshow-${vp.name}`;
    console.log(`Capturing ${filename} (${vp.width}x${vp.height})...`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:5175/", { waitUntil: "networkidle0" });
    // Click the Present button to start slideshow (find by text content)
    const presentBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent?.includes("Present"));
    });
    if (presentBtn) {
      await (presentBtn as any).click();
      await page.waitForSelector("dialog", { timeout: 3000 });
      await new Promise((r) => setTimeout(r, 1000)); // Wait for layout and resize
    }
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${filename}.png`),
      fullPage: false,
    });
    await page.close();
  }

  // Capture embeddable with hover (to show controls)
  console.log("Capturing embeddable-hover-desktop...");
  const hoverPage = await browser.newPage();
  await hoverPage.setViewport({ width: 1280, height: 800 });
  await hoverPage.goto("http://localhost:5175/?component=embeddable", { waitUntil: "networkidle0" });
  // Hover over the slide to show controls
  const slideElement = await hoverPage.$("[style*='aspect-ratio']");
  if (slideElement) {
    await slideElement.hover();
    await new Promise((r) => setTimeout(r, 300));
  }
  await hoverPage.screenshot({
    path: path.join(SCREENSHOTS_DIR, "embeddable-hover-desktop.png"),
    fullPage: false,
  });
  await hoverPage.close();

  console.log(`Screenshots saved to ${SCREENSHOTS_DIR}`);

  await browser.close();
  await server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
