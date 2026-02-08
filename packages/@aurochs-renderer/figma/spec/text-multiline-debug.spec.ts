/**
 * @file Debug test for multi-line text rendering issues
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
import { extractTextProps } from "../src/text/layout/extract-props";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/text-comprehensive");
const FIG_FILE = path.join(FIXTURES_DIR, "text-comprehensive.fig");
const ACTUAL_SVG_DIR = path.join(FIXTURES_DIR, "actual");
const DEBUG_DIR = path.join(FIXTURES_DIR, "__debug__");

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

function ensureDebugDir() {
  if (!fs.existsSync(DEBUG_DIR)) {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
  }
}

function svgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    font: { loadSystemFonts: true },
    shapeRendering: 2,
    textRendering: 2,
  });
  return Buffer.from(resvg.render().asPng());
}

let parsedData: ParsedData | null = null;
let fontLoader: CachingFontLoader | null = null;

async function setup(): Promise<{ data: ParsedData; fontLoader: CachingFontLoader }> {
  if (parsedData && fontLoader) {
    return { data: parsedData, fontLoader };
  }

  const fileData = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(fileData));
  const { roots } = buildNodeTree(parsed.nodeChanges);

  const frames = new Map<string, FrameInfo>();
  for (const canvas of findNodesByType(roots, "CANVAS")) {
    for (const frame of findNodesByType([canvas], "FRAME")) {
      const name = frame.name ?? "unnamed";
      const nodeData = frame as Record<string, unknown>;
      const size = nodeData.size as { x?: number; y?: number } | undefined;

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

  const baseLoader = createNodeFontLoaderWithFontsource();
  fontLoader = new CachingFontLoader(baseLoader);
  await fontLoader.loadFont({ family: "Inter", weight: 400 });

  return { data: parsedData, fontLoader };
}

describe("Multi-line text debugging", () => {
  let data: ParsedData;
  let loader: CachingFontLoader;

  beforeAll(async () => {
    const result = await setup();
    data = result.data;
    loader = result.fontLoader;
    ensureDebugDir();
  });

  it("analyzes size-64 in detail", async () => {
    const frame = data.frames.get("size-64");
    expect(frame).toBeDefined();
    if (!frame || !frame.textNode) return;

    // Extract text props
    const props = extractTextProps(frame.textNode);
    const textData = frame.textNode as Record<string, unknown>;

    console.log("\n=== Text Node Analysis ===");
    console.log(`Characters: "${props.characters}"`);
    console.log(`Font: ${props.fontFamily} ${props.fontWeight}`);
    console.log(`Font Size: ${props.fontSize}px`);
    console.log(`Line Height: ${props.lineHeight}px`);
    console.log(`Text Align H: ${props.textAlignHorizontal}`);
    console.log(`Text Align V: ${props.textAlignVertical}`);
    console.log(`Text Auto Resize: ${props.textAutoResize}`);
    console.log(`Size: ${JSON.stringify(props.size)}`);
    console.log(`Transform: ${JSON.stringify(props.transform)}`);

    // Check raw node data
    console.log("\n=== Raw Node Data ===");
    console.log(`textAutoResize: ${JSON.stringify(textData.textAutoResize)}`);
    console.log(`lineHeight: ${JSON.stringify(textData.lineHeight)}`);
    console.log(`size: ${JSON.stringify(textData.size)}`);
    console.log(`transform: ${JSON.stringify(textData.transform)}`);

    // Load actual SVG and analyze
    const actualPath = path.join(ACTUAL_SVG_DIR, "size-64.svg");
    const actualSvg = fs.readFileSync(actualPath, "utf-8");

    // Parse actual path coordinates
    const pathMatch = actualSvg.match(/d="([^"]+)"/);
    if (pathMatch) {
      const pathData = pathMatch[1];

      // Extract first coordinates of each M command
      const moveCommands = pathData.match(/M[\d.]+\s+[\d.]+/g) || [];
      console.log("\n=== Actual SVG Path Analysis ===");
      console.log("First 10 M commands (start points):");
      moveCommands.slice(0, 10).forEach((cmd, i) => {
        console.log(`  ${i}: ${cmd}`);
      });

      // Analyze y-coordinates to find line boundaries
      const yCoords: number[] = [];
      const yMatches = pathData.matchAll(/[ML]\s*([\d.]+)\s+([\d.]+)/g);
      for (const match of yMatches) {
        yCoords.push(parseFloat(match[2]));
      }

      // Find unique y ranges
      const sortedY = [...new Set(yCoords)].sort((a, b) => a - b);
      console.log(`\nY coordinate range: ${sortedY[0]} to ${sortedY[sortedY.length - 1]}`);

      // Identify line baselines (common y values)
      const yCounts = new Map<number, number>();
      yCoords.forEach((y) => {
        const rounded = Math.round(y);
        yCounts.set(rounded, (yCounts.get(rounded) || 0) + 1);
      });

      const commonY = Array.from(yCounts.entries())
        .filter(([_, count]) => count > 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      console.log("\nMost common Y values (likely baselines):");
      commonY.forEach(([y, count]) => {
        console.log(`  y=${y}: ${count} occurrences`);
      });
    }

    // Render with our path-based approach
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

    // Save debug files
    fs.writeFileSync(path.join(DEBUG_DIR, "size-64-actual.svg"), actualSvg);
    fs.writeFileSync(path.join(DEBUG_DIR, "size-64-rendered.svg"), renderedSvg);

    // Analyze our rendered path
    console.log("\n=== Our Rendered Path Analysis ===");
    const ourPathMatch = pathSvg.match(/d="([^"]+)"/);
    if (ourPathMatch) {
      const ourPathData = ourPathMatch[1];
      const ourMoveCommands = ourPathData.match(/M[\d.]+\s+[\d.]+/g) || [];
      console.log("First 10 M commands (start points):");
      ourMoveCommands.slice(0, 10).forEach((cmd, i) => {
        console.log(`  ${i}: ${cmd}`);
      });
    }

    // Visual comparison
    const actualPng = svgToPng(actualSvg);
    const renderedPng = svgToPng(renderedSvg);

    fs.writeFileSync(path.join(DEBUG_DIR, "size-64-actual.png"), actualPng);
    fs.writeFileSync(path.join(DEBUG_DIR, "size-64-rendered.png"), renderedPng);

    // Create diff image
    const actualPngParsed = PNG.sync.read(actualPng);
    const renderedPngParsed = PNG.sync.read(renderedPng);

    const width = Math.max(actualPngParsed.width, renderedPngParsed.width);
    const height = Math.max(actualPngParsed.height, renderedPngParsed.height);
    const diff = new PNG({ width, height });

    const diffPixels = pixelmatch(actualPngParsed.data, renderedPngParsed.data, diff.data, width, height, {
      threshold: 0.1,
      includeAA: false,
    });

    const diffPercent = (diffPixels / (width * height)) * 100;
    fs.writeFileSync(path.join(DEBUG_DIR, "size-64-diff.png"), PNG.sync.write(diff));

    console.log(`\n=== Comparison Result ===`);
    console.log(`Diff: ${diffPercent.toFixed(2)}%`);
    console.log(`Files saved to: ${DEBUG_DIR}`);

    expect(diffPercent).toBeDefined();
  });

  it("analyzes 2-lines frame", async () => {
    const frame = data.frames.get("2-lines");
    if (!frame || !frame.textNode) {
      console.log("2-lines frame not found");
      return;
    }

    const props = extractTextProps(frame.textNode);

    console.log("\n=== 2-lines Frame Analysis ===");
    console.log(`Characters: "${props.characters}"`);
    console.log(`Font Size: ${props.fontSize}px`);
    console.log(`Line Height: ${props.lineHeight}px`);
    console.log(`Size: ${JSON.stringify(props.size)}`);
    console.log(`Transform: ${JSON.stringify(props.transform)}`);

    const actualPath = path.join(ACTUAL_SVG_DIR, "2-lines.svg");
    if (!fs.existsSync(actualPath)) {
      console.log("Actual SVG not found");
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

    fs.writeFileSync(path.join(DEBUG_DIR, "2-lines-actual.svg"), actualSvg);
    fs.writeFileSync(path.join(DEBUG_DIR, "2-lines-rendered.svg"), renderedSvg);

    const actualPng = svgToPng(actualSvg);
    const renderedPng = svgToPng(renderedSvg);

    const actualPngParsed = PNG.sync.read(actualPng);
    const renderedPngParsed = PNG.sync.read(renderedPng);

    const width = actualPngParsed.width;
    const height = actualPngParsed.height;
    const diff = new PNG({ width, height });

    const diffPixels = pixelmatch(actualPngParsed.data, renderedPngParsed.data, diff.data, width, height, {
      threshold: 0.1,
      includeAA: false,
    });

    const diffPercent = (diffPixels / (width * height)) * 100;

    console.log(`Diff: ${diffPercent.toFixed(2)}%`);

    fs.writeFileSync(path.join(DEBUG_DIR, "2-lines-diff.png"), PNG.sync.write(diff));

    expect(diffPercent).toBeDefined();
  });
});
