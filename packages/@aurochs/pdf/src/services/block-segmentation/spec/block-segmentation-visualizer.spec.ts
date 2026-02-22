/**
 * @file Tests for block segmentation visualizer.
 */

import path from "node:path";
import os from "node:os";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { visualizeBlockSegmentation } from "../visualization/block-segmentation-visualizer";

describe("visualizeBlockSegmentation", () => {
  it("creates SVG/JSON debug outputs", async () => {
    const outDir = mkdtempSync(path.join(os.tmpdir(), "seg-viz-"));
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const pdfPath = path.resolve(currentDir, "../../../../fixtures/block-segmentation-corpus/horizontal-long-single.pdf");

    const summary = await visualizeBlockSegmentation({
      pdfPath,
      outDir,
      pageNumber: 1,
    });

    expect(existsSync(summary.outputSvgPath)).toBe(true);
    expect(existsSync(summary.outputJsonPath)).toBe(true);
    expect(summary.groupCount).toBeGreaterThan(0);
    expect(summary.groupedRunCount).toBeGreaterThan(0);
    expect(summary.ungroupedRunCount).toBe(0);

    const svg = readFileSync(summary.outputSvgPath, "utf8");
    expect(svg.includes("<svg")).toBe(true);
    expect(svg.includes("grouped blocks")).toBe(true);
  });
});
