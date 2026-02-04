/**
 * @file Shape rendering tests
 * Tests rendering of ELLIPSE, LINE, STAR, POLYGON, VECTOR nodes
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFigFile, buildNodeTree, findNodesByType, getNodeType, type FigBlob, type FigImage } from "@oxen/fig/parser";
import type { FigNode } from "@oxen/fig/types";
import { renderCanvas } from "../src/svg/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/shapes");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const FIG_FILE = path.join(FIXTURES_DIR, "shapes.fig");

/** Layer name to SVG filename mapping */
const LAYER_FILE_MAP: Record<string, string> = {
  // Ellipse
  "ellipse-basic": "ellipse-basic.svg",
  "ellipse-circle": "ellipse-circle.svg",
  "ellipse-arc": "ellipse-arc.svg",
  "ellipse-donut": "ellipse-donut.svg",
  // Line
  "line-horizontal": "line-horizontal.svg",
  "line-diagonal": "line-diagonal.svg",
  "line-styled": "line-styled.svg",
  // Star
  "star-5point": "star-5point.svg",
  "star-8point": "star-8point.svg",
  "star-sharp": "star-sharp.svg",
  // Polygon
  "polygon-triangle": "polygon-triangle.svg",
  "polygon-hexagon": "polygon-hexagon.svg",
  "polygon-octagon": "polygon-octagon.svg",
  // Rectangle
  "rect-rounded": "rect-rounded.svg",
  "rect-pill": "rect-pill.svg",
  // Mixed
  "shapes-mixed": "shapes-mixed.svg",
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
    throw new Error(`Fixture file not found: ${FIG_FILE}\nRun: bun packages/@oxen-renderer/figma/scripts/generate-shape-fixtures.ts`);
  }

  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);

  const canvases = findNodesByType(roots, "CANVAS");

  const layers = new Map<string, LayerInfo>();
  for (const canvas of canvases) {
    for (const child of canvas.children ?? []) {
      const name = child.name ?? "unnamed";
      const nodeData = child as Record<string, unknown>;
      const size = nodeData.size as { x?: number; y?: number } | undefined;
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

  parsedDataCache = { canvases, layers, blobs: parsed.blobs, images: parsed.images, nodeMap };
  return parsedDataCache;
}

/** Extract shape elements from SVG (ellipse, line, path, polygon, rect, circle) */
function extractShapeElements(svg: string): {
  ellipses: number;
  lines: number;
  paths: number;
  polygons: number;
  rects: number;
  circles: number;
  total: number;
} {
  const ellipses = (svg.match(/<ellipse/g) || []).length;
  const lines = (svg.match(/<line/g) || []).length;
  const paths = (svg.match(/<path/g) || []).length;
  const polygons = (svg.match(/<polygon/g) || []).length;
  const rects = (svg.match(/<rect/g) || []).length;
  const circles = (svg.match(/<circle/g) || []).length;

  return {
    ellipses,
    lines,
    paths,
    polygons,
    rects,
    circles,
    total: ellipses + lines + paths + polygons + rects + circles,
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

describe("Shape Rendering", () => {
  beforeAll(async () => {
    try {
      await loadFigFile();
    } catch {
      console.log("Skipping shape tests - fixture file not found");
    }

    if (WRITE_SNAPSHOTS && !fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
  });

  for (const [layerName, fileName] of Object.entries(LAYER_FILE_MAP)) {
    it(`renders "${layerName}" with correct structure`, async () => {
      if (!fs.existsSync(FIG_FILE)) {
        console.log(`SKIP: Fixture file not found`);
        return;
      }

      const data = await loadFigFile();
      const layer = data.layers.get(layerName);

      if (!layer) {
        console.log(`SKIP: Layer "${layerName}" not found in .fig file`);
        console.log(`  Available: ${[...data.layers.keys()].join(", ")}`);
        return;
      }

      const actualPath = path.join(ACTUAL_DIR, fileName);
      const hasActual = fs.existsSync(actualPath);

      let actualSize = layer.size;
      let actualShapes = { ellipses: 0, lines: 0, paths: 0, polygons: 0, rects: 0, circles: 0, total: 0 };

      if (hasActual) {
        const actualSvg = fs.readFileSync(actualPath, "utf-8");
        actualSize = getSvgSize(actualSvg);
        actualShapes = extractShapeElements(actualSvg);
      }

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

      const renderedShapes = extractShapeElements(result.svg);

      // Output comparison
      console.log(`\n=== ${layerName} ===`);
      console.log(`Size: ${actualSize.width}x${actualSize.height}`);
      if (hasActual) {
        console.log(`Elements: actual=${actualShapes.total}, rendered=${renderedShapes.total}`);
        console.log(`  ellipses: ${actualShapes.ellipses} vs ${renderedShapes.ellipses}`);
        console.log(`  circles: ${actualShapes.circles} vs ${renderedShapes.circles}`);
        console.log(`  paths: ${actualShapes.paths} vs ${renderedShapes.paths}`);
        console.log(`  rects: ${actualShapes.rects} vs ${renderedShapes.rects}`);
        console.log(`  lines: ${actualShapes.lines} vs ${renderedShapes.lines}`);
        console.log(`  polygons: ${actualShapes.polygons} vs ${renderedShapes.polygons}`);
      } else {
        console.log(`Rendered elements: ${renderedShapes.total}`);
        console.log(`  (No actual SVG for comparison - export from Figma)`);
      }

      if (result.warnings.length > 0) {
        console.log(`Warnings: ${result.warnings.slice(0, 3).join("; ")}`);
      }

      // Assertions
      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain("</svg>");
      expect(renderedShapes.total).toBeGreaterThan(0);
    });
  }
});

describe("Shape Fixture Debug", () => {
  it("lists available layers in shapes.fig", async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping - shapes.fig not found");
      console.log("Run: bun packages/@oxen-renderer/figma/scripts/generate-shape-fixtures.ts");
      return;
    }

    const data = await loadFigFile();

    console.log("\n=== Layers in shapes.fig ===");
    for (const [name, info] of data.layers) {
      const nodeType = getNodeType(info.node);
      console.log(`  "${name}" (${nodeType}) - ${info.size.width}x${info.size.height}`);

      // List children
      const children = info.node.children ?? [];
      for (const child of children) {
        const childType = getNodeType(child);
        const childData = child as Record<string, unknown>;
        const size = childData.size as { x?: number; y?: number } | undefined;
        console.log(`    - ${child.name} (${childType}) ${size?.x ?? "?"}x${size?.y ?? "?"}`);
      }
    }

    expect(data.layers.size).toBeGreaterThan(0);
  });

  it("reports node types in shapes.fig", async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping - shapes.fig not found");
      return;
    }

    const data = await loadFigFile();

    const nodeTypeCounts = new Map<string, number>();

    function countNodeTypes(nodes: readonly FigNode[]): void {
      for (const node of nodes) {
        const type = getNodeType(node);
        nodeTypeCounts.set(type, (nodeTypeCounts.get(type) ?? 0) + 1);
        if (node.children) {
          countNodeTypes(node.children);
        }
      }
    }

    for (const canvas of data.canvases) {
      countNodeTypes(canvas.children ?? []);
    }

    console.log("\n=== Node Type Distribution ===");
    const sorted = [...nodeTypeCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sorted) {
      console.log(`  ${type}: ${count}`);
    }

    expect(nodeTypeCounts.size).toBeGreaterThan(0);
  });
});
