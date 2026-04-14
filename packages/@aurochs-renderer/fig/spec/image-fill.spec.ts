/**
 * @file IMAGE fill rendering tests
 *
 * Tests image fill paint on various shape types,
 * with effects, corner radius, and multi-fill layers.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { detectFeatures, countShapeElements, getSvgSize } from "./helpers/svg-feature-detect";
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
const FIXTURES_DIR = path.join(__dirname, "../fixtures/image-fill");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const FIG_FILE = path.join(FIXTURES_DIR, "image-fill.fig");

const FRAME_MAP: Record<string, string> = {
  "image-fill-basic": "image-fill-basic.svg",
  "image-fill-shadow": "image-fill-shadow.svg",
  "image-fill-circle": "image-fill-circle.svg",
  "image-fill-multi": "image-fill-multi.svg",
};


type LayerInfo = { name: string; node: FigNode; size: { width: number; height: number } };
type ParsedData = {
  layers: Map<string, LayerInfo>;
  blobs: readonly FigBlob[];
  images: ReadonlyMap<string, FigImage>;
  nodeMap: ReadonlyMap<string, FigNode>;
};

let parsedDataCache: ParsedData | null = null;

async function loadFigFile(): Promise<ParsedData> {
  if (parsedDataCache) { return parsedDataCache; }
  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);
  const canvases = findNodesByType(roots, "CANVAS");
  const layers = new Map<string, LayerInfo>();
  for (const canvas of canvases) {
    for (const child of canvas.children ?? []) {
      const name = child.name ?? "unnamed";
      const size = (child as Record<string, unknown>).size as { x?: number; y?: number } | undefined;
      layers.set(name, { name, node: child, size: { width: size?.x ?? 100, height: size?.y ?? 100 } });
    }
  }
  parsedDataCache = { layers, blobs: parsed.blobs, images: parsed.images, nodeMap };
  return parsedDataCache;
}

describe("Image Fill Rendering", () => {
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
      expect(fs.existsSync(actualPath), `Actual SVG not found: ${actualPath}. Export from Figma first.`).toBe(true);
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
      console.log(`  Actual features:   ${actualFeatures.join(", ")}`);
      console.log(`  Rendered features: ${renderedFeatures.join(", ")}`);

      for (const f of actualFeatures) {
        expect(renderedFeatures, `Feature "${f}" missing in rendered output`).toContain(f);
      }
    });
  }
});
