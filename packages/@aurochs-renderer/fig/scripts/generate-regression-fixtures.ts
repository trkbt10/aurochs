#!/usr/bin/env bun
/**
 * @file Generate regression test fixture .fig file
 *
 * Fixtures targeting specific bugs that were found and fixed.
 * Each frame isolates one bug to prevent regression.
 *
 * 1. fill-rule evenodd on vector with subpaths (hole must not be filled)
 * 2. FOREGROUND_BLUR (layer blur) on ellipse
 * 3. Rounded frame clipping children with cornerRadius
 * 4. ELLIPSE arcData: partial arc, donut
 * 5. Multiple fill layers: 2-3 paints stacked
 *
 * Usage:
 *   bun packages/@aurochs-renderer/fig/scripts/generate-regression-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFigFile,
  frameNode,
  rectNode,
  roundedRectNode,
  ellipseNode,
  solidPaint,
  linearGradient,
  layerBlur,
  dropShadow,
  effects,
} from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/regression");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "regression.fig");

type Color = { r: number; g: number; b: number; a: number };
type IDAllocator = { value: number };
type FigFile = ReturnType<typeof createFigFile>;

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };
const LIGHT_GRAY: Color = { r: 0.95, g: 0.95, b: 0.95, a: 1 };
const BLUE: Color = { r: 0.2, g: 0.4, b: 0.9, a: 1 };
const RED: Color = { r: 0.9, g: 0.2, b: 0.2, a: 1 };

// =============================================================================
// 1. fill-rule evenodd — ELLIPSE donut (inner hole must be transparent)
// =============================================================================

/**
 * Donut shape: ellipse with innerRadius > 0.
 * The inner hole must be transparent (evenodd winding rule).
 * Previously, fill-rule was double-mapped and became "nonzero",
 * filling the hole.
 */
function addEvenoddDonut(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("evenodd-donut")
      .size(120, 120)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(shapeID, frameID)
      .name("donut")
      .size(80, 80)
      .position(20, 20)
      .fill(BLUE)
      .innerRadius(0.5)
      .build(),
  );
}

// =============================================================================
// 2. FOREGROUND_BLUR (layer blur)
// =============================================================================

/**
 * Ellipse with layer blur effect.
 * Previously, "FOREGROUND_BLUR" was not recognized (only "LAYER_BLUR").
 */
function addForegroundBlur(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("foreground-blur")
      .size(140, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(shapeID, frameID)
      .name("blurred-circle")
      .size(80, 80)
      .position(30, 20)
      .fill(RED)
      .effects(effects(layerBlur().radius(6)))
      .build(),
  );
}

// =============================================================================
// 3. Rounded frame clipping
// =============================================================================

/**
 * Frame with cornerRadius clipping a child that overflows.
 * Previously, clipPath used fillGeometry (straight rect) instead
 * of <rect rx> when cornerRadius was set.
 */
function addRoundedClip(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("rounded-clip")
      .size(160, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Rounded inner frame
  const innerFrameID = nextID.value++;
  figFile.addFrame(
    frameNode(innerFrameID, frameID)
      .name("rounded-frame")
      .size(120, 80)
      .position(20, 20)
      .cornerRadius(20)
      .clipsContent(true)
      .background(LIGHT_GRAY)
      .build(),
  );

  // Child that overflows the frame — should be clipped to rounded rect
  const childID = nextID.value++;
  figFile.addRectangle(
    rectNode(childID, innerFrameID)
      .name("overflow-child")
      .size(160, 120)
      .position(-20, -20)
      .fill(BLUE)
      .build(),
  );
}

// =============================================================================
// 4. ELLIPSE arcData: partial arc
// =============================================================================

/**
 * Ellipse with arc (not full circle).
 * Previously, arcData was ignored and full ellipse was rendered.
 */
function addArcPartial(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("arc-partial")
      .size(120, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Semicircle (180 degrees)
  const shapeID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(shapeID, frameID)
      .name("semicircle")
      .size(80, 80)
      .position(20, 20)
      .fill(RED)
      .arc(0, 180)
      .build(),
  );
}

/**
 * Ellipse donut with partial arc — ring segment.
 */
function addArcDonut(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("arc-donut")
      .size(120, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // 270-degree ring segment
  const shapeID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(shapeID, frameID)
      .name("ring-segment")
      .size(80, 80)
      .position(20, 20)
      .fill(BLUE)
      .arc(0, 270)
      .innerRadius(0.6)
      .build(),
  );
}

// =============================================================================
// 5. Multiple fill layers
// =============================================================================

/**
 * Rectangle with 3 fill layers stacked.
 * Previously, only the topmost fill was rendered.
 */
function addMultiFill3Layer(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("multi-fill-3layer")
      .size(180, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  const shapeData = roundedRectNode(shapeID, frameID)
    .name("three-layers")
    .size(140, 80)
    .position(20, 20)
    .cornerRadius(10)
    .fill({ r: 0.5, g: 0.5, b: 0.5, a: 1 })
    .build();

  figFile.addRoundedRectangle({
    ...shapeData,
    fillPaints: [
      solidPaint({ r: 0.1, g: 0.2, b: 0.5, a: 1 }).build(),
      linearGradient()
        .angle(45)
        .stops([
          { position: 0, color: { r: 1, g: 0.5, b: 0, a: 0.6 } },
          { position: 1, color: { r: 0, g: 0, b: 0, a: 0 } },
        ])
        .build(),
      solidPaint({ r: 1, g: 1, b: 1, a: 0.2 }).build(),
    ],
  });
}

// =============================================================================
// Main
// =============================================================================

async function generateRegressionFixtures(): Promise<void> {
  console.log("Generating regression test fixtures...\n");

  const figFile = createFigFile();
  const docID = figFile.addDocument("Regression");
  const canvasID = figFile.addCanvas(docID, "Regression Tests");
  figFile.addInternalCanvas(docID);

  const nextID: IDAllocator = { value: 10 };

  const GRID_COLS = 4;
  const COL_WIDTH = 220;
  const ROW_HEIGHT = 160;
  const MARGIN = 50;

  type Builder = (f: FigFile, c: number, id: IDAllocator, x: number, y: number) => void;

  const builders: { name: string; fn: Builder }[] = [
    { name: "Evenodd donut (fill-rule)", fn: addEvenoddDonut },
    { name: "Foreground blur", fn: addForegroundBlur },
    { name: "Rounded clip", fn: addRoundedClip },
    { name: "Arc partial", fn: addArcPartial },
    { name: "Arc donut (ring)", fn: addArcDonut },
    { name: "Multi-fill 3 layer", fn: addMultiFill3Layer },
  ];

  for (let i = 0; i < builders.length; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    builders[i].fn(figFile, canvasID, nextID, MARGIN + col * COL_WIDTH, MARGIN + row * ROW_HEIGHT);
  }

  for (const dir of [OUTPUT_DIR, path.join(OUTPUT_DIR, "actual"), path.join(OUTPUT_DIR, "snapshots")]) {
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
  }

  const figData = await figFile.buildAsync({ fileName: "regression" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Frames: ${builders.length}\n`);
  for (const b of builders) { console.log(`  - ${b.name}`); }
  console.log(`\nNext steps:`);
  console.log(`1. Open ${OUTPUT_FILE} in Figma`);
  console.log(`2. Export each frame as SVG to fixtures/regression/actual/`);
  console.log(`3. Run: npx vitest run packages/@aurochs-renderer/fig/spec/regression.spec.ts`);
}

generateRegressionFixtures().catch(console.error);
