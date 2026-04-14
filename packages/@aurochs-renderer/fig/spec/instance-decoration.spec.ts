/**
 * @file Instance decoration inheritance tests
 *
 * Uses the real symbol-resolution.fig fixture (created in Figma, not builder)
 * to verify that INSTANCE nodes correctly inherit decorative properties
 * from their SYMBOLs: corner radius, fills (gradient/image), effects,
 * strokes, clipping, and opacity.
 *
 * Each test renders a specific frame containing instances, saves a snapshot,
 * and compares against the Figma SVG export to verify feature parity.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseFigFile,
  buildNodeTree,
  findNodesByType,
  getNodeType,
  type FigBlob,
  type FigImage,
} from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { renderCanvas } from "../src/svg/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/symbol-resolution");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const FIG_FILE = path.join(FIXTURES_DIR, "symbol-resolution.fig");

// =============================================================================
// Test frames focused on decoration inheritance
// =============================================================================

type TestCase = {
  /** Human-readable description of what's being tested */
  readonly description: string;
  /** Expected SVG features in the Figma export */
  readonly expectedFeatures: readonly string[];
};

/**
 * Subset of symbol-resolution frames that exercise decoration inheritance.
 * Only frames where corner radius, effects, fills, or clipping are
 * inherited across instance boundaries.
 */
const DECORATION_FRAMES: Record<string, TestCase> = {
  "button-inherit": {
    description: "Instance inherits blue fill + 12px corner radius from ButtonBase",
    expectedFeatures: ["corner-radius"],
  },
  "button-override": {
    description: "Instance overrides fill color (blue → green) while keeping radius",
    expectedFeatures: ["corner-radius"],
  },
  "avatar-clip": {
    description: "Fully rounded clip (32px radius) on instance with overflow content",
    expectedFeatures: ["corner-radius", "clip-path"],
  },
  "avatar-small": {
    description: "Smaller avatar instance — rounded clip must scale correctly",
    expectedFeatures: ["corner-radius", "clip-path"],
  },
  "rounded-container-clip": {
    description: "Rounded frame (16px radius) clipping children via instance",
    expectedFeatures: ["corner-radius", "clip-path"],
  },
  "mixed-clip-corners": {
    description: "Corner rects clipped by 24px rounded frame instance",
    expectedFeatures: ["corner-radius", "clip-path"],
  },
  "nested-rounded-clip": {
    description: "2-level rounded clip chain (20px > 16px radius) through instances",
    expectedFeatures: ["corner-radius", "clip-path"],
  },
  "clip-chain-3level": {
    description: "3-level nested clip (12px > 20px > 16px) through instances",
    expectedFeatures: ["corner-radius", "clip-path"],
  },
  "effect-inherit": {
    description: "Drop shadow on child inherited across instance boundary",
    expectedFeatures: ["filter/effect", "corner-radius"],
  },
  "opacity-chain": {
    description: "Opacity (1.0 vs 0.5) inherited through nested instances",
    expectedFeatures: [],
  },
  "card-with-header": {
    description: "3-level card: Card > Header/Body > content, corner radius on frame",
    expectedFeatures: ["corner-radius", "clip-path"],
  },
  "avatar-row": {
    description: "3 avatar instances in a row — all should be rounded-clipped",
    expectedFeatures: ["corner-radius", "clip-path"],
  },
};

// =============================================================================
// SVG Feature Detection
// =============================================================================

function detectFeatures(svg: string): string[] {
  const features: string[] = [];
  if (svg.includes("<linearGradient") || svg.includes("<radialGradient")) {
    features.push("gradient");
  }
  if (svg.includes("<filter") || svg.includes("filter=")) {
    features.push("filter/effect");
  }
  if (svg.includes("<clipPath") || svg.includes("clip-path=")) {
    features.push("clip-path");
  }
  if (hasCornerRadius(svg)) {
    features.push("corner-radius");
  }
  if (svg.includes("stroke=") && !svg.includes('stroke="none"')) {
    features.push("stroke");
  }
  return features;
}

function hasCornerRadius(svg: string): boolean {
  if (svg.includes("rx=")) {
    return true;
  }
  // Rounded rect rendered as path: has both L (straight) and C (curve) commands
  const pathDMatches = svg.match(/d="([^"]+)"/g);
  if (pathDMatches) {
    for (const match of pathDMatches) {
      const d = match.slice(3, -1);
      if (d.includes("L") && d.includes("C")) {
        return true;
      }
    }
  }
  return false;
}

function countShapeElements(svg: string): number {
  const paths = (svg.match(/<path[\s>]/g) || []).length;
  const rects = (svg.match(/<rect[\s>]/g) || []).length;
  const ellipses = (svg.match(/<ellipse[\s>]/g) || []).length;
  const circles = (svg.match(/<circle[\s>]/g) || []).length;
  return paths + rects + ellipses + circles;
}

function getSvgSize(svg: string): { width: number; height: number } {
  const w = svg.match(/width="(\d+(?:\.\d+)?)"/);
  const h = svg.match(/height="(\d+(?:\.\d+)?)"/);
  return {
    width: parseFloat(w?.[1] ?? "100"),
    height: parseFloat(h?.[1] ?? "100"),
  };
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

  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);
  const canvases = findNodesByType(roots, "CANVAS");

  const layers = new Map<string, LayerInfo>();
  for (const canvas of canvases) {
    for (const child of canvas.children ?? []) {
      const name = child.name ?? "unnamed";
      const nodeType = getNodeType(child);
      if (nodeType === "FRAME") {
        const size = child.size;
        layers.set(name, {
          name,
          node: child,
          size: { width: size?.x ?? 100, height: size?.y ?? 100 },
        });
      }
    }
  }

  parsedDataCache = { layers, blobs: parsed.blobs, images: parsed.images, nodeMap };
  return parsedDataCache;
}

// =============================================================================
// Tests
// =============================================================================

describe("Instance Decoration Inheritance", () => {
  beforeAll(async () => {
    expect(fs.existsSync(FIG_FILE), `Fixture not found: ${FIG_FILE}`).toBe(true);
    await loadFigFile();
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
  });

  for (const [frameName, testCase] of Object.entries(DECORATION_FRAMES)) {
    it(`${frameName}: ${testCase.description}`, async () => {
      const data = await loadFigFile();
      const layer = data.layers.get(frameName);
      expect(layer, `Frame "${frameName}" not found in fixture`).toBeDefined();
      if (!layer) { return; }

      // Actual SVG from Figma export is required
      const actualPath = path.join(ACTUAL_DIR, `${frameName}.svg`);
      expect(
        fs.existsSync(actualPath),
        `Actual SVG not found: ${actualPath}`,
      ).toBe(true);
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
      fs.writeFileSync(path.join(SNAPSHOTS_DIR, `${frameName}.svg`), result.svg);

      // Basic validity
      expect(result.svg).toContain("<svg");
      expect(countShapeElements(result.svg)).toBeGreaterThan(0);

      // Feature comparison
      const actualFeatures = detectFeatures(actualSvg);
      const renderedFeatures = detectFeatures(result.svg);

      console.log(`\n=== ${frameName} ===`);
      console.log(`  Actual features:   ${actualFeatures.join(", ") || "none"}`);
      console.log(`  Rendered features: ${renderedFeatures.join(", ") || "none"}`);
      console.log(`  Actual shapes:   ${countShapeElements(actualSvg)}`);
      console.log(`  Rendered shapes: ${countShapeElements(result.svg)}`);

      // Every feature present in the Figma export must be present in the render
      for (const f of actualFeatures) {
        expect(
          renderedFeatures,
          `Feature "${f}" present in Figma export but missing in rendered output`,
        ).toContain(f);
      }

      if (result.warnings.length > 0) {
        console.log(`  Warnings: ${result.warnings.slice(0, 5).join("; ")}`);
      }
    });
  }
});
