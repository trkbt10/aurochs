/**
 * @file Constraint edge-case tests
 *
 * Tests constraint resolution in edge-case scenarios:
 *
 * Canvas 1: "Nested Constraints" — Cascading STRETCH through nested instances
 * Canvas 2: "Variant + Resize"   — overriddenSymbolID combined with resize + constraints
 * Canvas 3: "Ellipse Constraints" — Constraint resolution on ELLIPSE nodes
 * Canvas 4: "Asymmetric STRETCH" — Unequal margins with STRETCH constraint
 *
 * Compares renderer output against Figma SVG exports using pixel-based
 * image comparison (pixelmatch + resvg-js).
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
const FIXTURES_DIR = path.join(__dirname, "../fixtures/constraint-edge-cases");
const ACTUAL_DIR = path.join(FIXTURES_DIR, "actual");
const SNAPSHOTS_DIR = path.join(FIXTURES_DIR, "snapshots");
const OUTPUT_DIR = path.join(FIXTURES_DIR, "__output__");
const DIFF_DIR = path.join(FIXTURES_DIR, "__diff__");
const FIG_FILE = path.join(FIXTURES_DIR, "constraint-edge-cases.fig");

// ============================================================================
// Test frame definitions per canvas
// ============================================================================

type FrameMeta = {
  description: string;
  canvas: string;
};

const CANVAS_NESTED = "Nested Constraints";
const CANVAS_VARIANT_RESIZE = "Variant + Resize";
const CANVAS_ELLIPSE = "Ellipse Constraints";
const CANVAS_ASYMMETRIC = "Asymmetric STRETCH";

const TEST_FRAMES: Record<string, FrameMeta> = {
  // Canvas 1: Nested Constraints
  "nested-stretch-grow": { description: "NestOuter enlarged (cascading STRETCH)", canvas: CANVAS_NESTED },
  "nested-stretch-shrink": { description: "NestOuter shrunk (cascading STRETCH)", canvas: CANVAS_NESTED },
  "nested-same-size": { description: "NestOuter at original size (baseline)", canvas: CANVAS_NESTED },

  // Canvas 2: Variant + Resize
  "variant-resize-default": { description: "VarBtnDefault wider (STRETCH label)", canvas: CANVAS_VARIANT_RESIZE },
  "variant-resize-override": { description: "overriddenSymbolID + resize (green)", canvas: CANVAS_VARIANT_RESIZE },
  "variant-resize-both": {
    description: "Default & overridden side by side, both resized",
    canvas: CANVAS_VARIANT_RESIZE,
  },

  // Canvas 3: Ellipse Constraints
  "ellipse-center-stretch-grow": {
    description: "EllipseBox enlarged (CENTER + STRETCH ellipses)",
    canvas: CANVAS_ELLIPSE,
  },
  "ellipse-center-stretch-shrink": { description: "EllipseBox shrunk", canvas: CANVAS_ELLIPSE },
  "ellipse-scale": { description: "SCALE ellipse at 1.5x", canvas: CANVAS_ELLIPSE },
  "ellipse-same-size": { description: "EllipseBox at original (baseline)", canvas: CANVAS_ELLIPSE },

  // Canvas 4: Asymmetric STRETCH
  "asym-stretch-grow": { description: "AsymBox enlarged (l=10,r=50,t=15,b=35)", canvas: CANVAS_ASYMMETRIC },
  "asym-stretch-shrink": { description: "AsymBox shrunk", canvas: CANVAS_ASYMMETRIC },
  "asym-wide-grow": { description: "AsymBoxWide enlarged (l=30,r=70)", canvas: CANVAS_ASYMMETRIC },
  "asym-wide-shrink": { description: "AsymBoxWide shrunk", canvas: CANVAS_ASYMMETRIC },
  "asym-multi-grow": { description: "AsymMultiChild enlarged (inverse margins)", canvas: CANVAS_ASYMMETRIC },
  "asym-multi-shrink": { description: "AsymMultiChild shrunk", canvas: CANVAS_ASYMMETRIC },
  "asym-same-size": { description: "AsymBox at original (baseline)", canvas: CANVAS_ASYMMETRIC },
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
    shapeRendering: 2,
    textRendering: 2,
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

  const renderedPngBuffer = svgToPng(renderedSvg, actual.width);
  let rendered = PNG.sync.read(renderedPngBuffer);

  if (saveDiff) {
    ensureDirs();
    const safeName = frameName.replace(/[^a-zA-Z0-9-_]/g, "_");
    fs.writeFileSync(path.join(OUTPUT_DIR, `${safeName}-actual.png`), actualPngBuffer);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${safeName}-rendered.png`), renderedPngBuffer);
  }

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
        `Run: bun packages/@aurochs-renderer/figma/scripts/generate-constraint-edge-cases-fixtures.ts`,
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

describe("Constraint Edge Cases", () => {
  beforeAll(async () => {
    if (!fs.existsSync(FIG_FILE)) {
      console.log("Skipping constraint-edge-cases tests — fixture file not found");
      console.log("Run: bun packages/@aurochs-renderer/figma/scripts/generate-constraint-edge-cases-fixtures.ts");
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

  it("fixture has 4 canvases with expected symbols and frames", async () => {
    if (!fs.existsSync(FIG_FILE)) return;
    const data = await loadFigFile();

    expect(data.canvases.length).toBe(4);
    const canvasNames = data.canvases.map((c) => c.name);
    expect(canvasNames).toContain(CANVAS_NESTED);
    expect(canvasNames).toContain(CANVAS_VARIANT_RESIZE);
    expect(canvasNames).toContain(CANVAS_ELLIPSE);
    expect(canvasNames).toContain(CANVAS_ASYMMETRIC);

    console.log(`\n=== Symbols (${data.symbols.size}) ===`);
    for (const [name, node] of data.symbols) {
      const size = node.size;
      const childCount = node.children?.length ?? 0;
      console.log(`  ${name} (${size?.x ?? "?"}x${size?.y ?? "?"}) — ${childCount} children`);
    }

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

  for (const canvasName of [CANVAS_NESTED, CANVAS_VARIANT_RESIZE, CANVAS_ELLIPSE, CANVAS_ASYMMETRIC]) {
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
    console.log("Frame".padEnd(35) + "Diff %".padStart(10) + "  Status");
    console.log("-".repeat(57));

    let passed = 0;
    let failed = 0;
    let totalDiff = 0;

    for (const r of results) {
      const status = r.diffPercent < 10 ? "PASS" : "FAIL";
      if (r.diffPercent < 10) passed++;
      else failed++;
      totalDiff += r.diffPercent;
      console.log(r.frameName.padEnd(35) + `${r.diffPercent.toFixed(2)}%`.padStart(10) + `  ${status}`);
    }

    const avgDiff = results.length > 0 ? totalDiff / results.length : 0;
    console.log("-".repeat(57));
    console.log(`Total: ${results.length} frames, ${passed} pass, ${failed} fail, avg ${avgDiff.toFixed(2)}% diff`);

    expect(failed).toBe(0);
  });
});
