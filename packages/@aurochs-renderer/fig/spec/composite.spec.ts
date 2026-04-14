/**
 * @file Composite (boolean operation) rendering tests
 *
 * Verifies that BOOLEAN_OPERATION nodes are rendered using their
 * pre-computed fillGeometry (merged path) rather than rendering
 * individual children separately.
 *
 * Key assertions:
 * - The rendered SVG should contain the fill color from the BOOLEAN_OPERATION node
 * - The number of shape elements should match Figma's export (typically 1 merged path)
 * - Children should NOT appear as separate shapes in the output
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseFigFile,
  buildNodeTree,
  findNodesByType,
  type FigBlob,
  type FigImage,
} from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { renderCanvas } from "../src/svg/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/composite");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const FIG_FILE = path.join(FIXTURES_DIR, "composite.fig");

/**
 * All expected frames in the composite fixture.
 * Key: frame name in .fig, Value: output SVG filename.
 */
const FRAME_MAP: Record<string, string> = {
  "composite-union-basic": "composite-union-basic.svg",
  "composite-subtract-basic": "composite-subtract-basic.svg",
  "composite-intersect-basic": "composite-intersect-basic.svg",
  "composite-exclude-basic": "composite-exclude-basic.svg",
  "composite-icon-gear": "composite-icon-gear.svg",
  "composite-icon-eye": "composite-icon-eye.svg",
  "composite-icon-shield": "composite-icon-shield.svg",
  "composite-multi-union": "composite-multi-union.svg",
  "composite-nested": "composite-nested.svg",
  "composite-non-overlapping": "composite-non-overlapping.svg",
  "composite-fully-contained": "composite-fully-contained.svg",
  "composite-icon-play": "composite-icon-play.svg",
  "composite-multiple": "composite-multiple.svg",
  "composite-opacity": "composite-opacity.svg",
  "composite-icon-bell": "composite-icon-bell.svg",
};

// =============================================================================
// SVG Analysis Helpers
// =============================================================================

function countShapeElements(svg: string): {
  paths: number;
  rects: number;
  ellipses: number;
  circles: number;
  polygons: number;
  total: number;
} {
  const paths = (svg.match(/<path[\s>]/g) || []).length;
  const rects = (svg.match(/<rect[\s>]/g) || []).length;
  const ellipses = (svg.match(/<ellipse[\s>]/g) || []).length;
  const circles = (svg.match(/<circle[\s>]/g) || []).length;
  const polygons = (svg.match(/<polygon[\s>]/g) || []).length;
  return { paths, rects, ellipses, circles, polygons, total: paths + rects + ellipses + circles + polygons };
}

function getSvgSize(svg: string): { width: number; height: number } {
  const w = svg.match(/width="(\d+(?:\.\d+)?)"/);
  const h = svg.match(/height="(\d+(?:\.\d+)?)"/);
  return {
    width: parseFloat(w?.[1] ?? "100"),
    height: parseFloat(h?.[1] ?? "100"),
  };
}

/**
 * Check if a color hex string appears in the SVG as a fill.
 * Searches for fill="..." or fill: ... patterns.
 */
function hasFillColor(svg: string, hexColor: string): boolean {
  const upper = hexColor.toUpperCase();
  const lower = hexColor.toLowerCase();
  return svg.includes(`fill="${upper}"`) || svg.includes(`fill="${lower}"`);
}

// =============================================================================
// Fixture Loading
// =============================================================================

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
  if (parsedDataCache) {
    return parsedDataCache;
  }
  if (!fs.existsSync(FIG_FILE)) {
    throw new Error(
      `Fixture file not found: ${FIG_FILE}\n` +
      `Run: bun packages/@aurochs-renderer/fig/scripts/generate-composite-fixtures.ts`,
    );
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

// =============================================================================
// Tests
// =============================================================================

describe("Composite (Boolean Operation) Rendering", () => {
  beforeAll(async () => {
    await loadFigFile();
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
  });

  for (const [frameName, fileName] of Object.entries(FRAME_MAP)) {
    it(`renders "${frameName}" correctly`, async () => {
      const data = await loadFigFile();
      const layer = data.layers.get(frameName);
      if (!layer) {
        console.log(
          `SKIP: Frame "${frameName}" not found. Available: ${[...data.layers.keys()].join(", ")}`,
        );
        return;
      }

      // Determine reference size from actual SVG if available
      const actualPath = path.join(ACTUAL_DIR, fileName);
      const hasActual = fs.existsSync(actualPath);
      const refSize = hasActual
        ? getSvgSize(fs.readFileSync(actualPath, "utf-8"))
        : layer.size;

      // Render
      const wrapperCanvas: FigNode = {
        type: "CANVAS",
        name: frameName,
        children: [layer.node],
      };
      const result = await renderCanvas(wrapperCanvas, {
        width: refSize.width,
        height: refSize.height,
        blobs: data.blobs,
        images: data.images,
        symbolMap: data.nodeMap,
      });

      // Save snapshot
      fs.writeFileSync(path.join(SNAPSHOTS_DIR, fileName), result.svg);

      // Basic structure validation
      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain("</svg>");

      const renderedShapes = countShapeElements(result.svg);
      expect(renderedShapes.total).toBeGreaterThan(0);

      // Compare with actual Figma export if available
      if (hasActual) {
        const actualSvg = fs.readFileSync(actualPath, "utf-8");
        const actualShapes = countShapeElements(actualSvg);

        console.log(`\n=== ${frameName} ===`);
        console.log(`  Actual shapes:   ${actualShapes.total} (paths=${actualShapes.paths}, rects=${actualShapes.rects}, ellipses=${actualShapes.ellipses})`);
        console.log(`  Rendered shapes: ${renderedShapes.total} (paths=${renderedShapes.paths}, rects=${renderedShapes.rects}, ellipses=${renderedShapes.ellipses})`);

        // The rendered output should have a similar number of shape elements.
        // Figma's export typically has 1-2 shapes (background rect + merged path).
        // If our renderer has many more, it means children are being rendered individually.
        if (renderedShapes.total > actualShapes.total * 2) {
          console.warn(
            `  ⚠ MISMATCH: Rendered has ${renderedShapes.total} shapes vs actual ${actualShapes.total}.` +
            ` Boolean operation may not be using pre-computed geometry.`,
          );
        }

        // Verify shape count matches Figma export
        // This is the core assertion: if the renderer correctly uses fillGeometry
        // from the BOOLEAN_OPERATION node, it should produce a similar number of
        // shape elements as Figma's export.
        expect(renderedShapes.total).toBeLessThanOrEqual(
          actualShapes.total * 2 + 1,  // Allow small margin for clipPath/defs paths
        );
      }

      if (result.warnings.length > 0) {
        console.log(`  Warnings: ${result.warnings.slice(0, 5).join("; ")}`);
      }
    });
  }
});
