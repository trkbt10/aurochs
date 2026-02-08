/**
 * @file Text rendering visual comparison tests
 *
 * Compares rendered SVG output against actual Figma SVG exports
 * using pixel-based image comparison.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll } from "vitest";
import { Resvg } from "@resvg/resvg-js";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { parseFigFile, buildNodeTree, findNodesByType, type FigBlob, type FigImage } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { renderCanvas } from "../src/svg/renderer";
import { createNodeFontLoaderWithFontsource } from "../src/font-drivers/node";
import { CachingFontLoader } from "../src/font";

// =============================================================================
// Paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/text-comprehensive");
const FIG_FILE = path.join(FIXTURES_DIR, "text-comprehensive.fig");
const ACTUAL_SVG_DIR = path.join(FIXTURES_DIR, "actual");
const OUTPUT_DIR = path.join(FIXTURES_DIR, "__output__");
const DIFF_DIR = path.join(FIXTURES_DIR, "__diff__");

// =============================================================================
// Types
// =============================================================================

type FrameInfo = {
  name: string;
  node: FigNode;
  size: { width: number; height: number };
};

type ParsedData = {
  canvases: Map<string, FigNode>;
  frames: Map<string, FrameInfo>;
  blobs: readonly FigBlob[];
  images: ReadonlyMap<string, FigImage>;
  nodeMap: ReadonlyMap<string, FigNode>;
};

type CompareResult = {
  frameName: string;
  match: boolean;
  diffPercent: number;
  diffPixels: number;
  totalPixels: number;
};

// =============================================================================
// Visual Comparison Utilities
// =============================================================================

function ensureDirs(): void {
  for (const dir of [OUTPUT_DIR, DIFF_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Convert SVG to PNG using resvg
 *
 * Uses high quality settings for accurate visual comparison:
 * - geometricPrecision for shape and text rendering
 * - 2x DPI for better antialiasing
 */
function svgToPng(svg: string, width?: number): Buffer {
  const opts: {
    fitTo?: { mode: "width"; value: number } | { mode: "zoom"; value: number };
    font?: { loadSystemFonts: boolean };
    shapeRendering?: 0 | 1 | 2;
    textRendering?: 0 | 1 | 2;
    dpi?: number;
  } = {
    font: { loadSystemFonts: true },
    shapeRendering: 2, // geometricPrecision
    textRendering: 2, // geometricPrecision
  };

  if (width !== undefined) {
    opts.fitTo = { mode: "width", value: width };
  }

  const resvg = new Resvg(svg, opts);
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

/**
 * Compare two SVGs visually
 */
function compareSvgs(
  actualSvg: string,
  renderedSvg: string,
  frameName: string,
  options: { threshold?: number; maxDiffPercent?: number; saveDiff?: boolean } = {},
): CompareResult {
  const { threshold = 0.1, maxDiffPercent = 5.0, saveDiff = false } = options;

  // Convert both SVGs to PNG
  const actualPngBuffer = svgToPng(actualSvg);
  const actual = PNG.sync.read(actualPngBuffer);

  // Render our SVG at the same width as actual
  const renderedPngBuffer = svgToPng(renderedSvg, actual.width);
  let rendered = PNG.sync.read(renderedPngBuffer);

  // Save for debugging if requested
  if (saveDiff) {
    ensureDirs();
    const safeName = frameName.replace(/[^a-zA-Z0-9-_]/g, "_");
    fs.writeFileSync(path.join(OUTPUT_DIR, `${safeName}-actual.png`), actualPngBuffer);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${safeName}-rendered.png`), renderedPngBuffer);
  }

  // Resize if dimensions don't match
  if (rendered.width !== actual.width || rendered.height !== actual.height) {
    const resized = new PNG({ width: actual.width, height: actual.height });
    for (let y = 0; y < actual.height; y++) {
      const sy = Math.floor((y / actual.height) * rendered.height);
      for (let x = 0; x < actual.width; x++) {
        const sx = Math.floor((x / actual.width) * rendered.width);
        const srcIdx = (sy * rendered.width + sx) * 4;
        const dstIdx = (y * actual.width + x) * 4;
        resized.data[dstIdx] = rendered.data[srcIdx];
        resized.data[dstIdx + 1] = rendered.data[srcIdx + 1];
        resized.data[dstIdx + 2] = rendered.data[srcIdx + 2];
        resized.data[dstIdx + 3] = rendered.data[srcIdx + 3];
      }
    }
    rendered = resized;
  }

  // Create diff image
  const diff = new PNG({ width: actual.width, height: actual.height });

  const diffPixels = pixelmatch(actual.data, rendered.data, diff.data, actual.width, actual.height, {
    threshold,
    includeAA: false,
  });

  const totalPixels = actual.width * actual.height;
  const diffPercent = (diffPixels / totalPixels) * 100;
  const match = diffPercent <= maxDiffPercent;

  // Save diff image if there are differences and saveDiff is enabled
  if (saveDiff && diffPixels > 0) {
    const safeName = frameName.replace(/[^a-zA-Z0-9-_]/g, "_");
    const buffer = PNG.sync.write(diff);
    fs.writeFileSync(path.join(DIFF_DIR, `${safeName}-diff.png`), buffer);
  }

  return {
    frameName,
    match,
    diffPercent,
    diffPixels,
    totalPixels,
  };
}

// =============================================================================
// Data Loading
// =============================================================================

let parsedDataCache: ParsedData | null = null;

async function getParsedData(): Promise<ParsedData> {
  if (parsedDataCache) {
    return parsedDataCache;
  }

  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);

  const canvases = new Map<string, FigNode>();
  const frames = new Map<string, FrameInfo>();

  for (const canvas of findNodesByType(roots, "CANVAS")) {
    canvases.set(canvas.name ?? "unnamed", canvas);

    const frameNodes = findNodesByType([canvas], "FRAME");
    for (const frame of frameNodes) {
      const name = frame.name ?? "unnamed";
      const nodeData = frame as Record<string, unknown>;
      const size = nodeData.size as { x?: number; y?: number } | undefined;
      frames.set(name, {
        name,
        node: frame,
        size: {
          width: size?.x ?? 100,
          height: size?.y ?? 100,
        },
      });
    }
  }

  parsedDataCache = {
    canvases,
    frames,
    blobs: parsed.blobs,
    images: parsed.images,
    nodeMap,
  };

  return parsedDataCache;
}

function getActualSvgFiles(): string[] {
  if (!fs.existsSync(ACTUAL_SVG_DIR)) {
    return [];
  }
  return fs
    .readdirSync(ACTUAL_SVG_DIR)
    .filter((f) => f.endsWith(".svg"))
    .map((f) => f.replace(".svg", ""));
}

// Shared font loader instance
let fontLoader: CachingFontLoader | null = null;

function getFontLoader(): CachingFontLoader {
  if (!fontLoader) {
    const baseLoader = createNodeFontLoaderWithFontsource();
    fontLoader = new CachingFontLoader(baseLoader);
  }
  return fontLoader;
}

async function renderFrame(
  frame: FrameInfo,
  blobs: readonly FigBlob[],
  symbolMap?: ReadonlyMap<string, FigNode>,
): Promise<string> {
  const canvas: FigNode = {
    type: "CANVAS",
    name: frame.name,
    children: [frame.node],
  };

  const result = await renderCanvas(canvas, {
    width: frame.size.width,
    height: frame.size.height,
    blobs,
    symbolMap,
    fontLoader: getFontLoader(),
  });

  return result.svg;
}

// =============================================================================
// Tests
// =============================================================================

describe("text-comprehensive visual comparison", () => {
  let data: ParsedData;
  let actualFiles: string[];

  beforeAll(async () => {
    data = await getParsedData();
    actualFiles = getActualSvgFiles();
  });

  it("loads fixtures", () => {
    expect(data.frames.size).toBeGreaterThan(0);
    expect(actualFiles.length).toBeGreaterThan(0);
    console.log(`Loaded ${data.frames.size} frames, ${actualFiles.length} actual SVGs`);
  });

  describe("alignment frames", () => {
    const alignments = [
      "LEFT-TOP",
      "LEFT-CENTER",
      "LEFT-BOTTOM",
      "CENTER-TOP",
      "CENTER-CENTER",
      "CENTER-BOTTOM",
      "RIGHT-TOP",
      "RIGHT-CENTER",
      "RIGHT-BOTTOM",
      "JUSTIFIED-TOP",
      "JUSTIFIED-CENTER",
      "JUSTIFIED-BOTTOM",
    ];

    for (const alignment of alignments) {
      it(`renders ${alignment} correctly`, async () => {
        const frame = data.frames.get(alignment);
        expect(frame).toBeDefined();
        if (!frame) return;

        const actualSvg = fs.readFileSync(path.join(ACTUAL_SVG_DIR, `${alignment}.svg`), "utf-8");
        const renderedSvg = await renderFrame(frame, data.blobs, data.nodeMap);
        const result = compareSvgs(actualSvg, renderedSvg, alignment, { maxDiffPercent: 10 });

        console.log(`  ${alignment}: ${result.diffPercent.toFixed(2)}% diff`);
        expect(result.diffPercent).toBeLessThan(10);
      });
    }
  });

  describe("line height frames", () => {
    const lineHeights = [
      "lh-80pct",
      "lh-100pct",
      "lh-120pct",
      "lh-150pct",
      "lh-200pct",
      "lh-12px",
      "lh-16px",
      "lh-20px",
      "lh-24px",
      "lh-32px",
    ];

    for (const lh of lineHeights) {
      it(`renders ${lh} correctly`, async () => {
        const frame = data.frames.get(lh);
        expect(frame).toBeDefined();
        if (!frame) return;

        const actualSvg = fs.readFileSync(path.join(ACTUAL_SVG_DIR, `${lh}.svg`), "utf-8");
        const renderedSvg = await renderFrame(frame, data.blobs, data.nodeMap);
        const result = compareSvgs(actualSvg, renderedSvg, lh, { maxDiffPercent: 10 });

        console.log(`  ${lh}: ${result.diffPercent.toFixed(2)}% diff`);
        expect(result.diffPercent).toBeLessThan(10);
      });
    }
  });

  describe("letter spacing frames", () => {
    const spacings = [
      "ls-neg10pct",
      "ls-neg5pct",
      "ls-0pct",
      "ls-5pct",
      "ls-10pct",
      "ls-20pct",
      "ls-50pct",
      "ls-100pct",
    ];

    for (const ls of spacings) {
      it(`renders ${ls} correctly`, async () => {
        const frame = data.frames.get(ls);
        expect(frame).toBeDefined();
        if (!frame) return;

        const actualSvg = fs.readFileSync(path.join(ACTUAL_SVG_DIR, `${ls}.svg`), "utf-8");
        const renderedSvg = await renderFrame(frame, data.blobs, data.nodeMap);
        const result = compareSvgs(actualSvg, renderedSvg, ls, { maxDiffPercent: 10 });

        console.log(`  ${ls}: ${result.diffPercent.toFixed(2)}% diff`);
        expect(result.diffPercent).toBeLessThan(10);
      });
    }
  });

  describe("color frames", () => {
    const colors = [
      "color-black",
      "color-red",
      "color-green",
      "color-blue",
      "color-yellow",
      "color-cyan",
      "color-magenta",
      "color-gray50",
    ];

    for (const color of colors) {
      it(`renders ${color} correctly`, async () => {
        const frame = data.frames.get(color);
        expect(frame).toBeDefined();
        if (!frame) return;

        const actualSvg = fs.readFileSync(path.join(ACTUAL_SVG_DIR, `${color}.svg`), "utf-8");
        const renderedSvg = await renderFrame(frame, data.blobs, data.nodeMap);
        const result = compareSvgs(actualSvg, renderedSvg, color, { maxDiffPercent: 10 });

        console.log(`  ${color}: ${result.diffPercent.toFixed(2)}% diff`);
        expect(result.diffPercent).toBeLessThan(10);
      });
    }
  });

  describe("font size frames", () => {
    const sizes = [
      "size-8",
      "size-10",
      "size-12",
      "size-14",
      "size-16",
      "size-18",
      "size-20",
      "size-24",
      "size-28",
      "size-32",
      "size-40",
      "size-48",
      "size-64",
    ];

    for (const size of sizes) {
      it(`renders ${size} correctly`, async () => {
        const frame = data.frames.get(size);
        expect(frame).toBeDefined();
        if (!frame) return;

        const actualSvg = fs.readFileSync(path.join(ACTUAL_SVG_DIR, `${size}.svg`), "utf-8");
        const renderedSvg = await renderFrame(frame, data.blobs, data.nodeMap);
        const result = compareSvgs(actualSvg, renderedSvg, size, { maxDiffPercent: 15, saveDiff: true });

        console.log(`  ${size}: ${result.diffPercent.toFixed(2)}% diff`);
        // Larger fonts have more room for variance
        expect(result.diffPercent).toBeLessThan(20);
      });
    }
  });

  describe("multiline frames", () => {
    const multilines = ["2-lines", "3-lines", "5-lines", "empty-lines", "long-word", "wrap-narrow"];

    for (const ml of multilines) {
      it(`renders ${ml} correctly`, async () => {
        const frame = data.frames.get(ml);
        expect(frame).toBeDefined();
        if (!frame) return;

        const actualSvg = fs.readFileSync(path.join(ACTUAL_SVG_DIR, `${ml}.svg`), "utf-8");
        const renderedSvg = await renderFrame(frame, data.blobs, data.nodeMap);
        const result = compareSvgs(actualSvg, renderedSvg, ml, { maxDiffPercent: 10 });

        console.log(`  ${ml}: ${result.diffPercent.toFixed(2)}% diff`);
        expect(result.diffPercent).toBeLessThan(15);
      });
    }
  });

  describe("edge cases", () => {
    const edgeCases = ["empty", "space-only", "single-char", "unicode-cjk", "unicode-emoji", "unicode-arabic"];

    for (const ec of edgeCases) {
      it(`handles ${ec}`, async () => {
        const frame = data.frames.get(ec);
        expect(frame).toBeDefined();
        if (!frame) return;

        const actualSvg = fs.readFileSync(path.join(ACTUAL_SVG_DIR, `${ec}.svg`), "utf-8");
        const renderedSvg = await renderFrame(frame, data.blobs, data.nodeMap);
        const result = compareSvgs(actualSvg, renderedSvg, ec, { maxDiffPercent: 15, saveDiff: true });

        console.log(`  ${ec}: ${result.diffPercent.toFixed(2)}% diff`);
        expect(result.diffPercent).toBeLessThan(20);
      });
    }
  });

  it("summary of all frames", async () => {
    const results: CompareResult[] = [];

    for (const fileName of actualFiles) {
      const frame = data.frames.get(fileName);
      if (!frame) continue;

      const actualSvg = fs.readFileSync(path.join(ACTUAL_SVG_DIR, `${fileName}.svg`), "utf-8");
      const renderedSvg = await renderFrame(frame, data.blobs, data.nodeMap);
      const result = compareSvgs(actualSvg, renderedSvg, fileName);
      results.push(result);
    }

    const passed = results.filter((r) => r.match).length;
    const avgDiff = results.reduce((sum, r) => sum + r.diffPercent, 0) / results.length;

    console.log("\n=== Summary ===");
    console.log(`Total: ${results.length}`);
    console.log(`Passed (≤5%): ${passed}/${results.length}`);
    console.log(`Average diff: ${avgDiff.toFixed(2)}%`);

    expect(avgDiff).toBeLessThan(10);
  }, 120000);
});
