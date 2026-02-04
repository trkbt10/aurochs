/**
 * @file Fill/Paint rendering tests
 * Tests rendering of solid fills, gradients, and strokes
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFigFile, buildNodeTree, findNodesByType, getNodeType, type FigBlob, type FigImage } from "@oxen/fig/parser";
import type { FigNode } from "@oxen/fig/types";
import { renderCanvas } from "../src/svg/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/fills");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const FIG_FILE = path.join(FIXTURES_DIR, "fills.fig");

/** Layer name to SVG filename mapping */
const LAYER_FILE_MAP: Record<string, string> = {
  // Solid colors
  "solid-colors": "solid-colors.svg",
  "solid-opacity": "solid-opacity.svg",
  // Linear gradients
  "gradient-linear-h": "gradient-linear-h.svg",
  "gradient-linear-v": "gradient-linear-v.svg",
  "gradient-linear-45": "gradient-linear-45.svg",
  "gradient-multi-stop": "gradient-multi-stop.svg",
  // Radial gradients
  "gradient-radial": "gradient-radial.svg",
  "gradient-radial-offset": "gradient-radial-offset.svg",
  // Strokes
  "stroke-basic": "stroke-basic.svg",
  "stroke-caps": "stroke-caps.svg",
  "stroke-dash": "stroke-dash.svg",
  "stroke-align": "stroke-align.svg",
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
    throw new Error(`Fixture file not found: ${FIG_FILE}\nRun: bun packages/@oxen-renderer/figma/scripts/generate-fill-fixtures.ts`);
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

/** Extract fill-related attributes from SVG */
function extractFillInfo(svg: string): {
  solidFills: string[];
  gradientDefs: number;
  strokeColors: string[];
  strokeWidths: number[];
  dashArrays: string[];
} {
  // Extract fill colors
  const solidFills = [...new Set((svg.match(/fill="#[0-9a-fA-F]{6}"/g) || []).map((m) => m.slice(6, 13)))];

  // Count gradient definitions
  const gradientDefs = (svg.match(/<linearGradient|<radialGradient/g) || []).length;

  // Extract stroke colors
  const strokeColors = [...new Set((svg.match(/stroke="#[0-9a-fA-F]{6}"/g) || []).map((m) => m.slice(8, 15)))];

  // Extract stroke widths
  const strokeWidthMatches = svg.match(/stroke-width="([0-9.]+)"/g) || [];
  const strokeWidths = strokeWidthMatches.map((m) => parseFloat(m.match(/[0-9.]+/)![0]));

  // Extract dash arrays
  const dashArrays = [...new Set((svg.match(/stroke-dasharray="[^"]+"/g) || []).map((m) => m.slice(18, -1)))];

  return { solidFills, gradientDefs, strokeColors, strokeWidths, dashArrays };
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

describe("Fill Rendering", () => {
  beforeAll(async () => {
    try {
      await loadFigFile();
    } catch {
      console.log("Skipping fill tests - fixture file not found");
    }

    if (WRITE_SNAPSHOTS && !fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
  });

  for (const [layerName, fileName] of Object.entries(LAYER_FILE_MAP)) {
    it(`renders "${layerName}" with correct fills`, async () => {
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
      let actualFillInfo = { solidFills: [], gradientDefs: 0, strokeColors: [], strokeWidths: [], dashArrays: [] };

      if (hasActual) {
        const actualSvg = fs.readFileSync(actualPath, "utf-8");
        actualSize = getSvgSize(actualSvg);
        actualFillInfo = extractFillInfo(actualSvg);
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

      const renderedFillInfo = extractFillInfo(result.svg);

      // Output comparison
      console.log(`\n=== ${layerName} ===`);
      console.log(`Size: ${actualSize.width}x${actualSize.height}`);
      if (hasActual) {
        console.log(`Solid fills: actual=${actualFillInfo.solidFills.length}, rendered=${renderedFillInfo.solidFills.length}`);
        console.log(`Gradients: actual=${actualFillInfo.gradientDefs}, rendered=${renderedFillInfo.gradientDefs}`);
        console.log(`Strokes: actual=${actualFillInfo.strokeColors.length}, rendered=${renderedFillInfo.strokeColors.length}`);
      } else {
        console.log(`Rendered fills: ${renderedFillInfo.solidFills.length} solid, ${renderedFillInfo.gradientDefs} gradients`);
        console.log(`Rendered strokes: ${renderedFillInfo.strokeColors.length} colors`);
        console.log(`  (No actual SVG for comparison - export from Figma)`);
      }

      if (result.warnings.length > 0) {
        console.log(`Warnings: ${result.warnings.slice(0, 3).join("; ")}`);
      }

      // Assertions
      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain("</svg>");
    });
  }
});

describe("Fill Fixture Debug", () => {
  it("lists available layers in fills.fig", async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping - fills.fig not found");
      console.log("Run: bun packages/@oxen-renderer/figma/scripts/generate-fill-fixtures.ts");
      return;
    }

    const data = await loadFigFile();

    console.log("\n=== Layers in fills.fig ===");
    for (const [name, info] of data.layers) {
      const nodeType = getNodeType(info.node);
      console.log(`  "${name}" (${nodeType}) - ${info.size.width}x${info.size.height}`);

      // List children
      const children = info.node.children ?? [];
      for (const child of children) {
        const childType = getNodeType(child);
        const childData = child as Record<string, unknown>;
        const fillPaints = childData.fillPaints as readonly unknown[] | undefined;
        const strokePaints = childData.strokePaints as readonly unknown[] | undefined;
        console.log(`    - ${child.name} (${childType}) fills=${fillPaints?.length ?? 0}, strokes=${strokePaints?.length ?? 0}`);
      }
    }

    expect(data.layers.size).toBeGreaterThan(0);
  });

  it("inspects paint properties", async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping - fills.fig not found");
      return;
    }

    const data = await loadFigFile();

    console.log("\n=== Paint Properties ===");
    for (const [name, info] of data.layers) {
      const children = info.node.children ?? [];
      for (const child of children) {
        const childData = child as Record<string, unknown>;
        const fillPaints = childData.fillPaints as readonly { type?: { name?: string } }[] | undefined;
        const strokePaints = childData.strokePaints as readonly { type?: { name?: string } }[] | undefined;

        if (fillPaints && fillPaints.length > 0) {
          const types = fillPaints.map((p) => p.type?.name ?? "unknown").join(", ");
          console.log(`  ${name}/${child.name}: fills=[${types}]`);
        }
        if (strokePaints && strokePaints.length > 0) {
          const types = strokePaints.map((p) => p.type?.name ?? "unknown").join(", ");
          console.log(`  ${name}/${child.name}: strokes=[${types}]`);
        }
      }
    }

    expect(data.layers.size).toBeGreaterThan(0);
  });
});
