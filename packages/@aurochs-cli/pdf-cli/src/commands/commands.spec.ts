/**
 * @file Integration-style tests for pdf-cli commands
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { getPdfFixturePath } from "@aurochs/pdf/test-utils/pdf-fixtures";
import { runInfo } from "./info";
import { runList } from "./list";
import { runShow } from "./show";
import { runExtract } from "./extract";
import { runPreview } from "./preview";
import { runBuild } from "./build";

const FIXTURE_PATH = getPdfFixturePath("simple-rect.pdf");
const ctx = { tempDir: "" };

beforeAll(async () => {
  ctx.tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-cli-test-"));
});

afterAll(async () => {
  await fs.rm(ctx.tempDir, { recursive: true, force: true });
});

describe("pdf-cli command integration", () => {
  it("runInfo returns page metadata", async () => {
    const result = await runInfo(FIXTURE_PATH);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.pageCount).toBeGreaterThan(0);
    expect(result.data.firstPage).toBeDefined();
  });

  it("runList returns per-page element counts", async () => {
    const result = await runList(FIXTURE_PATH);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.pages.length).toBeGreaterThan(0);
    expect(result.data.pages[0]!.number).toBe(1);
  });

  it("runShow returns details for page 1", async () => {
    const result = await runShow(FIXTURE_PATH, 1);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.pageNumber).toBe(1);
    expect(result.data.elements.length).toBeGreaterThan(0);
  });

  it("runShow returns INVALID_PAGE for out-of-range page", async () => {
    const result = await runShow(FIXTURE_PATH, 9999);

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.code).toBe("INVALID_PAGE");
  });

  it("runExtract filters pages by range", async () => {
    const result = await runExtract(FIXTURE_PATH, { pages: "1" });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.pages).toHaveLength(1);
    expect(result.data.pages[0]!.number).toBe(1);
  });

  it("runPreview returns SVG output", async () => {
    const result = await runPreview(FIXTURE_PATH, 1);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.pages).toHaveLength(1);
    expect(result.data.pages[0]!.svg).toContain("<svg");
  });

  it("runBuild writes PdfDocument JSON", async () => {
    const specPath = path.join(ctx.tempDir, "build-spec.json");

    await fs.writeFile(
      specPath,
      JSON.stringify(
        {
          input: FIXTURE_PATH,
          output: "document.json",
          pages: "1",
          includeText: true,
          includePaths: true,
          minPathComplexity: 0,
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runBuild(specPath);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.processedPages).toBe(1);
    const outputPath = path.join(ctx.tempDir, "document.json");
    const outputJson = await fs.readFile(outputPath, "utf8");
    expect(outputJson).toContain('"pages"');
  });
});
