/**
 * @file Vector winding rule and ellipse arc rendering tests
 *
 * Verifies:
 * - evenodd fill-rule on donut shapes (inner hole must be transparent)
 * - Arc (partial circle) rendering from arcData
 * - Stroke-only arcs (progress ring pattern)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFigFile, buildNodeTree, findNodesByType, type FigBlob, type FigImage } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { renderCanvas } from "../src/svg/renderer";
import { detectFeatures, countShapeElements, getSvgSize } from "./helpers/svg-feature-detect";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/vector-winding");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const FIG_FILE = path.join(FIXTURES_DIR, "vector-winding.fig");

const FRAME_MAP: Record<string, string> = {
  "winding-evenodd-donut": "winding-evenodd-donut.svg",
  "winding-evenodd-ring": "winding-evenodd-ring.svg",
  "winding-donut-stroke": "winding-donut-stroke.svg",
  "winding-arc-semi": "winding-arc-semi.svg",
  "winding-arc-donut": "winding-arc-donut.svg",
  "winding-stroke-arc": "winding-stroke-arc.svg",
};

type LayerInfo = { name: string; node: FigNode; size: { width: number; height: number } };
type ParsedData = { layers: Map<string, LayerInfo>; blobs: readonly FigBlob[]; images: ReadonlyMap<string, FigImage>; nodeMap: ReadonlyMap<string, FigNode> };

let parsedDataCache: ParsedData | null = null;

async function loadFigFile(): Promise<ParsedData> {
  if (parsedDataCache) { return parsedDataCache; }
  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);
  const layers = new Map<string, LayerInfo>();
  for (const canvas of findNodesByType(roots, "CANVAS")) {
    for (const child of canvas.children ?? []) {
      const name = child.name ?? "unnamed";
      const size = (child as Record<string, unknown>).size as { x?: number; y?: number } | undefined;
      layers.set(name, { name, node: child, size: { width: size?.x ?? 100, height: size?.y ?? 100 } });
    }
  }
  parsedDataCache = { layers, blobs: parsed.blobs, images: parsed.images, nodeMap };
  return parsedDataCache;
}

describe("Vector Winding Rule & Ellipse Arc", () => {
  beforeAll(async () => {
    expect(fs.existsSync(FIG_FILE), `Fixture not found: ${FIG_FILE}`).toBe(true);
    await loadFigFile();
    if (!fs.existsSync(SNAPSHOTS_DIR)) { fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true }); }
  });

  for (const [frameName, fileName] of Object.entries(FRAME_MAP)) {
    it(`renders "${frameName}"`, async () => {
      const data = await loadFigFile();
      const layer = data.layers.get(frameName);
      expect(layer, `Frame "${frameName}" not found`).toBeDefined();
      if (!layer) { return; }

      const actualPath = path.join(ACTUAL_DIR, fileName);
      expect(fs.existsSync(actualPath), `Actual SVG not found: ${actualPath}`).toBe(true);
      const actualSvg = fs.readFileSync(actualPath, "utf-8");
      const refSize = getSvgSize(actualSvg);

      const result = await renderCanvas(
        { type: "CANVAS", name: frameName, children: [layer.node] } as FigNode,
        { width: refSize.width, height: refSize.height, blobs: data.blobs, images: data.images, symbolMap: data.nodeMap },
      );
      fs.writeFileSync(path.join(SNAPSHOTS_DIR, fileName), result.svg);

      expect(result.svg).toContain("<svg");
      expect(countShapeElements(result.svg).total).toBeGreaterThan(0);

      const actualFeatures = detectFeatures(actualSvg);
      const renderedFeatures = detectFeatures(result.svg);
      console.log(`\n=== ${frameName} ===`);
      console.log(`  Actual:   ${actualFeatures.join(", ")}`);
      console.log(`  Rendered: ${renderedFeatures.join(", ")}`);

      for (const f of actualFeatures) {
        expect(renderedFeatures, `Feature "${f}" missing`).toContain(f);
      }
    });
  }
});
