#!/usr/bin/env bun
/**
 * @file Generate rounded clip fixture .fig file
 *
 * Tests that frames with cornerRadius correctly clip their children
 * to a rounded rectangle shape. Covers:
 * - Single-level rounded clip
 * - Rounded clip with overflow content
 * - Nested rounded clips (different radii)
 * - Rounded clip with gradient child
 *
 * Usage:
 *   bun packages/@aurochs-renderer/fig/scripts/generate-clip-rounded-fixtures.ts
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
  linearGradient,
} from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/clip-rounded");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "clip-rounded.fig");

type Color = { r: number; g: number; b: number; a: number };
type IDAllocator = { value: number };
type FigFile = ReturnType<typeof createFigFile>;

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };
const LIGHT_GRAY: Color = { r: 0.95, g: 0.95, b: 0.95, a: 1 };
const BLUE: Color = { r: 0.2, g: 0.4, b: 0.9, a: 1 };
const RED: Color = { r: 0.9, g: 0.2, b: 0.2, a: 1 };
const GREEN: Color = { r: 0.2, g: 0.7, b: 0.3, a: 1 };

/**
 * Rounded frame clipping a rect that overflows all edges.
 */
function addRoundedClipBasic(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("clip-rounded-basic")
      .size(160, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const innerID = nextID.value++;
  figFile.addFrame(
    frameNode(innerID, frameID)
      .name("rounded-frame")
      .size(120, 80)
      .position(20, 20)
      .cornerRadius(20)
      .clipsContent(true)
      .background(LIGHT_GRAY)
      .build(),
  );

  const childID = nextID.value++;
  figFile.addRectangle(
    rectNode(childID, innerID)
      .name("overflow")
      .size(160, 120)
      .position(-20, -20)
      .fill(BLUE)
      .build(),
  );
}

/**
 * Pill-shaped clip (cornerRadius = height/2).
 */
function addRoundedClipPill(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("clip-rounded-pill")
      .size(200, 80)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const innerID = nextID.value++;
  figFile.addFrame(
    frameNode(innerID, frameID)
      .name("pill-frame")
      .size(160, 40)
      .position(20, 20)
      .cornerRadius(20)
      .clipsContent(true)
      .build(),
  );

  const childID = nextID.value++;
  figFile.addRectangle(
    rectNode(childID, innerID)
      .name("content")
      .size(160, 40)
      .position(0, 0)
      .fill(RED)
      .build(),
  );
}

/**
 * Nested rounded clips with different radii.
 */
function addRoundedClipNested(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("clip-rounded-nested")
      .size(180, 140)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Outer rounded frame
  const outerID = nextID.value++;
  figFile.addFrame(
    frameNode(outerID, frameID)
      .name("outer-rounded")
      .size(140, 100)
      .position(20, 20)
      .cornerRadius(24)
      .clipsContent(true)
      .background(WHITE)
      .build(),
  );

  // Inner rounded frame
  const innerID = nextID.value++;
  figFile.addFrame(
    frameNode(innerID, outerID)
      .name("inner-rounded")
      .size(100, 60)
      .position(20, 20)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );

  const childID = nextID.value++;
  figFile.addRectangle(
    rectNode(childID, innerID)
      .name("content")
      .size(140, 100)
      .position(-20, -20)
      .fill(GREEN)
      .build(),
  );
}

/**
 * Rounded clip with gradient child.
 */
function addRoundedClipGradient(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("clip-rounded-gradient")
      .size(160, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const innerID = nextID.value++;
  figFile.addFrame(
    frameNode(innerID, frameID)
      .name("rounded-frame")
      .size(120, 80)
      .position(20, 20)
      .cornerRadius(16)
      .clipsContent(true)
      .build(),
  );

  const childID = nextID.value++;
  figFile.addRectangle(
    rectNode(childID, innerID)
      .name("gradient-content")
      .size(160, 120)
      .position(-20, -20)
      .fill(linearGradient()
        .angle(135)
        .stops([
          { position: 0, color: { r: 1, g: 0.3, b: 0.3, a: 1 } },
          { position: 1, color: { r: 0.3, g: 0.3, b: 1, a: 1 } },
        ])
        .build())
      .build(),
  );
}

/**
 * Circular clip (cornerRadius = size/2) — avatar pattern.
 */
function addRoundedClipCircle(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("clip-rounded-circle")
      .size(120, 120)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const innerID = nextID.value++;
  figFile.addFrame(
    frameNode(innerID, frameID)
      .name("circle-frame")
      .size(80, 80)
      .position(20, 20)
      .cornerRadius(40)
      .clipsContent(true)
      .build(),
  );

  const childID = nextID.value++;
  figFile.addRectangle(
    rectNode(childID, innerID)
      .name("content")
      .size(80, 80)
      .position(0, 0)
      .fill(BLUE)
      .build(),
  );

  // Overlapping element that should be clipped
  const overlapID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(overlapID, innerID)
      .name("overlap")
      .size(40, 40)
      .position(30, 30)
      .fill(RED)
      .build(),
  );
}

async function main(): Promise<void> {
  console.log("Generating clip-rounded fixtures...\n");

  const figFile = createFigFile();
  const docID = figFile.addDocument("ClipRounded");
  const canvasID = figFile.addCanvas(docID, "Clip Rounded");
  figFile.addInternalCanvas(docID);

  const nextID: IDAllocator = { value: 10 };
  const GRID_COLS = 3;
  const COL_WIDTH = 230;
  const ROW_HEIGHT = 170;
  const MARGIN = 50;

  type Builder = (f: FigFile, c: number, id: IDAllocator, x: number, y: number) => void;

  const builders: { name: string; fn: Builder }[] = [
    { name: "Rounded clip basic", fn: addRoundedClipBasic },
    { name: "Rounded clip pill", fn: addRoundedClipPill },
    { name: "Rounded clip nested", fn: addRoundedClipNested },
    { name: "Rounded clip gradient", fn: addRoundedClipGradient },
    { name: "Rounded clip circle", fn: addRoundedClipCircle },
  ];

  for (let i = 0; i < builders.length; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    builders[i].fn(figFile, canvasID, nextID, MARGIN + col * COL_WIDTH, MARGIN + row * ROW_HEIGHT);
  }

  for (const dir of [OUTPUT_DIR, path.join(OUTPUT_DIR, "actual"), path.join(OUTPUT_DIR, "snapshots")]) {
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
  }

  const figData = await figFile.buildAsync({ fileName: "clip-rounded" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Frames: ${builders.length}\n`);
  for (const b of builders) { console.log(`  - ${b.name}`); }
}

main().catch(console.error);
