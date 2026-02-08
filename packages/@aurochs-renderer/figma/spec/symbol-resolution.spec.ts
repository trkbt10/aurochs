/**
 * @file Symbol/Instance resolution tests
 *
 * Realistic multi-canvas tests that validate symbol (component) resolution
 * through deep nesting, frame-level rounding/clipping, property inheritance,
 * and real-world UI component patterns.
 *
 * Compares renderer output against Figma SVG exports using pixel-based
 * image comparison (pixelmatch + resvg-js).
 *
 * Canvas 1: "Components" — UI component patterns (buttons, cards, nav bars)
 * Canvas 2: "Clipping"   — Frame-level rounding and clip behavior
 * Canvas 3: "Deep Nesting" — 5-level nesting and inheritance chains
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
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
import { preResolveSymbols } from "../src/symbols/symbol-pre-resolver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures/symbol-resolution");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const OUTPUT_DIR = path.join(FIXTURES_DIR, "__output__");
const DIFF_DIR = path.join(FIXTURES_DIR, "__diff__");
const FIG_FILE = path.join(FIXTURES_DIR, "symbol-resolution.fig");

// ============================================================================
// Test frame definitions per canvas
// ============================================================================

type FrameMeta = {
  description: string;
  canvas: string;
};

const CANVAS_COMPONENTS = "Components";
const CANVAS_CLIPPING = "Clipping";
const CANVAS_DEEP_NESTING = "Deep Nesting";
const CANVAS_CONSTRAINTS = "Constraints";
const CANVAS_VARIANTS = "Variants";

const TEST_FRAMES: Record<string, FrameMeta> = {
  // Canvas 1: Components
  "button-inherit": { description: "ButtonBase inherits blue fill + 12px radius", canvas: CANVAS_COMPONENTS },
  "button-override": { description: "Original blue vs overridden green", canvas: CANVAS_COMPONENTS },
  "card-with-header": { description: "Card (3-level: Card > Header/Body > content)", canvas: CANVAS_COMPONENTS },
  "card-resized": { description: "Card at smaller size (240x160)", canvas: CANVAS_COMPONENTS },
  "icon-badge-nesting": { description: "IconWithBadge (2-level, badge outside bounds)", canvas: CANVAS_COMPONENTS },
  "navbar-full": {
    description: "NavBar 4-level: NavBar > NavItem > IconWithBadge > Icon+Badge",
    canvas: CANVAS_COMPONENTS,
  },
  "navbar-resized": { description: "NavBar at wider size (400x64)", canvas: CANVAS_COMPONENTS },
  "multi-button-sizes": { description: "3 ButtonBase instances at different sizes", canvas: CANVAS_COMPONENTS },

  // Canvas 2: Clipping
  "avatar-clip": { description: "Fully rounded clip (32px radius) on overflow content", canvas: CANVAS_CLIPPING },
  "avatar-small": { description: "Avatar at 40x40 (tighter rounded clip)", canvas: CANVAS_CLIPPING },
  "rounded-container-clip": { description: "Rounded frame (16px radius) clipping children", canvas: CANVAS_CLIPPING },
  "mixed-clip-corners": { description: "Corner rects clipped by 24px rounded frame", canvas: CANVAS_CLIPPING },
  "nested-rounded-clip": { description: "2-level rounded clip chain (20px > 16px radius)", canvas: CANVAS_CLIPPING },
  "clip-chain-3level": {
    description: "3-level nested clip (dark 12px > white 20px > gray 16px)",
    canvas: CANVAS_CLIPPING,
  },
  "clip-chain-resized": { description: "3-level clip chain at smaller size", canvas: CANVAS_CLIPPING },
  "avatar-row": { description: "3 avatar instances in a row", canvas: CANVAS_CLIPPING },

  // Canvas 3: Deep Nesting
  "depth-2": { description: "L2-Pair — 2-level nesting", canvas: CANVAS_DEEP_NESTING },
  "depth-3": { description: "L3-Decorated — 3-level nesting", canvas: CANVAS_DEEP_NESTING },
  "depth-4": { description: "L4-WithBadge — 4-level nesting", canvas: CANVAS_DEEP_NESTING },
  "depth-5": { description: "L5-Complete — full 5-level chain", canvas: CANVAS_DEEP_NESTING },
  "depth-5-resized": { description: "L5-Complete at smaller size", canvas: CANVAS_DEEP_NESTING },
  "cross-canvas-ref": { description: "Symbol instances from different canvases", canvas: CANVAS_DEEP_NESTING },
  "depth-override": { description: "L4 with background override (purple)", canvas: CANVAS_DEEP_NESTING },
  "multi-depth-mixed": { description: "L1+L2+L3+L4 at different depths in one frame", canvas: CANVAS_DEEP_NESTING },
  "effect-inherit": { description: "Child with drop shadow across boundary", canvas: CANVAS_DEEP_NESTING },
  "opacity-chain": { description: "Full vs half opacity nested instances", canvas: CANVAS_DEEP_NESTING },

  // Canvas 4: Constraints
  "constraint-stretch-full": { description: "STRETCH on both axes (inset:0 behavior)", canvas: CANVAS_CONSTRAINTS },
  "constraint-no-resize": { description: "Same size as symbol (baseline, no adjustment)", canvas: CANVAS_CONSTRAINTS },
  "constraint-mixed": { description: "MIN/MAX/CENTER/STRETCH at larger size", canvas: CANVAS_CONSTRAINTS },
  "constraint-mixed-shrink": { description: "Mixed constraints at smaller size", canvas: CANVAS_CONSTRAINTS },
  "constraint-scale": { description: "SCALE constraint on both axes (1.5x)", canvas: CANVAS_CONSTRAINTS },

  // Canvas 5: Variants
  "variant-default": { description: "Direct symbolID reference (no override)", canvas: CANVAS_VARIANTS },
  "variant-override": { description: "overriddenSymbolID to ButtonActive (green)", canvas: CANVAS_VARIANTS },
  "variant-all-states": {
    description: "All 3 variants (default/active/disabled) side by side",
    canvas: CANVAS_VARIANTS,
  },
};

// ============================================================================
// Visual comparison utilities
// ============================================================================

type CompareResult = {
  frameName: string;
  match: boolean;
  diffPercent: number;
  diffPixels: number;
  totalPixels: number;
};

function ensureDirs(): void {
  for (const dir of [OUTPUT_DIR, DIFF_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function svgToPng(svg: string, width?: number): Buffer {
  const opts: {
    fitTo?: { mode: "width"; value: number };
    font?: { loadSystemFonts: boolean };
    shapeRendering?: 0 | 1 | 2;
    textRendering?: 0 | 1 | 2;
  } = {
    font: { loadSystemFonts: true },
    shapeRendering: 2, // geometricPrecision
    textRendering: 2, // geometricPrecision
  };

  if (width !== undefined) {
    opts.fitTo = { mode: "width", value: width };
  }

  const resvg = new Resvg(svg, opts);
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

function compareSvgs(
  actualSvg: string,
  renderedSvg: string,
  frameName: string,
  options: { threshold?: number; maxDiffPercent?: number; saveDiff?: boolean } = {},
): CompareResult {
  const { threshold = 0.1, maxDiffPercent = 5.0, saveDiff = false } = options;

  const actualPngBuffer = svgToPng(actualSvg);
  const actual = PNG.sync.read(actualPngBuffer);

  // Render at same width as actual for fair comparison
  const renderedPngBuffer = svgToPng(renderedSvg, actual.width);
  let rendered = PNG.sync.read(renderedPngBuffer);

  if (saveDiff) {
    ensureDirs();
    const safeName = frameName.replace(/[^a-zA-Z0-9-_]/g, "_");
    fs.writeFileSync(path.join(OUTPUT_DIR, `${safeName}-actual.png`), actualPngBuffer);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${safeName}-rendered.png`), renderedPngBuffer);
  }

  // Resize if dimensions don't match
  if (rendered.width !== actual.width || rendered.height !== actual.height) {
    const resized = new PNG({ width: actual.width, height: actual.height });
    for (let y = 0; y < actual.height; y++) {
      const sy = Math.floor((y / actual.height) * rendered.height);
      for (let x = 0; x < actual.width; x++) {
        const sx = Math.floor((x / actual.width) * rendered.width);
        const srcIdx = (sy * rendered.width + sx) * 4;
        const dstIdx = (y * actual.width + x) * 4;
        resized.data[dstIdx] = rendered.data[srcIdx];
        resized.data[dstIdx + 1] = rendered.data[srcIdx + 1];
        resized.data[dstIdx + 2] = rendered.data[srcIdx + 2];
        resized.data[dstIdx + 3] = rendered.data[srcIdx + 3];
      }
    }
    rendered = resized;
  }

  const diff = new PNG({ width: actual.width, height: actual.height });

  const diffPixels = pixelmatch(actual.data, rendered.data, diff.data, actual.width, actual.height, {
    threshold,
    includeAA: false,
  });

  const totalPixels = actual.width * actual.height;
  const diffPercent = (diffPixels / totalPixels) * 100;
  const match = diffPercent <= maxDiffPercent;

  if (saveDiff && diffPixels > 0) {
    const safeName = frameName.replace(/[^a-zA-Z0-9-_]/g, "_");
    const buffer = PNG.sync.write(diff);
    fs.writeFileSync(path.join(DIFF_DIR, `${safeName}-diff.png`), buffer);
  }

  return { frameName, match, diffPercent, diffPixels, totalPixels };
}

// ============================================================================
// Parsed data cache
// ============================================================================

type LayerInfo = {
  name: string;
  node: FigNode;
  canvas: string;
  size: { width: number; height: number };
};

type ParsedData = {
  canvases: readonly FigNode[];
  layers: Map<string, LayerInfo>;
  symbols: Map<string, FigNode>;
  blobs: readonly FigBlob[];
  images: ReadonlyMap<string, FigImage>;
  nodeMap: ReadonlyMap<string, FigNode>;
};

let parsedDataCache: ParsedData | null = null;

async function loadFigFile(): Promise<ParsedData> {
  if (parsedDataCache) return parsedDataCache;

  if (!fs.existsSync(FIG_FILE)) {
    throw new Error(
      `Fixture file not found: ${FIG_FILE}\n` +
        `Run: bun packages/@aurochs-renderer/figma/scripts/generate-symbol-resolution-fixtures.ts`,
    );
  }

  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);
  const canvases = findNodesByType(roots, "CANVAS");

  const layers = new Map<string, LayerInfo>();
  const symbols = new Map<string, FigNode>();

  for (const canvas of canvases) {
    const canvasName = canvas.name ?? "unnamed";
    for (const child of canvas.children ?? []) {
      const name = child.name ?? "unnamed";
      const nodeType = getNodeType(child);
      const size = child.size;

      if (nodeType === "SYMBOL") {
        symbols.set(name, child);
      } else if (nodeType === "FRAME") {
        layers.set(name, {
          name,
          node: child,
          canvas: canvasName,
          size: {
            width: size?.x ?? 100,
            height: size?.y ?? 100,
          },
        });
      }
    }
  }

  parsedDataCache = { canvases, layers, symbols, blobs: parsed.blobs, images: parsed.images, nodeMap };
  return parsedDataCache;
}

// ============================================================================
// Tests
// ============================================================================

describe("Symbol Resolution", () => {
  beforeAll(async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping symbol-resolution tests — fixture file not found");
      console.log("Run: bun packages/@aurochs-renderer/figma/scripts/generate-symbol-resolution-fixtures.ts");
      return;
    }
    await loadFigFile();

    for (const dir of [SNAPSHOTS_DIR, OUTPUT_DIR, DIFF_DIR]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  });

  // --------------------------------------------------------------------------
  // Structure validation
  // --------------------------------------------------------------------------

  it("fixture has 3 canvases with expected symbols and frames", async () => {
    if (!fs.existsSync(FIG_FILE)) return;
    const data = await loadFigFile();

    expect(data.canvases.length).toBe(5);
    const canvasNames = data.canvases.map((c) => c.name);
    expect(canvasNames).toContain(CANVAS_COMPONENTS);
    expect(canvasNames).toContain(CANVAS_CLIPPING);
    expect(canvasNames).toContain(CANVAS_DEEP_NESTING);
    expect(canvasNames).toContain(CANVAS_CONSTRAINTS);
    expect(canvasNames).toContain(CANVAS_VARIANTS);

    console.log(`\n=== Symbols (${data.symbols.size}) ===`);
    for (const [name, node] of data.symbols) {
      const size = node.size;
      const childCount = node.children?.length ?? 0;
      console.log(`  ${name} (${size?.x ?? "?"}x${size?.y ?? "?"}) — ${childCount} children`);
    }
    expect(data.symbols.size).toBeGreaterThanOrEqual(15);

    console.log(`\n=== Test Frames (${data.layers.size}) ===`);
    for (const [name, info] of data.layers) {
      const children = info.node.children ?? [];
      const instanceCount = children.filter((c) => getNodeType(c) === "INSTANCE").length;
      console.log(`  [${info.canvas}] ${name} (${info.size.width}x${info.size.height}) — ${instanceCount} instances`);
    }
    expect(data.layers.size).toBe(Object.keys(TEST_FRAMES).length);
  });

  // --------------------------------------------------------------------------
  // preResolveSymbols validation
  // --------------------------------------------------------------------------

  it("preResolveSymbols generates cache without circular dependency warnings", async () => {
    if (!fs.existsSync(FIG_FILE)) return;
    const data = await loadFigFile();

    const warnings: string[] = [];
    const cache = preResolveSymbols(data.nodeMap, { warnings });

    expect(cache.size).toBeGreaterThan(0);
    console.log(`Resolved SYMBOL cache: ${cache.size} entries`);

    const circularWarnings = warnings.filter((w) => w.includes("Circular"));
    expect(circularWarnings).toEqual([]);
  });

  // --------------------------------------------------------------------------
  // Per-canvas clean render check
  // --------------------------------------------------------------------------

  it("all canvases render without unresolved SYMBOL warnings", { timeout: 60_000 }, async () => {
    if (!fs.existsSync(FIG_FILE)) return;
    const data = await loadFigFile();

    let totalUnresolved = 0;
    for (const canvas of data.canvases) {
      const result = await renderCanvas(canvas, {
        blobs: data.blobs,
        images: data.images,
        symbolMap: data.nodeMap,
      });
      const unresolvedWarnings = result.warnings.filter((w) => w.includes("Could not resolve"));
      if (unresolvedWarnings.length > 0) {
        console.log(`"${canvas.name}": ${unresolvedWarnings.length} unresolved`);
        for (const w of unresolvedWarnings.slice(0, 3)) {
          console.log(`  - ${w}`);
        }
        totalUnresolved += unresolvedWarnings.length;
      }
    }
    console.log(`Total unresolved across all canvases: ${totalUnresolved}`);
    expect(totalUnresolved).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Per-frame visual comparison (grouped by canvas)
  // --------------------------------------------------------------------------

  for (const canvasName of [
    CANVAS_COMPONENTS,
    CANVAS_CLIPPING,
    CANVAS_DEEP_NESTING,
    CANVAS_CONSTRAINTS,
    CANVAS_VARIANTS,
  ]) {
    const framesInCanvas = Object.entries(TEST_FRAMES).filter(([, m]) => m.canvas === canvasName);

    describe(canvasName, () => {
      for (const [frameName, meta] of framesInCanvas) {
        it(`${frameName}: ${meta.description}`, async () => {
          if (!fs.existsSync(FIG_FILE)) {
            console.log("SKIP: fixture file not found");
            return;
          }

          const data = await loadFigFile();
          const layer = data.layers.get(frameName);

          if (!layer) {
            console.log(`SKIP: Frame "${frameName}" not found`);
            return;
          }

          expect(layer.canvas).toBe(canvasName);

          const fileName = `${frameName}.svg`;
          const actualPath = path.join(ACTUAL_DIR, fileName);
          const hasActual = fs.existsSync(actualPath);

          // Render
          const wrapperCanvas: FigNode = {
            type: "CANVAS",
            name: frameName,
            children: [layer.node],
          } as FigNode;

          const result = await renderCanvas(wrapperCanvas, {
            width: layer.size.width,
            height: layer.size.height,
            blobs: data.blobs,
            images: data.images,
            symbolMap: data.nodeMap,
          });

          // Write snapshot
          fs.writeFileSync(path.join(SNAPSHOTS_DIR, fileName), result.svg);

          // No unresolved SYMBOL warnings
          const symbolWarnings = result.warnings.filter(
            (w) => w.includes("Could not resolve SYMBOL") || w.includes("Symbol map missing"),
          );
          expect(symbolWarnings).toHaveLength(0);

          // Visual comparison against Figma export
          if (hasActual) {
            const actualSvg = fs.readFileSync(actualPath, "utf-8");
            const cmp = compareSvgs(actualSvg, result.svg, frameName, {
              maxDiffPercent: 5,
              saveDiff: true,
            });

            console.log(
              `  ${frameName}: ${cmp.diffPercent.toFixed(2)}% diff (${cmp.diffPixels}/${cmp.totalPixels} px)`,
            );
            expect(cmp.diffPercent).toBeLessThan(10);
          } else {
            console.log(`  ${frameName}: no Figma export — skipping visual comparison`);
          }
        });
      }
    });
  }

  // --------------------------------------------------------------------------
  // Summary test: aggregate diff stats across all frames
  // --------------------------------------------------------------------------

  it("summary of all frames", { timeout: 120_000 }, async () => {
    if (!fs.existsSync(FIG_FILE)) return;
    const data = await loadFigFile();

    const results: CompareResult[] = [];

    for (const [frameName] of Object.entries(TEST_FRAMES)) {
      const layer = data.layers.get(frameName);
      if (!layer) continue;

      const actualPath = path.join(ACTUAL_DIR, `${frameName}.svg`);
      if (!fs.existsSync(actualPath)) continue;

      const wrapperCanvas: FigNode = {
        type: "CANVAS",
        name: frameName,
        children: [layer.node],
      } as FigNode;

      const renderResult = await renderCanvas(wrapperCanvas, {
        width: layer.size.width,
        height: layer.size.height,
        blobs: data.blobs,
        images: data.images,
        symbolMap: data.nodeMap,
      });

      const actualSvg = fs.readFileSync(actualPath, "utf-8");
      const cmp = compareSvgs(actualSvg, renderResult.svg, frameName, {
        maxDiffPercent: 5,
        saveDiff: true,
      });
      results.push(cmp);
    }

    // Print summary table
    console.log("\n=== Visual Comparison Summary ===");
    console.log("Frame".padEnd(28) + "Diff %".padStart(10) + "  Status");
    console.log("-".repeat(50));

    let passed = 0;
    let failed = 0;
    let totalDiff = 0;

    for (const r of results) {
      const status = r.diffPercent < 10 ? "PASS" : "FAIL";
      if (r.diffPercent < 10) passed++;
      else failed++;
      totalDiff += r.diffPercent;
      console.log(r.frameName.padEnd(28) + `${r.diffPercent.toFixed(2)}%`.padStart(10) + `  ${status}`);
    }

    const avgDiff = results.length > 0 ? totalDiff / results.length : 0;
    console.log("-".repeat(50));
    console.log(`Total: ${results.length} frames, ${passed} pass, ${failed} fail, avg ${avgDiff.toFixed(2)}% diff`);

    expect(failed).toBe(0);
  });
});
