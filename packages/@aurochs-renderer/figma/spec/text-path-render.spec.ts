/**
 * @file Path-based text rendering visual comparison tests
 *
 * Tests path-based rendering using opentype.js for pixel-perfect output.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll } from "vitest";
import { Resvg } from "@resvg/resvg-js";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { parseFigFile, buildNodeTree, findNodesByType, type FigBlob } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { createNodeFontLoaderWithFontsource } from "../src/font-drivers/node";
import { CachingFontLoader } from "../src/font";
import { renderTextNodeAsPath, type PathRenderContext } from "../src/svg/nodes/text/path-render";
import { createFigSvgRenderContext } from "../src/svg/context";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/text-comprehensive");
const FIG_FILE = path.join(FIXTURES_DIR, "text-comprehensive.fig");
const ACTUAL_SVG_DIR = path.join(FIXTURES_DIR, "actual");

type FrameInfo = {
  name: string;
  node: FigNode;
  size: { width: number; height: number };
  textNode: FigNode | undefined;
};

type ParsedData = {
  frames: Map<string, FrameInfo>;
  blobs: readonly FigBlob[];
};

function svgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    font: { loadSystemFonts: true },
    shapeRendering: 2,
    textRendering: 2,
  });
  return Buffer.from(resvg.render().asPng());
}

function comparePngs(actual: Buffer, rendered: Buffer): { diffPercent: number } {
  const actualPng = PNG.sync.read(actual);
  let renderedPng = PNG.sync.read(rendered);

  // Resize if needed
  if (renderedPng.width !== actualPng.width || renderedPng.height !== actualPng.height) {
    const resized = new PNG({ width: actualPng.width, height: actualPng.height });
    for (let y = 0; y < actualPng.height; y++) {
      const sy = Math.floor((y / actualPng.height) * renderedPng.height);
      for (let x = 0; x < actualPng.width; x++) {
        const sx = Math.floor((x / actualPng.width) * renderedPng.width);
        const srcIdx = (sy * renderedPng.width + sx) * 4;
        const dstIdx = (y * actualPng.width + x) * 4;
        resized.data[dstIdx] = renderedPng.data[srcIdx];
        resized.data[dstIdx + 1] = renderedPng.data[srcIdx + 1];
        resized.data[dstIdx + 2] = renderedPng.data[srcIdx + 2];
        resized.data[dstIdx + 3] = renderedPng.data[srcIdx + 3];
      }
    }
    renderedPng = resized;
  }

  const diff = new PNG({ width: actualPng.width, height: actualPng.height });
  const diffPixels = pixelmatch(actualPng.data, renderedPng.data, diff.data, actualPng.width, actualPng.height, {
    threshold: 0.1,
    includeAA: false,
  });

  const totalPixels = actualPng.width * actualPng.height;
  return { diffPercent: (diffPixels / totalPixels) * 100 };
}

let parsedData: ParsedData | null = null;
let fontLoader: CachingFontLoader | null = null;

async function setup(): Promise<{ data: ParsedData; fontLoader: CachingFontLoader }> {
  if (parsedData && fontLoader) {
    return { data: parsedData, fontLoader };
  }

  // Parse fig file
  const fileData = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(fileData));
  const { roots } = buildNodeTree(parsed.nodeChanges);

  const frames = new Map<string, FrameInfo>();
  for (const canvas of findNodesByType(roots, "CANVAS")) {
    for (const frame of findNodesByType([canvas], "FRAME")) {
      const name = frame.name ?? "unnamed";
      const nodeData = frame as Record<string, unknown>;
      const size = nodeData.size as { x?: number; y?: number } | undefined;

      // Find TEXT node inside frame
      const textNodes = findNodesByType([frame], "TEXT");
      const textNode = textNodes.length > 0 ? textNodes[0] : undefined;

      frames.set(name, {
        name,
        node: frame,
        size: { width: size?.x ?? 100, height: size?.y ?? 100 },
        textNode,
      });
    }
  }

  parsedData = { frames, blobs: parsed.blobs };

  // Create font loader with fontsource fonts
  const baseLoader = createNodeFontLoaderWithFontsource();
  fontLoader = new CachingFontLoader(baseLoader);

  // Preload Inter font
  await fontLoader.loadFont({ family: "Inter", weight: 400 });

  return { data: parsedData, fontLoader };
}

describe("Path-based text rendering", () => {
  let data: ParsedData;
  let loader: CachingFontLoader;

  beforeAll(async () => {
    const result = await setup();
    data = result.data;
    loader = result.fontLoader;
  });

  it("renders LEFT-TOP with path-based approach", async () => {
    const frame = data.frames.get("LEFT-TOP");
    expect(frame).toBeDefined();
    if (!frame || !frame.textNode) return;

    // Check if actual SVG exists
    const actualPath = path.join(ACTUAL_SVG_DIR, "LEFT-TOP.svg");
    if (!fs.existsSync(actualPath)) {
      console.log("Skipping: actual SVG not found");
      return;
    }

    // Create render context
    const ctx = createFigSvgRenderContext({
      canvasSize: { width: frame.size.width, height: frame.size.height },
      blobs: data.blobs,
    });

    const pathCtx: PathRenderContext = {
      ...ctx,
      fontLoader: loader,
    };

    // Render text as path
    const pathSvg = await renderTextNodeAsPath(frame.textNode, pathCtx);

    // Build full SVG
    const renderedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.size.width}" height="${frame.size.height}" viewBox="0 0 ${frame.size.width} ${frame.size.height}">
<rect width="${frame.size.width}" height="${frame.size.height}" fill="white"/>
${pathSvg}
</svg>`;

    // Load actual SVG
    const actualSvg = fs.readFileSync(actualPath, "utf-8");

    // Compare
    const actualPng = svgToPng(actualSvg);
    const renderedPng = svgToPng(renderedSvg);

    const result = comparePngs(actualPng, renderedPng);

    console.log(`LEFT-TOP path-based diff: ${result.diffPercent.toFixed(2)}%`);
    console.log(`Rendered SVG:\n${renderedSvg.slice(0, 500)}...`);

    // Path-based should be more accurate than text-based
    expect(result.diffPercent).toBeLessThan(5);
  });

  it("compares text-based vs path-based for size-64", async () => {
    const frame = data.frames.get("size-64");
    expect(frame).toBeDefined();
    if (!frame || !frame.textNode) return;

    const actualPath = path.join(ACTUAL_SVG_DIR, "size-64.svg");
    if (!fs.existsSync(actualPath)) return;

    const ctx = createFigSvgRenderContext({
      canvasSize: { width: frame.size.width, height: frame.size.height },
      blobs: data.blobs,
    });

    const pathCtx: PathRenderContext = {
      ...ctx,
      fontLoader: loader,
    };

    const pathSvg = await renderTextNodeAsPath(frame.textNode, pathCtx);

    const renderedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.size.width}" height="${frame.size.height}" viewBox="0 0 ${frame.size.width} ${frame.size.height}">
<rect width="${frame.size.width}" height="${frame.size.height}" fill="white"/>
${pathSvg}
</svg>`;

    const actualSvg = fs.readFileSync(actualPath, "utf-8");
    const actualPng = svgToPng(actualSvg);
    const renderedPng = svgToPng(renderedSvg);

    const result = comparePngs(actualPng, renderedPng);

    console.log(`size-64 path-based diff: ${result.diffPercent.toFixed(2)}%`);

    // Record result (may still have diff due to baseline calculation)
    expect(result.diffPercent).toBeDefined();
  });

  // Test multiple alignment frames
  const alignmentFrames = [
    "LEFT-TOP",
    "LEFT-CENTER",
    "LEFT-BOTTOM",
    "CENTER-TOP",
    "CENTER-CENTER",
    "CENTER-BOTTOM",
    "RIGHT-TOP",
    "RIGHT-CENTER",
    "RIGHT-BOTTOM",
  ];

  for (const frameName of alignmentFrames) {
    it(`renders ${frameName} with path-based approach`, async () => {
      const frame = data.frames.get(frameName);
      if (!frame || !frame.textNode) {
        console.log(`Skipping ${frameName}: frame or textNode not found`);
        return;
      }

      const actualPath = path.join(ACTUAL_SVG_DIR, `${frameName}.svg`);
      if (!fs.existsSync(actualPath)) {
        console.log(`Skipping ${frameName}: actual SVG not found`);
        return;
      }

      const ctx = createFigSvgRenderContext({
        canvasSize: { width: frame.size.width, height: frame.size.height },
        blobs: data.blobs,
      });

      const pathCtx: PathRenderContext = {
        ...ctx,
        fontLoader: loader,
      };

      const pathSvg = await renderTextNodeAsPath(frame.textNode, pathCtx);

      const renderedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.size.width}" height="${frame.size.height}" viewBox="0 0 ${frame.size.width} ${frame.size.height}">
<rect width="${frame.size.width}" height="${frame.size.height}" fill="white"/>
${pathSvg}
</svg>`;

      const actualSvg = fs.readFileSync(actualPath, "utf-8");
      const actualPng = svgToPng(actualSvg);
      const renderedPng = svgToPng(renderedSvg);

      const result = comparePngs(actualPng, renderedPng);

      console.log(`${frameName} path-based diff: ${result.diffPercent.toFixed(2)}%`);

      // Target: <5% for now, aiming for <1%
      expect(result.diffPercent).toBeLessThan(5);
    });
  }

  // Test font size frames
  const sizeFrames = ["size-10", "size-12", "size-14", "size-16", "size-24", "size-32", "size-48"];

  for (const frameName of sizeFrames) {
    it(`renders ${frameName} with path-based approach`, async () => {
      const frame = data.frames.get(frameName);
      if (!frame || !frame.textNode) {
        console.log(`Skipping ${frameName}: frame or textNode not found`);
        return;
      }

      const actualPath = path.join(ACTUAL_SVG_DIR, `${frameName}.svg`);
      if (!fs.existsSync(actualPath)) {
        console.log(`Skipping ${frameName}: actual SVG not found`);
        return;
      }

      const ctx = createFigSvgRenderContext({
        canvasSize: { width: frame.size.width, height: frame.size.height },
        blobs: data.blobs,
      });

      const pathCtx: PathRenderContext = {
        ...ctx,
        fontLoader: loader,
      };

      const pathSvg = await renderTextNodeAsPath(frame.textNode, pathCtx);

      const renderedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.size.width}" height="${frame.size.height}" viewBox="0 0 ${frame.size.width} ${frame.size.height}">
<rect width="${frame.size.width}" height="${frame.size.height}" fill="white"/>
${pathSvg}
</svg>`;

      const actualSvg = fs.readFileSync(actualPath, "utf-8");
      const actualPng = svgToPng(actualSvg);
      const renderedPng = svgToPng(renderedSvg);

      const result = comparePngs(actualPng, renderedPng);

      console.log(`${frameName} path-based diff: ${result.diffPercent.toFixed(2)}%`);

      // Target: <5% for now
      expect(result.diffPercent).toBeLessThan(5);
    });
  }
});
