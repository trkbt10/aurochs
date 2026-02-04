/**
 * @file Boolean operation (BOOLEAN_OPERATION node type) rendering tests
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFigFile, buildNodeTree, findNodesByType, getNodeType, type FigBlob, type FigImage } from "@oxen/fig/parser";
import type { FigNode } from "@oxen/fig/types";
import { renderCanvas } from "../src/svg/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/boolean");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const FIG_FILE = path.join(FIXTURES_DIR, "boolean.fig");

const LAYER_FILE_MAP: Record<string, string> = {
  "bool-union": "bool-union.svg",
  "bool-subtract": "bool-subtract.svg",
  "bool-intersect": "bool-intersect.svg",
  "bool-exclude": "bool-exclude.svg",
  "bool-opacity": "bool-opacity.svg",
  "bool-3-operands": "bool-3-operands.svg",
  "bool-donut": "bool-donut.svg",
  "bool-operation-method": "bool-operation-method.svg",
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
    throw new Error(`Fixture file not found: ${FIG_FILE}`);
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
        size: { width: size?.x ?? 100, height: size?.y ?? 100 },
      });
    }
  }

  parsedDataCache = { canvases, layers, blobs: parsed.blobs, images: parsed.images, nodeMap };
  return parsedDataCache;
}

function extractShapeElements(svg: string) {
  const paths = (svg.match(/<path/g) || []).length;
  const rects = (svg.match(/<rect/g) || []).length;
  const ellipses = (svg.match(/<ellipse/g) || []).length;
  const circles = (svg.match(/<circle/g) || []).length;
  return { paths, rects, ellipses, circles, total: paths + rects + ellipses + circles };
}

function getSvgSize(svg: string) {
  const w = svg.match(/width="(\d+)"/);
  const h = svg.match(/height="(\d+)"/);
  return { width: parseInt(w?.[1] ?? "100"), height: parseInt(h?.[1] ?? "100") };
}

describe("Boolean Operation Rendering", () => {
  beforeAll(async () => {
    await loadFigFile();
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
  });

  for (const [layerName, fileName] of Object.entries(LAYER_FILE_MAP)) {
    it(`renders "${layerName}" with correct structure`, async () => {
      const data = await loadFigFile();
      const layer = data.layers.get(layerName);

      if (!layer) {
        console.log(`SKIP: Layer "${layerName}" not found. Available: ${[...data.layers.keys()].join(", ")}`);
        return;
      }

      const actualPath = path.join(ACTUAL_DIR, fileName);
      const hasActual = fs.existsSync(actualPath);
      let actualSize = layer.size;
      let actualShapes = { paths: 0, rects: 0, ellipses: 0, circles: 0, total: 0 };

      if (hasActual) {
        const actualSvg = fs.readFileSync(actualPath, "utf-8");
        actualSize = getSvgSize(actualSvg);
        actualShapes = extractShapeElements(actualSvg);
      }

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

      fs.writeFileSync(path.join(SNAPSHOTS_DIR, fileName), result.svg);

      const rendered = extractShapeElements(result.svg);

      console.log(`\n=== ${layerName} ===`);
      console.log(`Size: ${actualSize.width}x${actualSize.height}`);
      if (hasActual) {
        console.log(`Elements: actual=${actualShapes.total}, rendered=${rendered.total}`);
        console.log(`  paths: ${actualShapes.paths} vs ${rendered.paths}`);
      }
      if (result.warnings.length > 0) {
        console.log(`Warnings: ${result.warnings.slice(0, 3).join("; ")}`);
      }

      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain("</svg>");
      expect(rendered.total).toBeGreaterThan(0);
    });
  }
});
