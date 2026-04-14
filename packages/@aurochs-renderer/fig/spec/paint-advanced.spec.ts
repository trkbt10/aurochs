/**
 * @file Advanced paint rendering tests
 *
 * Tests paint features not covered by existing fixtures:
 * - Angular (conic) gradient
 * - Diamond gradient
 * - Multiple fill layers (stacked paints)
 * - MASK layers
 * - Combinations of the above with effects
 *
 * Compares renderer output against Figma SVG exports.
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
import { detectFeatures, countShapeElements, getSvgSize } from "./helpers/svg-feature-detect";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/paint-advanced");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const FIG_FILE = path.join(FIXTURES_DIR, "paint-advanced.fig");

const FRAME_MAP: Record<string, string> = {
  "angular-gradient-basic": "angular-gradient-basic.svg",
  "angular-gradient-rect": "angular-gradient-rect.svg",
  "diamond-gradient": "diamond-gradient.svg",
  "multi-fill-solid": "multi-fill-solid.svg",
  "multi-fill-gradient": "multi-fill-gradient.svg",
  "mask-basic": "mask-basic.svg",
  "mask-rounded": "mask-rounded.svg",
  "angular-gradient-effect": "angular-gradient-effect.svg",
};

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
      const nodeData = child as Record<string, unknown>;
      const size = nodeData.size as { x?: number; y?: number } | undefined;
      layers.set(name, {
        name,
        node: child,
        size: { width: size?.x ?? 100, height: size?.y ?? 100 },
      });
    }
  }
  parsedDataCache = { layers, blobs: parsed.blobs, images: parsed.images, nodeMap };
  return parsedDataCache;
}

// =============================================================================
// Tests
// =============================================================================

describe("Advanced Paint Rendering", () => {
  beforeAll(async () => {
    expect(fs.existsSync(FIG_FILE), `Fixture not found: ${FIG_FILE}`).toBe(true);
    await loadFigFile();
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
  });

  for (const [frameName, fileName] of Object.entries(FRAME_MAP)) {
    it(`renders "${frameName}"`, async () => {
      const data = await loadFigFile();
      const layer = data.layers.get(frameName);
      expect(layer, `Frame "${frameName}" not found in fixture`).toBeDefined();
      if (!layer) { return; }

      // Actual SVG from Figma export is required
      const actualPath = path.join(ACTUAL_DIR, fileName);
      expect(
        fs.existsSync(actualPath),
        `Actual SVG not found: ${actualPath}. Export from Figma first.`,
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
      fs.writeFileSync(path.join(SNAPSHOTS_DIR, fileName), result.svg);

      // Basic validity
      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain("</svg>");
      expect(countShapeElements(result.svg).total).toBeGreaterThan(0);

      // Feature comparison
      const actualFeatures = detectFeatures(actualSvg);
      const renderedFeatures = detectFeatures(result.svg);

      console.log(`\n=== ${frameName} ===`);
      console.log(`  Actual features:   ${actualFeatures.join(", ") || "none"}`);
      console.log(`  Rendered features: ${renderedFeatures.join(", ") || "none"}`);
      console.log(`  Actual shapes:   ${countShapeElements(actualSvg).total}`);
      console.log(`  Rendered shapes: ${countShapeElements(result.svg).total}`);

      // Every feature in Figma export must be in rendered output
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
