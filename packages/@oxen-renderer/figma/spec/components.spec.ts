/**
 * @file Component (SYMBOL/INSTANCE) rendering tests
 * Tests rendering of component definitions and instances
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFigFile, buildNodeTree, findNodesByType, getNodeType, type FigBlob, type FigImage } from "@oxen/fig/parser";
import type { FigNode } from "@oxen/fig/types";
import { renderCanvas } from "../src/svg/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/components");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const FIG_FILE = path.join(FIXTURES_DIR, "components.fig");

/** Layer name to SVG filename mapping */
const LAYER_FILE_MAP: Record<string, string> = {
  "instance-single": "instance-single.svg",
  "instance-multi": "instance-multi.svg",
  "instance-override-fill": "instance-override-fill.svg",
  "instance-nested": "instance-nested.svg",
  "instance-in-autolayout": "instance-in-autolayout.svg",
  "instance-icons": "instance-icons.svg",
};

type LayerInfo = {
  name: string;
  node: FigNode;
  size: { width: number; height: number };
};

type ParsedData = {
  canvases: readonly FigNode[];
  layers: Map<string, LayerInfo>;
  symbols: Map<string, FigNode>;
  blobs: readonly FigBlob[];
  images: ReadonlyMap<string, FigImage>;
  nodeMap: ReadonlyMap<string, FigNode>;
};

let parsedDataCache: ParsedData | null = null;

async function loadFigFile(): Promise<ParsedData> {
  if (parsedDataCache) return parsedDataCache;

  if (!fs.existsSync(FIG_FILE)) {
    throw new Error(`Fixture file not found: ${FIG_FILE}\nRun: bun packages/@oxen-renderer/figma/scripts/generate-component-fixtures.ts`);
  }

  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);

  const canvases = findNodesByType(roots, "CANVAS");

  const layers = new Map<string, LayerInfo>();
  const symbols = new Map<string, FigNode>();

  for (const canvas of canvases) {
    for (const child of canvas.children ?? []) {
      const name = child.name ?? "unnamed";
      const nodeType = getNodeType(child);
      const nodeData = child as Record<string, unknown>;
      const size = nodeData.size as { x?: number; y?: number } | undefined;

      if (nodeType === "SYMBOL") {
        symbols.set(name, child);
      } else if (nodeType === "FRAME") {
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

  parsedDataCache = { canvases, layers, symbols, blobs: parsed.blobs, images: parsed.images, nodeMap };
  return parsedDataCache;
}

/** Count instances in SVG (by looking for pattern) */
function countInstances(svg: string): number {
  // Instances are typically rendered as groups
  // Count main content groups (excluding defs and clip paths)
  const groupMatches = svg.match(/<g[^>]*>/g) || [];
  return groupMatches.length;
}

/** Extract element counts from SVG */
function extractElementCounts(svg: string): {
  rects: number;
  texts: number;
  groups: number;
  clipPaths: number;
} {
  return {
    rects: (svg.match(/<rect/g) || []).length,
    texts: (svg.match(/<text/g) || []).length,
    groups: (svg.match(/<g[^>]*>/g) || []).length,
    clipPaths: (svg.match(/<clipPath/g) || []).length,
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

const WRITE_SNAPSHOTS = true;

describe("Component Rendering", () => {
  beforeAll(async () => {
    try {
      await loadFigFile();
    } catch {
      console.log("Skipping component tests - fixture file not found");
    }

    if (WRITE_SNAPSHOTS && !fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
  });

  for (const [layerName, fileName] of Object.entries(LAYER_FILE_MAP)) {
    it(`renders "${layerName}" with resolved instances`, async () => {
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
      let actualCounts = { rects: 0, texts: 0, groups: 0, clipPaths: 0 };

      if (hasActual) {
        const actualSvg = fs.readFileSync(actualPath, "utf-8");
        actualSize = getSvgSize(actualSvg);
        actualCounts = extractElementCounts(actualSvg);
      }

      // Render with symbolMap to resolve instances
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

      const renderedCounts = extractElementCounts(result.svg);

      // Output comparison
      console.log(`\n=== ${layerName} ===`);
      console.log(`Size: ${actualSize.width}x${actualSize.height}`);
      if (hasActual) {
        console.log(`Rects: actual=${actualCounts.rects}, rendered=${renderedCounts.rects}`);
        console.log(`Texts: actual=${actualCounts.texts}, rendered=${renderedCounts.texts}`);
        console.log(`Groups: actual=${actualCounts.groups}, rendered=${renderedCounts.groups}`);
      } else {
        console.log(`Rendered: ${renderedCounts.rects} rects, ${renderedCounts.texts} texts, ${renderedCounts.groups} groups`);
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

describe("Component Fixture Debug", () => {
  it("lists symbols and frames in components.fig", async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping - components.fig not found");
      console.log("Run: bun packages/@oxen-renderer/figma/scripts/generate-component-fixtures.ts");
      return;
    }

    const data = await loadFigFile();

    console.log("\n=== Symbols in components.fig ===");
    for (const [name, node] of data.symbols) {
      const nodeData = node as Record<string, unknown>;
      const size = nodeData.size as { x?: number; y?: number } | undefined;
      console.log(`  "${name}" - ${size?.x ?? "?"}x${size?.y ?? "?"}`);

      // List children
      const children = node.children ?? [];
      for (const child of children) {
        const childType = getNodeType(child);
        console.log(`    - ${child.name} (${childType})`);
      }
    }

    console.log("\n=== Test Frames ===");
    for (const [name, info] of data.layers) {
      console.log(`  "${name}" - ${info.size.width}x${info.size.height}`);

      // Count instances
      const children = info.node.children ?? [];
      const instances = children.filter((c) => getNodeType(c) === "INSTANCE");
      console.log(`    Instances: ${instances.length}`);
    }

    expect(data.symbols.size).toBeGreaterThan(0);
    expect(data.layers.size).toBeGreaterThan(0);
  });

  it("inspects instance references", async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping - components.fig not found");
      return;
    }

    const data = await loadFigFile();

    console.log("\n=== Instance References ===");
    for (const [frameName, info] of data.layers) {
      const children = info.node.children ?? [];

      for (const child of children) {
        if (getNodeType(child) === "INSTANCE") {
          const childData = child as Record<string, unknown>;
          const symbolID = childData.symbolID as { sessionID?: number; localID?: number } | undefined;
          const overrides = childData.fillPaints as readonly unknown[] | undefined;

          console.log(`  ${frameName}/${child.name}:`);
          console.log(`    symbolID: ${JSON.stringify(symbolID)}`);
          if (overrides && overrides.length > 0) {
            console.log(`    has fill override: yes`);
          }
        }
      }
    }

    expect(data.layers.size).toBeGreaterThan(0);
  });
});

describe("Symbol Resolution", () => {
  it("verifies symbolMap contains all symbols", async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping - components.fig not found");
      return;
    }

    const data = await loadFigFile();

    console.log("\n=== Symbol Map ===");
    console.log(`Total nodes in map: ${data.nodeMap.size}`);

    // Find symbols in nodeMap
    let symbolCount = 0;
    for (const [key, node] of data.nodeMap) {
      const nodeType = getNodeType(node);
      if (nodeType === "SYMBOL") {
        symbolCount++;
        console.log(`  Found symbol: ${node.name} (key: ${key})`);
      }
    }

    console.log(`Total symbols found: ${symbolCount}`);
    expect(symbolCount).toBe(data.symbols.size);
  });
});
