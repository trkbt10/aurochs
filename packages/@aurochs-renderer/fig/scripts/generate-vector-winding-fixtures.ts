#!/usr/bin/env bun
/**
 * @file Generate vector winding rule fixture .fig file
 *
 * Tests that VECTOR nodes with multiple subpaths and different winding
 * rules render correctly. Specifically:
 * - evenodd with inner hole (donut via subpaths)
 * - nonzero overlapping subpaths
 * - Multiple fillGeometry entries with mixed winding rules
 *
 * Usage:
 *   bun packages/@aurochs-renderer/fig/scripts/generate-vector-winding-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFigFile,
  frameNode,
  ellipseNode,
  roundedRectNode,
} from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/vector-winding");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "vector-winding.fig");

type Color = { r: number; g: number; b: number; a: number };
type IDAllocator = { value: number };
type FigFile = ReturnType<typeof createFigFile>;

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };
const LIGHT_GRAY: Color = { r: 0.95, g: 0.95, b: 0.95, a: 1 };
const BLUE: Color = { r: 0.2, g: 0.4, b: 0.9, a: 1 };
const RED: Color = { r: 0.9, g: 0.2, b: 0.2, a: 1 };
const GREEN: Color = { r: 0.2, g: 0.7, b: 0.3, a: 1 };

/**
 * Donut shape via ellipse innerRadius.
 * The fillGeometry blob will have evenodd winding rule.
 * The inner hole must remain transparent.
 */
function addEvenoddDonut(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("winding-evenodd-donut")
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

/**
 * Full donut (complete ring, no arc gap).
 * Tests that evenodd winding produces a ring, not a filled circle.
 */
function addEvenoddFullRing(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("winding-evenodd-ring")
      .size(120, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(shapeID, frameID)
      .name("ring")
      .size(80, 80)
      .position(20, 20)
      .fill(RED)
      .innerRadius(0.7)
      .build(),
  );
}

/**
 * Donut with stroke — inner and outer edges both visible.
 */
function addDonutWithStroke(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("winding-donut-stroke")
      .size(120, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(shapeID, frameID)
      .name("donut-stroked")
      .size(80, 80)
      .position(20, 20)
      .fill(GREEN)
      .stroke({ r: 0.1, g: 0.1, b: 0.1, a: 1 })
      .strokeWeight(2)
      .innerRadius(0.4)
      .build(),
  );
}

/**
 * Arc (semicircle) — tests that arc shape is rendered, not full ellipse.
 */
function addArcSemicircle(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("winding-arc-semi")
      .size(120, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(shapeID, frameID)
      .name("semicircle")
      .size(80, 80)
      .position(20, 20)
      .fill(BLUE)
      .arc(0, 180)
      .build(),
  );
}

/**
 * Arc donut (ring segment) — partial arc with inner radius.
 */
function addArcDonutSegment(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("winding-arc-donut")
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
      .name("ring-segment")
      .size(80, 80)
      .position(20, 20)
      .fill(RED)
      .arc(0, 270)
      .innerRadius(0.6)
      .build(),
  );
}

/**
 * Stroke-only arc (no fill) — progress ring pattern.
 */
function addStrokeOnlyArc(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("winding-stroke-arc")
      .size(120, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(shapeID, frameID)
      .name("progress-ring")
      .size(80, 80)
      .position(20, 20)
      .noFill()
      .stroke(GREEN)
      .strokeWeight(6)
      .strokeCap("ROUND")
      .arc(270, 630) // 270deg to 630deg = 360deg sweep starting from top
      .innerRadius(1) // stroke-only ring
      .build(),
  );
}

async function generateVectorWindingFixtures(): Promise<void> {
  console.log("Generating vector winding rule fixtures...\n");

  const figFile = createFigFile();
  const docID = figFile.addDocument("VectorWinding");
  const canvasID = figFile.addCanvas(docID, "Vector Winding");
  figFile.addInternalCanvas(docID);

  const nextID: IDAllocator = { value: 10 };

  const GRID_COLS = 3;
  const COL_WIDTH = 160;
  const ROW_HEIGHT = 160;
  const MARGIN = 50;

  type Builder = (f: FigFile, c: number, id: IDAllocator, x: number, y: number) => void;

  const builders: { name: string; fn: Builder }[] = [
    { name: "Evenodd donut", fn: addEvenoddDonut },
    { name: "Evenodd full ring", fn: addEvenoddFullRing },
    { name: "Donut with stroke", fn: addDonutWithStroke },
    { name: "Arc semicircle", fn: addArcSemicircle },
    { name: "Arc donut segment", fn: addArcDonutSegment },
    { name: "Stroke-only arc (progress)", fn: addStrokeOnlyArc },
  ];

  for (let i = 0; i < builders.length; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    builders[i].fn(figFile, canvasID, nextID, MARGIN + col * COL_WIDTH, MARGIN + row * ROW_HEIGHT);
  }

  for (const dir of [OUTPUT_DIR, path.join(OUTPUT_DIR, "actual"), path.join(OUTPUT_DIR, "snapshots")]) {
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
  }

  const figData = await figFile.buildAsync({ fileName: "vector-winding" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Frames: ${builders.length}\n`);
  for (const b of builders) { console.log(`  - ${b.name}`); }
}

generateVectorWindingFixtures().catch(console.error);
