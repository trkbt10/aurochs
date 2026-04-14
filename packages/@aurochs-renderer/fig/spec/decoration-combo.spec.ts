/**
 * @file Decoration combination rendering tests
 *
 * Tests combinations of decorative properties (gradient, corner radius,
 * effects, stroke, clipping, instance inheritance) that are individually
 * tested but never tested together.
 *
 * Generates snapshots for visual inspection and compares against
 * Figma export (actual/) when available.
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
import { hasCornerRadius, countShapeElements, getSvgSize } from "./helpers/svg-feature-detect";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/decoration-combo");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const FIG_FILE = path.join(FIXTURES_DIR, "decoration-combo.fig");

/**
 * All expected frames. Key: frame name, Value: SVG filename.
 */
const FRAME_MAP: Record<string, string> = {
  "grad-radius-linear": "grad-radius-linear.svg",
  "grad-radius-pill": "grad-radius-pill.svg",
  "grad-radius-card": "grad-radius-card.svg",
  "grad-shadow-drop": "grad-shadow-drop.svg",
  "grad-shadow-inner": "grad-shadow-inner.svg",
  "grad-multi-effect": "grad-multi-effect.svg",
  "grad-blur": "grad-blur.svg",
  "grad-stroke-radius": "grad-stroke-radius.svg",
  "solid-stroke-radius-shadow": "solid-stroke-radius-shadow.svg",
  "bool-gradient-union": "bool-gradient-union.svg",
  "bool-gradient-subtract-shadow": "bool-gradient-subtract-shadow.svg",
  "bool-rounded-operands": "bool-rounded-operands.svg",
  "instance-inherit-decoration": "instance-inherit-decoration.svg",
  "instance-gradient-override": "instance-gradient-override.svg",
  "clip-gradient-rounded": "clip-gradient-rounded.svg",
  "clip-shadow": "clip-shadow.svg",
  "realistic-card": "realistic-card.svg",
  "realistic-badge": "realistic-badge.svg",
  "realistic-avatar": "realistic-avatar.svg",
  "grad-opacity": "grad-opacity.svg",
};

// =============================================================================
// SVG Analysis
// =============================================================================

function hasGradient(svg: string): boolean {
  return svg.includes("<linearGradient") || svg.includes("<radialGradient");
}

function hasFilter(svg: string): boolean {
  return svg.includes("<filter") || svg.includes("filter=");
}

function hasClipPath(svg: string): boolean {
  return svg.includes("<clipPath") || svg.includes("clip-path=");
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
      `Run: bun packages/@aurochs-renderer/fig/scripts/generate-decoration-combo-fixtures.ts`,
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

describe("Decoration Combination Rendering", () => {
  beforeAll(async () => {
    await loadFigFile();
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
  });

  for (const [frameName, fileName] of Object.entries(FRAME_MAP)) {
    it(`renders "${frameName}"`, async () => {
      const data = await loadFigFile();
      const layer = data.layers.get(frameName);
      if (!layer) {
        console.log(
          `SKIP: Frame "${frameName}" not found. Available: ${[...data.layers.keys()].join(", ")}`,
        );
        return;
      }

      // Actual SVG from Figma export is required
      const actualPath = path.join(ACTUAL_DIR, fileName);
      expect(fs.existsSync(actualPath), `Actual SVG not found: ${actualPath}. Export from Figma first.`).toBe(true);
      const actualSvg = fs.readFileSync(actualPath, "utf-8");
      const refSize = getSvgSize(actualSvg);

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

      const shapes = countShapeElements(result.svg);
      expect(shapes.total).toBeGreaterThan(0);

      // Feature detection — log what was rendered
      const features: string[] = [];
      if (hasGradient(result.svg)) { features.push("gradient"); }
      if (hasFilter(result.svg)) { features.push("filter/effect"); }
      if (hasClipPath(result.svg)) { features.push("clip-path"); }
      if (hasCornerRadius(result.svg)) { features.push("corner-radius"); }
      if (result.svg.includes("stroke=") && !result.svg.includes('stroke="none"')) { features.push("stroke"); }

      console.log(`\n=== ${frameName} ===`);
      console.log(`  Shapes: ${shapes.total} (paths=${shapes.paths}, rects=${shapes.rects}, ellipses=${shapes.ellipses})`);
      console.log(`  Features: ${features.join(", ") || "none"}`);

      // Compare with actual
      const actualShapes = countShapeElements(actualSvg);
      const actualFeatures: string[] = [];
      if (hasGradient(actualSvg)) { actualFeatures.push("gradient"); }
      if (hasFilter(actualSvg)) { actualFeatures.push("filter/effect"); }
      if (hasClipPath(actualSvg)) { actualFeatures.push("clip-path"); }
      if (hasCornerRadius(actualSvg)) { actualFeatures.push("corner-radius"); }

      console.log(`  Actual shapes: ${actualShapes.total}`);
      console.log(`  Actual features: ${actualFeatures.join(", ")}`);

      // Rendered must include all features present in Figma export
      for (const f of actualFeatures) {
        expect(features, `Missing feature "${f}" in rendered output`).toContain(f);
      }

      if (result.warnings.length > 0) {
        console.log(`  Warnings: ${result.warnings.slice(0, 5).join("; ")}`);
      }
    });
  }
});
