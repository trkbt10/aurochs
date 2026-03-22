/**
 * @file Test with official Inter font to compare glyph differences
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { parse as parseFont } from "opentype.js";
import { parseFigFile, buildNodeTree, findNodesByType, type FigBlob } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import type { FontLoader, FontLoadOptions, LoadedFont } from "../src/svg/nodes/text/font/loader";
import { renderTextNodeAsPath, type PathRenderContext } from "../src/svg/nodes/text/path-render";
import { createFigSvgRenderContext } from "../src/svg/context";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/text-comprehensive");
const FIG_FILE = path.join(FIXTURES_DIR, "text-comprehensive.fig");
const ACTUAL_SVG_DIR = path.join(FIXTURES_DIR, "actual");

// Official Inter font path
const OFFICIAL_INTER_PATH = "/tmp/inter-font/extras/ttf/Inter-Regular.ttf";

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

/**
 * Font loader that uses the official Inter font
 */
function createOfficialInterFontLoader(): FontLoader {
  const fontRef = { value: null as ReturnType<typeof parseFont> | null };

  return {
    async loadFont(options: FontLoadOptions): Promise<LoadedFont | undefined> {
      if (!fontRef.value) {
        if (!fs.existsSync(OFFICIAL_INTER_PATH)) {
          console.log("Official Inter font not found at:", OFFICIAL_INTER_PATH);
          return undefined;
        }
        const data = fs.readFileSync(OFFICIAL_INTER_PATH);
        fontRef.value = parseFont(data.buffer as ArrayBuffer);
      }

      return {
        font: fontRef.value,
        family: "Inter",
        weight: options.weight ?? 400,
        style: options.style ?? "normal",
      };
    },

    async isFontAvailable(family: string): Promise<boolean> {
      return family.toLowerCase() === "inter";
    },
  };
}

const parsedDataRef = { value: null as ParsedData | null };
const fontLoaderRef = { value: null as FontLoader | null };

async function setup(): Promise<{ data: ParsedData; fontLoader: FontLoader }> {
  if (parsedDataRef.value && fontLoaderRef.value) {
    return { data: parsedDataRef.value, fontLoader: fontLoaderRef.value };
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

  parsedDataRef.value = { frames, blobs: parsed.blobs };
  fontLoaderRef.value = createOfficialInterFontLoader();

  return { data: parsedDataRef.value, fontLoader: fontLoaderRef.value };
}

describe("Official Inter font tests", () => {
  const dataRef = { value: undefined as ParsedData | undefined };
  const loaderRef = { value: undefined as FontLoader | undefined };

  beforeAll(async () => {
    const result = await setup();
    dataRef.value = result.data;
    loaderRef.value = result.fontLoader;
  });

  it("tests size-64 with official Inter font", async () => {
    const frame = dataRef.value.frames.get("size-64");
    expect(frame).toBeDefined();
    if (!frame || !frame.textNode) {return;}

    const actualPath = path.join(ACTUAL_SVG_DIR, "size-64.svg");
    if (!fs.existsSync(actualPath)) {return;}

    const ctx = createFigSvgRenderContext({
      canvasSize: { width: frame.size.width, height: frame.size.height },
      blobs: dataRef.value.blobs,
    });

    const pathCtx: PathRenderContext = {
      ...ctx,
      fontLoader: loaderRef.value,
    };

    const pathSvg = await renderTextNodeAsPath(frame.textNode, pathCtx);

    const renderedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.size.width}" height="${frame.size.height}" viewBox="0 0 ${frame.size.width} ${frame.size.height}">
<rect width="${frame.size.width}" height="${frame.size.height}" fill="white"/>
${pathSvg}
</svg>`;

    const actualSvg = fs.readFileSync(actualPath, "utf-8");
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

    console.log(`size-64 with official Inter: ${diffPercent.toFixed(2)}%`);

    expect(diffPercent).toBeDefined();
  });

  it("tests LEFT-TOP with official Inter font", async () => {
    const frame = dataRef.value.frames.get("LEFT-TOP");
    expect(frame).toBeDefined();
    if (!frame || !frame.textNode) {return;}

    const actualPath = path.join(ACTUAL_SVG_DIR, "LEFT-TOP.svg");
    if (!fs.existsSync(actualPath)) {return;}

    const ctx = createFigSvgRenderContext({
      canvasSize: { width: frame.size.width, height: frame.size.height },
      blobs: dataRef.value.blobs,
    });

    const pathCtx: PathRenderContext = {
      ...ctx,
      fontLoader: loaderRef.value,
    };

    const pathSvg = await renderTextNodeAsPath(frame.textNode, pathCtx);

    const renderedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.size.width}" height="${frame.size.height}" viewBox="0 0 ${frame.size.width} ${frame.size.height}">
<rect width="${frame.size.width}" height="${frame.size.height}" fill="white"/>
${pathSvg}
</svg>`;

    const actualSvg = fs.readFileSync(actualPath, "utf-8");
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

    console.log(`LEFT-TOP with official Inter: ${diffPercent.toFixed(2)}%`);

    expect(diffPercent).toBeDefined();
  });

  it("tests 2-lines with official Inter font", async () => {
    const frame = dataRef.value.frames.get("2-lines");
    expect(frame).toBeDefined();
    if (!frame || !frame.textNode) {return;}

    const actualPath = path.join(ACTUAL_SVG_DIR, "2-lines.svg");
    if (!fs.existsSync(actualPath)) {return;}

    const ctx = createFigSvgRenderContext({
      canvasSize: { width: frame.size.width, height: frame.size.height },
      blobs: dataRef.value.blobs,
    });

    const pathCtx: PathRenderContext = {
      ...ctx,
      fontLoader: loaderRef.value,
    };

    const pathSvg = await renderTextNodeAsPath(frame.textNode, pathCtx);

    const renderedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.size.width}" height="${frame.size.height}" viewBox="0 0 ${frame.size.width} ${frame.size.height}">
<rect width="${frame.size.width}" height="${frame.size.height}" fill="white"/>
${pathSvg}
</svg>`;

    const actualSvg = fs.readFileSync(actualPath, "utf-8");
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

    console.log(`2-lines with official Inter: ${diffPercent.toFixed(2)}%`);

    expect(diffPercent).toBeDefined();
  });
});
