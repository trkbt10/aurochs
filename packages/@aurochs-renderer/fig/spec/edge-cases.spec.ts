/**
 * @file Edge-cases fixture pixel-parity regression lock.
 *
 * Locks the per-frame pixel-diff `%` of `fixtures/edge-cases/edge-cases.fig`
 * against `actual/*.svg`. The /loop session driving this fixture toward
 * 0.0% has reduced these numbers over many iterations; the spec freezes
 * each frame at its current achieved baseline (or strictly below) so a
 * regression in any orthogonal change is caught immediately.
 *
 * The pixel comparison is the same SoT used by `scripts/diagnose-edge-cases.ts`
 * (via `scripts/frame-pixel-diff.ts`), so the diff `%` printed by the
 * CLI and asserted here are byte-for-byte identical.
 *
 * Adjusting a baseline DOWN (e.g. when an unrelated improvement reduces
 * a frame's residual diff) is correct. Adjusting UP requires
 * justification — typically only when a fixture/tool regresses for a
 * reason traced and documented in WORK_HISTORY.md.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll } from "vitest";
import { parseFigFile, buildNodeTree, findNodesByType } from "@aurochs/fig/parser";
import type { FigNode, FigBlob, FigImage } from "@aurochs/fig/types";
import { createFigResolver } from "../src/symbols/fig-resolver";
import { createNodeFontLoaderWithFontsource } from "../src/font-drivers/node";
import { createCachingFontLoader } from "../src/font";
import { diffFigFrame, type FigRenderContext } from "../scripts/frame-pixel-diff";
import { diffFigPart } from "../scripts/frame-part-pixel-diff";
import { collectNamedHits } from "../scripts/part-tree-walker";
import { pickPartCandidate } from "../scripts/part-candidate-picker";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/edge-cases");
const FIG_FILE = path.join(FIXTURES_DIR, "edge-cases.fig");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const ACTIVITY_PARTS_DIR = path.join(ACTUAL_DIR, "ActivityView_parts");

/**
 * Per-frame baseline diff `%` ceiling. Each value is the highest
 * acceptable diff% for that frame; a result above this fails the spec.
 *
 * Currently locked from the /loop run that drove these to ≤0.10%:
 *
 *   Model              0.00%
 *   Activity View      0.01%
 *   Device 2 × 2       0.00%
 *   Device 2 × 4       0.00%
 *   Flighty 4 × 4      0.10%
 *
 * The ceiling is set 0.05–0.10 above the achieved value to absorb
 * sub-pixel jitter from font-system / resvg-version drift on CI runners
 * while still catching real regressions (e.g. a 0.00% → 0.5% jump).
 */
const FRAME_DIFF_CEILINGS: Record<string, number> = {
  Model: 0.05,
  "Activity View": 0.10,
  "Device 2 × 2": 0.05,
  "Device 2 × 4": 0.05,
  "Flighty 4 × 4": 0.20,
};

type LoadedFig = {
  readonly framesByName: ReadonlyMap<string, FigNode>;
  readonly activityViewNode: FigNode;
  readonly resolver: ReturnType<typeof createFigResolver>;
  readonly ctx: FigRenderContext;
};

let loaded: LoadedFig | undefined;

beforeAll(async () => {
  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);

  const fontLoader = createCachingFontLoader(createNodeFontLoaderWithFontsource());
  const resolver = createFigResolver(nodeMap);

  const byName = new Map<string, FigNode>();
  for (const canvas of findNodesByType(roots, "CANVAS")) {
    if (canvas.name !== "Page 1") {
      continue;
    }
    for (const child of canvas.children ?? []) {
      if (child && child.name) {
        byName.set(child.name, child);
      }
    }
  }
  const activityView = byName.get("Activity View");
  if (!activityView) {
    throw new Error("Activity View not found on Page 1");
  }

  loaded = {
    framesByName: byName,
    activityViewNode: activityView,
    resolver,
    ctx: {
      blobs: parsed.blobs as readonly FigBlob[],
      images: parsed.images as ReadonlyMap<string, FigImage>,
      symbolMap: nodeMap,
      fontLoader,
    },
  };
}, 60_000);

describe("edge-cases.fig pixel parity", () => {
  for (const [frameName, ceiling] of Object.entries(FRAME_DIFF_CEILINGS)) {
    it(`${frameName} renders within ${ceiling.toFixed(2)}% of Figma export`, async () => {
      if (!loaded) {
        throw new Error("fixture not loaded — beforeAll did not complete");
      }
      const frame = loaded.framesByName.get(frameName);
      if (!frame) {
        throw new Error(`frame "${frameName}" not found on Page 1 of edge-cases.fig`);
      }
      const actualSvgRaw = fs.readFileSync(path.join(ACTUAL_DIR, `${frameName}.svg`), "utf-8");
      const result = await diffFigFrame(frame, actualSvgRaw, loaded.ctx);
      expect(result.diff.diffPct).toBeLessThanOrEqual(ceiling);
    }, 60_000);
  }
});

/**
 * Per-Activity-View-part baseline diff `%` ceiling. Part exports come
 * from `actual/ActivityView_parts/*.svg`. Names follow the export
 * filename without `.svg`. Ceilings reflect the achieved baseline:
 *
 *   Thumbnail        0.25%  (subpixel font/icon residual at AA floor)
 *   Toolbar - Top    0.12%  (RESOLVE_VARIANT not yet evaluated)
 *   all others       0.00%
 *
 * The 0.05–0.10 cushion above the achieved value absorbs sub-pixel
 * jitter on CI runners while still catching real regressions.
 */
const ACTIVITY_PART_DIFF_CEILINGS: Record<string, number> = {
  "Action 1": 0.05,
  "Action 2": 0.05,
  "Action 2-1": 0.05,
  "Action 3": 0.05,
  "Action 3-1": 0.05,
  "Action 4": 0.05,
  "Action 4-1": 0.05,
  "Action 5": 0.05,
  "App 1": 0.05,
  Bezel: 0.05,
  "Close Button": 0.05,
  Contact: 0.05,
  "Contact-1": 0.05,
  "Contact-2": 0.05,
  "Contact-3": 0.05,
  "Contact-4": 0.05,
  "Home Indicator": 0.05,
  Middle: 0.05,
  "Overlay - Alerts": 0.05,
  "Status bar": 0.05,
  Thumbnail: 0.35,
  "Toolbar - Top": 0.20,
};

describe("edge-cases.fig Activity View parts pixel parity", () => {
  for (const [partFile, ceiling] of Object.entries(ACTIVITY_PART_DIFF_CEILINGS)) {
    it(`${partFile} part renders within ${ceiling.toFixed(2)}% of Figma export`, async () => {
      if (!loaded) {
        throw new Error("fixture not loaded — beforeAll did not complete");
      }
      // Resolve the part's tree node via the same name → root → suffix
      // → candidate-pick pipeline as `diagnose-activity-parts.ts`.
      const m = partFile.match(/^(.*?)(?:-(\d+))?$/);
      const rootName = m?.[1] ?? partFile;
      const suffixIndex = m?.[2] ? Number(m[2]) : 0;
      const hasExplicitSuffix = !!m?.[2];
      const neededNames = new Set([rootName]);
      const hits = collectNamedHits(loaded.activityViewNode, neededNames, loaded.resolver);
      const candidates = hits.filter((h) => h.name === rootName);
      if (candidates.length === 0) {
        throw new Error(`part "${partFile}" (root "${rootName}") not found in Activity View tree`);
      }
      const actualSvgRaw = fs.readFileSync(path.join(ACTIVITY_PARTS_DIR, `${partFile}.svg`), "utf-8");
      const hit = pickPartCandidate(candidates, actualSvgRaw, suffixIndex, hasExplicitSuffix);
      const result = await diffFigPart(hit.node, actualSvgRaw, loaded.ctx);
      expect(result.diff.diffPct).toBeLessThanOrEqual(ceiling);
    }, 60_000);
  }
});
