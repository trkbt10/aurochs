/**
 * @file Debug script to test the visual harness
 */

import * as path from "node:path";
import { createServer } from "vite";
import puppeteer from "puppeteer";

async function main() {
  const harnessRoot = path.resolve(__dirname, "../spec/visual-harness");
  const port = 39876;

  console.log("Starting Vite server from:", harnessRoot);
  const server = await createServer({
    configFile: false,
    root: harnessRoot,
    server: { port, strictPort: false },
    plugins: [
      // @ts-expect-error -- dynamic import
      (await import("@vitejs/plugin-react")).default(),
    ],
    resolve: {
      alias: {
        "@aurochs-ui/xlsx-editor": path.resolve(harnessRoot, "../../src"),
        "@aurochs-ui/ui-components": path.resolve(harnessRoot, "../../../ui-components/src"),
        "@aurochs-office/xlsx": path.resolve(harnessRoot, "../../../../@aurochs-office/xlsx/src"),
      },
    },
    logLevel: "info",
  });

  const info = await server.listen();
  const address = info.httpServer?.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to get server address");
  }
  const serverUrl = `http://localhost:${(address as { port: number }).port}`;
  console.log(`Server running at: ${serverUrl}`);

  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Collect console messages
  const logs: string[] = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[error] ${err.toString()}`));

  console.log("Navigating to harness...");
  await page.goto(serverUrl, { waitUntil: "networkidle0", timeout: 30000 });

  console.log("Current title:", await page.title());

  // Wait for ready signal or 10 seconds
  try {
    await page.waitForFunction(() => document.title === "ready", { timeout: 10000 });
    console.log("Harness ready!");
  } catch {
    console.log("Harness did not signal ready within 10s");
    console.log("\n--- Console logs ---");
    for (const log of logs) {
      console.log(log);
    }
    console.log("\n--- HTML (truncated) ---");
    const html = await page.content();
    console.log(html.slice(0, 2000));
  }

  await browser.close();
  await server.close();
}

main().catch(console.error);
