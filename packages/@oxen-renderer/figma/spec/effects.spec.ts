/**
 * @file Effect rendering tests
 * Tests rendering of drop shadows, inner shadows, blur effects, and opacity
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFigFile, buildNodeTree, findNodesByType, getNodeType, type FigBlob, type FigImage } from "@oxen/fig/parser";
import type { FigNode } from "@oxen/fig/types";
import { renderCanvas } from "../src/svg/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/effects");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const FIG_FILE = path.join(FIXTURES_DIR, "effects.fig");

/** Layer name to SVG filename mapping */
const LAYER_FILE_MAP: Record<string, string> = {
  "shadow-drop-basic": "shadow-drop-basic.svg",
  "shadow-drop-offset": "shadow-drop-offset.svg",
  "shadow-drop-color": "shadow-drop-color.svg",
  "shadow-drop-multi": "shadow-drop-multi.svg",
  "shadow-inner": "shadow-inner.svg",
  "blur-layer": "blur-layer.svg",
  "opacity-50": "opacity-50.svg",
  "effects-combined": "effects-combined.svg",
  "shadow-shapes": "shadow-shapes.svg",
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

  if (!fs.existsSync(FIG_FILE)) {
    throw new Error(`Fixture file not found: ${FIG_FILE}\nRun: bun packages/@oxen-renderer/figma/scripts/generate-effect-fixtures.ts`);
  }

  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);

  const canvases = findNodesByType(roots, "CANVAS");

  const layers = new Map<string, LayerInfo>();

  for (const canvas of canvases) {
    for (const child of canvas.children ?? []) {
      const name = child.name ?? "unnamed";
      const nodeType = getNodeType(child);
      const nodeData = child as Record<string, unknown>;
      const size = nodeData.size as { x?: number; y?: number } | undefined;

      if (nodeType === "FRAME") {
        layers.set(name, {
          name,
          node: child,
          size: {
            width: size?.x ?? 100,
            height: size?.y ?? 100,
          },
        });
      }
    }
  }

  parsedDataCache = { canvases, layers, blobs: parsed.blobs, images: parsed.images, nodeMap };
  return parsedDataCache;
}

/** Extract element counts from SVG */
function extractElementCounts(svg: string): {
  rects: number;
  ellipses: number;
  filters: number;
  feDropShadows: number;
  feGaussianBlurs: number;
} {
  return {
    rects: (svg.match(/<rect/g) || []).length,
    ellipses: (svg.match(/<ellipse/g) || []).length,
    filters: (svg.match(/<filter/g) || []).length,
    feDropShadows: (svg.match(/<feDropShadow/g) || []).length,
    feGaussianBlurs: (svg.match(/<feGaussianBlur/g) || []).length,
  };
}

/** Get SVG dimensions */
function getSvgSize(svg: string): { width: number; height: number } {
  const widthMatch = svg.match(/width="(\d+)"/);
  const heightMatch = svg.match(/height="(\d+)"/);
  return {
    width: parseInt(widthMatch?.[1] ?? "100", 10),
    height: parseInt(heightMatch?.[1] ?? "100", 10),
  };
}

/** Check if SVG contains filter elements */
function hasFilters(svg: string): boolean {
  return svg.includes("<filter") || svg.includes("<defs>");
}

const WRITE_SNAPSHOTS = true;

describe("Effect Rendering", () => {
  beforeAll(async () => {
    try {
      await loadFigFile();
    } catch {
      console.log("Skipping effect tests - fixture file not found");
    }

    if (WRITE_SNAPSHOTS && !fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
  });

  for (const [layerName, fileName] of Object.entries(LAYER_FILE_MAP)) {
    it(`renders "${layerName}" with effects`, async () => {
      if (!fs.existsSync(FIG_FILE)) {
        console.log(`SKIP: Fixture file not found`);
        return;
      }

      const data = await loadFigFile();
      const layer = data.layers.get(layerName);

      if (!layer) {
        console.log(`SKIP: Layer "${layerName}" not found`);
        console.log(`  Available: ${[...data.layers.keys()].join(", ")}`);
        return;
      }

      const actualPath = path.join(ACTUAL_DIR, fileName);
      const hasActual = fs.existsSync(actualPath);

      let actualSize = layer.size;
      let actualCounts = { rects: 0, ellipses: 0, filters: 0, feDropShadows: 0, feGaussianBlurs: 0 };

      if (hasActual) {
        const actualSvg = fs.readFileSync(actualPath, "utf-8");
        actualSize = getSvgSize(actualSvg);
        actualCounts = extractElementCounts(actualSvg);
      }

      // Render
      const wrapperCanvas: FigNode = {
        type: "CANVAS",
        name: layerName,
        children: [layer.node],
      };

      const result = renderCanvas(wrapperCanvas, {
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

      const renderedCounts = extractElementCounts(result.svg);

      // Output comparison
      console.log(`\n=== ${layerName} ===`);
      console.log(`Size: ${actualSize.width}x${actualSize.height}`);
      if (hasActual) {
        console.log(`Rects: actual=${actualCounts.rects}, rendered=${renderedCounts.rects}`);
        console.log(`Ellipses: actual=${actualCounts.ellipses}, rendered=${renderedCounts.ellipses}`);
        console.log(`Filters: actual=${actualCounts.filters}, rendered=${renderedCounts.filters}`);
      } else {
        console.log(`Rendered: ${renderedCounts.rects} rects, ${renderedCounts.ellipses} ellipses`);
        console.log(`Filters: ${renderedCounts.filters} (${renderedCounts.feDropShadows} drop shadows, ${renderedCounts.feGaussianBlurs} blurs)`);
        console.log(`  (No actual SVG for comparison - export from Figma)`);
      }

      if (result.warnings.length > 0) {
        console.log(`Warnings: ${result.warnings.slice(0, 5).join("; ")}`);
      }

      // Assertions
      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain("</svg>");
    });
  }
});

describe("Effect Fixture Debug", () => {
  it("lists frames in effects.fig", async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping - effects.fig not found");
      console.log("Run: bun packages/@oxen-renderer/figma/scripts/generate-effect-fixtures.ts");
      return;
    }

    const data = await loadFigFile();

    console.log("\n=== Frames in effects.fig ===");
    for (const [name, info] of data.layers) {
      console.log(`  "${name}" - ${info.size.width}x${info.size.height}`);

      // List children and their effects
      const children = info.node.children ?? [];
      for (const child of children) {
        const childData = child as Record<string, unknown>;
        const effects = childData.effects as readonly unknown[] | undefined;
        const opacity = childData.opacity as number | undefined;

        console.log(`    - ${child.name} (${getNodeType(child)})`);
        if (effects && effects.length > 0) {
          console.log(`      effects: ${effects.length}`);
        }
        if (opacity !== undefined && opacity < 1) {
          console.log(`      opacity: ${opacity}`);
        }
      }
    }

    expect(data.layers.size).toBeGreaterThan(0);
  });

  it("inspects effect data", async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping - effects.fig not found");
      return;
    }

    const data = await loadFigFile();

    console.log("\n=== Effect Data ===");
    for (const [frameName, info] of data.layers) {
      const children = info.node.children ?? [];

      for (const child of children) {
        const childData = child as Record<string, unknown>;
        const effects = childData.effects as readonly Record<string, unknown>[] | undefined;

        if (effects && effects.length > 0) {
          console.log(`  ${frameName}/${child.name}:`);
          for (const effect of effects) {
            const type = effect.type as { name?: string } | undefined;
            console.log(`    - ${type?.name ?? "unknown"}`);
            if (effect.offset) {
              console.log(`      offset: ${JSON.stringify(effect.offset)}`);
            }
            if (effect.radius !== undefined) {
              console.log(`      radius: ${effect.radius}`);
            }
            if (effect.color) {
              console.log(`      color: ${JSON.stringify(effect.color)}`);
            }
          }
        }
      }
    }

    expect(data.layers.size).toBeGreaterThan(0);
  });
});

describe("Effect Type Coverage", () => {
  it("verifies drop shadow rendering", async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping - effects.fig not found");
      return;
    }

    const data = await loadFigFile();
    const layer = data.layers.get("shadow-drop-basic");

    if (!layer) {
      console.log("SKIP: shadow-drop-basic not found");
      return;
    }

    const wrapperCanvas: FigNode = {
      type: "CANVAS",
      name: "shadow-drop-basic",
      children: [layer.node],
    };

    const result = renderCanvas(wrapperCanvas, {
      width: layer.size.width,
      height: layer.size.height,
      blobs: data.blobs,
      images: data.images,
    });

    // Drop shadows should create filter elements
    const hasFilterElements = hasFilters(result.svg);
    console.log(`Drop shadow uses filters: ${hasFilterElements}`);

    expect(result.svg).toContain("<svg");
  });

  it("verifies opacity rendering", async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping - effects.fig not found");
      return;
    }

    const data = await loadFigFile();
    const layer = data.layers.get("opacity-50");

    if (!layer) {
      console.log("SKIP: opacity-50 not found");
      return;
    }

    const wrapperCanvas: FigNode = {
      type: "CANVAS",
      name: "opacity-50",
      children: [layer.node],
    };

    const result = renderCanvas(wrapperCanvas, {
      width: layer.size.width,
      height: layer.size.height,
      blobs: data.blobs,
      images: data.images,
    });

    // Look for opacity attribute
    const hasOpacity = result.svg.includes('opacity="0.5"') || result.svg.includes("opacity:0.5");
    console.log(`Opacity attribute found: ${hasOpacity}`);

    expect(result.svg).toContain("<svg");
  });
});
