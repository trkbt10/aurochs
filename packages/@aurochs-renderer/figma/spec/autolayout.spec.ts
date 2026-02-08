/**
 * @file AutoLayout rendering tests
 * Compares renderer output against Figma exports
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFigFile, buildNodeTree, type FigBlob, type FigImage } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { renderCanvas } from "../src/svg/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/autolayout");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const FIG_FILE = path.join(FIXTURES_DIR, "autolayout.fig");

/** Layer name to SVG filename mapping */
const LAYER_FILE_MAP: Record<string, string> = {
  "simple-rects": "simple-rects.svg",
  "auto-h-min": "auto-h-min.svg",
  "auto-h-center": "auto-h-center.svg",
  "auto-h-max": "auto-h-max.svg",
  "auto-v-min": "auto-v-min.svg",
  "auto-v-center": "auto-v-center.svg",
  "auto-v-max": "auto-v-max.svg",
  "auto-h-space-between": "auto-h-space-between.svg",
  "auto-gap-0": "auto-gap-0.svg",
  "auto-gap-20": "auto-gap-20.svg",
  "auto-padding-20": "auto-padding-20.svg",
  "constraints-corners": "constraints-corners.svg",
};

type LayerInfo = {
  name: string;
  node: FigNode;
  size: { width: number; height: number };
};

type ParsedData = {
  canvases: readonly FigNode[];
  layers: Map<string, LayerInfo>;
  blobs: readonly FigBlob[];
  images: ReadonlyMap<string, FigImage>;
  nodeMap: ReadonlyMap<string, FigNode>;
};

let parsedDataCache: ParsedData | null = null;

async function loadFigFile(): Promise<ParsedData> {
  if (parsedDataCache) return parsedDataCache;

  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);

  const canvases = roots
    .flatMap((r) => r.children ?? [])
    .filter((n) => {
      const d = n as Record<string, unknown>;
      return (d.type as { name: string })?.name === "CANVAS";
    });

  const layers = new Map<string, LayerInfo>();
  for (const canvas of canvases) {
    for (const child of canvas.children ?? []) {
      const name = child.name ?? "unnamed";
      const nodeData = child as Record<string, unknown>;
      const size = nodeData.size as { x?: number; y?: number } | undefined;
      layers.set(name, {
        name,
        node: child,
        size: { width: size?.x ?? 100, height: size?.y ?? 100 },
      });
    }
  }

  // If no canvases found, try direct children of roots
  if (layers.size === 0) {
    for (const root of roots) {
      for (const child of root.children ?? []) {
        const nodeData = child as Record<string, unknown>;
        const type = (nodeData.type as { name: string })?.name;
        if (type === "CANVAS") {
          for (const grandchild of child.children ?? []) {
            const name = grandchild.name ?? "unnamed";
            const size = (grandchild as Record<string, unknown>).size as { x?: number; y?: number } | undefined;
            layers.set(name, {
              name,
              node: grandchild,
              size: { width: size?.x ?? 100, height: size?.y ?? 100 },
            });
          }
        }
      }
    }
  }

  parsedDataCache = { canvases, layers, blobs: parsed.blobs, images: parsed.images, nodeMap };
  return parsedDataCache;
}

/** Extract rect positions from SVG (handles both x/y attributes and transform) */
function extractRectPositions(svg: string): Array<{ id: string; x: number; y: number; width: number; height: number }> {
  const results: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
  // Match all rects (with or without id)
  const rectRegex = /<rect[^>]*>/g;
  let match;
  let index = 0;

  while ((match = rectRegex.exec(svg)) !== null) {
    const rectStr = match[0];

    // Skip background rects (first rect or rects that fill the whole viewBox)
    const wMatch = rectStr.match(/\bwidth="([^"]*)"/);
    const hMatch = rectStr.match(/\bheight="([^"]*)"/);
    const width = parseFloat(wMatch?.[1] ?? "0");
    const height = parseFloat(hMatch?.[1] ?? "0");

    // Check for id
    const idMatch = rectStr.match(/\bid="([^"]*)"/);
    const id = idMatch?.[1] ?? `rect-${index}`;

    // Get position from x/y attributes
    const xMatch = rectStr.match(/\bx="([^"]*)"/);
    const yMatch = rectStr.match(/\by="([^"]*)"/);
    let x = parseFloat(xMatch?.[1] ?? "0");
    let y = parseFloat(yMatch?.[1] ?? "0");

    // Check for transform="matrix(1, 0, 0, 1, tx, ty)"
    const transformMatch = rectStr.match(/transform="matrix\(1,\s*0,\s*0,\s*1,\s*([\d.-]+),\s*([\d.-]+)\)"/);
    if (transformMatch) {
      x += parseFloat(transformMatch[1]);
      y += parseFloat(transformMatch[2]);
    }

    results.push({ id, x, y, width, height });
    index++;
  }

  return results;
}

/** Get SVG viewBox dimensions */
function getSvgSize(svg: string): { width: number; height: number } {
  const widthMatch = svg.match(/width="(\d+)"/);
  const heightMatch = svg.match(/height="(\d+)"/);
  return {
    width: parseInt(widthMatch?.[1] ?? "100", 10),
    height: parseInt(heightMatch?.[1] ?? "100", 10),
  };
}

const WRITE_SNAPSHOTS = true;

describe("AutoLayout Rendering", () => {
  beforeAll(async () => {
    await loadFigFile();
    if (WRITE_SNAPSHOTS && !fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
  });

  for (const [layerName, fileName] of Object.entries(LAYER_FILE_MAP)) {
    it(`renders "${layerName}" with correct layout`, async () => {
      const data = await loadFigFile();
      const layer = data.layers.get(layerName);

      if (!layer) {
        console.log(`SKIP: Layer "${layerName}" not found`);
        console.log(`  Available: ${[...data.layers.keys()].join(", ")}`);
        return;
      }

      const actualPath = path.join(ACTUAL_DIR, fileName);
      if (!fs.existsSync(actualPath)) {
        console.log(`SKIP: Actual SVG not found: ${fileName}`);
        return;
      }

      // Load Figma export
      const actualSvg = fs.readFileSync(actualPath, "utf-8");
      const actualSize = getSvgSize(actualSvg);
      const actualRects = extractRectPositions(actualSvg);

      // Render
      const wrapperCanvas: FigNode = {
        type: "CANVAS",
        name: layerName,
        children: [layer.node],
      };

      const result = await renderCanvas(wrapperCanvas, {
        width: actualSize.width,
        height: actualSize.height,
        blobs: data.blobs,
        images: data.images,
        symbolMap: data.nodeMap,
      });

      // Write snapshot
      if (WRITE_SNAPSHOTS) {
        fs.writeFileSync(path.join(SNAPSHOTS_DIR, fileName), result.svg);
      }

      const renderedRects = extractRectPositions(result.svg);

      // Filter out background rects (full-size rects at origin)
      const actualContent = actualRects.filter(
        (r) => !(r.width === actualSize.width && r.height === actualSize.height && r.x === 0 && r.y === 0),
      );
      const renderedContent = renderedRects.filter(
        (r) => !(r.width === actualSize.width && r.height === actualSize.height && r.x === 0 && r.y === 0),
      );

      // Compare
      console.log(`\n=== ${layerName} ===`);
      console.log(`Size: ${actualSize.width}x${actualSize.height}`);
      console.log(`Content rects: actual=${actualContent.length}, rendered=${renderedContent.length}`);

      // Show differences if any
      let allMatch = true;
      for (let i = 0; i < Math.max(actualContent.length, renderedContent.length); i++) {
        const a = actualContent[i];
        const r = renderedContent[i];
        if (!a || !r) {
          console.log(`  [${i}] MISSING: actual=${a ? "yes" : "no"}, rendered=${r ? "yes" : "no"}`);
          allMatch = false;
        } else {
          const posMatch = Math.abs(a.x - r.x) < 1 && Math.abs(a.y - r.y) < 1;
          const sizeMatch = Math.abs(a.width - r.width) < 1 && Math.abs(a.height - r.height) < 1;
          if (!posMatch || !sizeMatch) {
            console.log(
              `  [${i}] DIFF: actual=(${a.x},${a.y} ${a.width}x${a.height}), rendered=(${r.x},${r.y} ${r.width}x${r.height})`,
            );
            allMatch = false;
          }
        }
      }
      if (allMatch) {
        console.log(`  All ${actualContent.length} positions match ✓`);
      }

      // Assertions
      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain("</svg>");
      expect(renderedContent.length).toBe(actualContent.length);

      // Verify each position matches
      for (let i = 0; i < actualContent.length; i++) {
        const a = actualContent[i];
        const r = renderedContent[i];
        expect(r).toBeDefined();
        expect(Math.abs(r.x - a.x)).toBeLessThan(1);
        expect(Math.abs(r.y - a.y)).toBeLessThan(1);
        expect(Math.abs(r.width - a.width)).toBeLessThan(1);
        expect(Math.abs(r.height - a.height)).toBeLessThan(1);
      }
    });
  }
});

describe("AutoLayout Debug", () => {
  it("shows .fig file structure", async () => {
    const data = await loadFigFile();

    console.log("\n=== Layers in autolayout.fig ===");
    for (const [name, info] of data.layers) {
      const nodeData = info.node as Record<string, unknown>;
      const stackMode = nodeData.stackMode as { name: string } | undefined;
      const stackSpacing = nodeData.stackSpacing;
      const stackPadding = nodeData.stackPadding;

      console.log(`\n${name} (${info.size.width}x${info.size.height}):`);
      if (stackMode) {
        console.log(`  stackMode: ${stackMode.name}`);
        console.log(`  stackSpacing: ${stackSpacing}`);
        console.log(`  stackPadding: ${JSON.stringify(stackPadding)}`);
      }

      // Show children
      for (const child of info.node.children ?? []) {
        const cd = child as Record<string, unknown>;
        const size = cd.size as { x: number; y: number };
        const transform = cd.transform as { m02: number; m12: number };
        console.log(`  - ${child.name}: size=${size?.x}x${size?.y}, pos=${transform?.m02},${transform?.m12}`);
      }
    }

    expect(data.layers.size).toBeGreaterThan(0);
  });
});
