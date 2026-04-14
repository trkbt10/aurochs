#!/usr/bin/env bun
/**
 * @file Generate IMAGE fill fixture .fig file
 *
 * Tests image fill rendering:
 * - Basic image fill on rectangle
 * - Image fill with drop shadow
 * - Image fill on circle (avatar pattern)
 * - Image fill with corner radius
 * - Solid + IMAGE multi-fill (stacked)
 *
 * Usage:
 *   bun packages/@aurochs-renderer/fig/scripts/generate-image-fill-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFigFile,
  frameNode,
  roundedRectNode,
  ellipseNode,
  solidPaint,
  imagePaint,
  dropShadow,
  effects,
} from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/image-fill");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "image-fill.fig");

type Color = { r: number; g: number; b: number; a: number };
type IDAllocator = { value: number };
type FigFile = ReturnType<typeof createFigFile>;

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };
const LIGHT_GRAY: Color = { r: 0.95, g: 0.95, b: 0.95, a: 1 };

/**
 * Generate a valid 4x4 checkerboard PNG as test image.
 * Red and blue alternating pixels — visually distinctive.
 */
function createCheckerboardPng(): Uint8Array {
  // Valid 4x4 RGB PNG (verified with `file` and ImageMagick)
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAF0lEQVR4nGP4bwQE" +
    "/yEkA5wFJBlwygAAQTIWMSbY+UYAAAAASUVORK5CYII=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function addImageFillBasic(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number, imageRef: string,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("image-fill-basic")
      .size(160, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(shapeID, frameID)
      .name("image-rect")
      .size(120, 80)
      .position(20, 20)
      .cornerRadius(8)
      .fill(imagePaint(imageRef).build())
      .build(),
  );
}

function addImageFillWithShadow(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number, imageRef: string,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("image-fill-shadow")
      .size(180, 140)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(shapeID, frameID)
      .name("image-shadowed")
      .size(120, 80)
      .position(30, 30)
      .cornerRadius(12)
      .fill(imagePaint(imageRef).build())
      .effects(effects(
        dropShadow().offset(0, 4).blur(8).color({ r: 0, g: 0, b: 0, a: 0.25 }),
      ))
      .build(),
  );
}

function addImageFillCircle(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number, imageRef: string,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("image-fill-circle")
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
      .name("image-avatar")
      .size(80, 80)
      .position(20, 20)
      .fill(imagePaint(imageRef).build())
      .build(),
  );
}

function addImageFillMulti(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number, imageRef: string,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("image-fill-multi")
      .size(160, 120)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  const shapeData = roundedRectNode(shapeID, frameID)
    .name("solid-plus-image")
    .size(120, 80)
    .position(20, 20)
    .cornerRadius(8)
    .fill({ r: 0.5, g: 0.5, b: 0.5, a: 1 })
    .build();

  figFile.addRoundedRectangle({
    ...shapeData,
    fillPaints: [
      solidPaint({ r: 0.2, g: 0.3, b: 0.8, a: 1 }).build(),
      imagePaint(imageRef).opacity(0.6).build(),
    ],
  });
}

async function generateImageFillFixtures(): Promise<void> {
  console.log("Generating image fill fixtures...\n");

  const figFile = createFigFile();
  const docID = figFile.addDocument("ImageFill");
  const canvasID = figFile.addCanvas(docID, "Image Fill");
  figFile.addInternalCanvas(docID);

  // Add test image — addImage computes the SHA1 hash automatically
  const imageData = createCheckerboardPng();
  const imageRef = figFile.addImage(imageData, "image/png");

  const nextID: IDAllocator = { value: 10 };

  const GRID_COLS = 4;
  const COL_WIDTH = 220;
  const ROW_HEIGHT = 180;
  const MARGIN = 50;

  type Builder = (f: FigFile, c: number, id: IDAllocator, x: number, y: number, ref: string) => void;

  const builders: { name: string; fn: Builder }[] = [
    { name: "Image fill basic", fn: addImageFillBasic },
    { name: "Image fill + shadow", fn: addImageFillWithShadow },
    { name: "Image fill circle", fn: addImageFillCircle },
    { name: "Image fill multi-layer", fn: addImageFillMulti },
  ];

  for (let i = 0; i < builders.length; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const x = MARGIN + col * COL_WIDTH;
    const y = MARGIN + row * ROW_HEIGHT;
    builders[i].fn(figFile, canvasID, nextID, x, y, imageRef);
  }

  for (const dir of [OUTPUT_DIR, path.join(OUTPUT_DIR, "actual"), path.join(OUTPUT_DIR, "snapshots")]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const figData = await figFile.buildAsync({ fileName: "image-fill" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Frames: ${builders.length}\n`);
  for (const b of builders) {
    console.log(`  - ${b.name}`);
  }
  console.log(`\nNext steps:`);
  console.log(`1. Open ${OUTPUT_FILE} in Figma`);
  console.log(`2. Export each frame as SVG to fixtures/image-fill/actual/`);
  console.log(`3. Run: npx vitest run packages/@aurochs-renderer/fig/spec/image-fill.spec.ts`);
}

generateImageFillFixtures().catch(console.error);
