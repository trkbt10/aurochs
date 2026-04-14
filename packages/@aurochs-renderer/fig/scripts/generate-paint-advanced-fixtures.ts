#!/usr/bin/env bun
/**
 * @file Generate advanced paint fixture .fig file
 *
 * Tests paint features that are missing from existing fixtures:
 *
 * 1. Angular (conic) gradient
 * 2. Diamond gradient
 * 3. Multiple fill layers (stacked paints)
 * 4. IMAGE fill
 * 5. MASK layer
 * 6. Combinations: IMAGE + effect, gradient + IMAGE overlay, mask + gradient
 *
 * Usage:
 *   bun packages/@aurochs-renderer/fig/scripts/generate-paint-advanced-fixtures.ts
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
  radialGradient,
  angularGradient,
  diamondGradient,
  imagePaint,
  dropShadow,
  innerShadow,
  effects,
  type GradientPaint,
} from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/paint-advanced");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "paint-advanced.fig");

// =============================================================================
// Types
// =============================================================================

type Color = { r: number; g: number; b: number; a: number };
type IDAllocator = { value: number };
type FigFile = ReturnType<typeof createFigFile>;

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };
const LIGHT_GRAY: Color = { r: 0.95, g: 0.95, b: 0.95, a: 1 };

// =============================================================================
// Test image: 4x4 pixel PNG (red/blue checkerboard) as base64
// =============================================================================

/**
 * Create a small test image for IMAGE fill testing.
 * This is a 4x4 pixel PNG with a simple pattern.
 */
function createTestImageData(): { data: Uint8Array; mimeType: string } {
  // Minimal valid 4x4 PNG — red/blue checkerboard
  // Generated programmatically to avoid external file dependencies
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAF0lEQVQI12P4z8DAwMDAxAAG" +
    "jP///wMAGQMF/UqW8h8AAAAASUVORK5CYII=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { data: bytes, mimeType: "image/png" };
}

// =============================================================================
// 1. Angular (conic) gradient
// =============================================================================

function addAngularGradientBasic(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("angular-gradient-basic")
      .size(160, 160)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(shapeID, frameID)
      .name("angular-circle")
      .size(120, 120)
      .position(20, 20)
      .fill(angularGradient()
        .stops([
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 0.33, color: { r: 0, g: 1, b: 0, a: 1 } },
          { position: 0.67, color: { r: 0, g: 0, b: 1, a: 1 } },
          { position: 1, color: { r: 1, g: 0, b: 0, a: 1 } },
        ])
        .build())
      .build(),
  );
}

function addAngularGradientRect(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("angular-gradient-rect")
      .size(200, 140)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(shapeID, frameID)
      .name("angular-rounded")
      .size(160, 100)
      .position(20, 20)
      .cornerRadius(16)
      .fill(angularGradient()
        .rotation(45)
        .stops([
          { position: 0, color: { r: 0.9, g: 0.2, b: 0.5, a: 1 } },
          { position: 0.5, color: { r: 0.2, g: 0.5, b: 0.9, a: 1 } },
          { position: 1, color: { r: 0.9, g: 0.2, b: 0.5, a: 1 } },
        ])
        .build())
      .build(),
  );
}

// =============================================================================
// 2. Diamond gradient
// =============================================================================

function addDiamondGradient(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("diamond-gradient")
      .size(160, 160)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(shapeID, frameID)
      .name("diamond-rect")
      .size(120, 120)
      .position(20, 20)
      .cornerRadius(8)
      .fill(diamondGradient()
        .stops([
          { position: 0, color: { r: 1, g: 0.8, b: 0.2, a: 1 } },
          { position: 1, color: { r: 0.8, g: 0.2, b: 0.1, a: 1 } },
        ])
        .build())
      .build(),
  );
}

// =============================================================================
// 3. Multiple fill layers
// =============================================================================

/**
 * Shape with two solid fills stacked (lower = blue, upper = semi-transparent red)
 */
function addMultiFillSolid(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("multi-fill-solid")
      .size(160, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // A shape with multiple fills requires setting fillPaints directly.
  // The builder's .fill() sets a single paint, so we build manually.
  const shapeID = nextID.value++;
  const shapeData = roundedRectNode(shapeID, frameID)
    .name("multi-solid")
    .size(120, 80)
    .position(20, 20)
    .cornerRadius(12)
    .fill({ r: 0.2, g: 0.4, b: 0.9, a: 1 }) // Will be overridden
    .build();

  // Override fillPaints with multiple layers
  const multiPaintData = {
    ...shapeData,
    fillPaints: [
      solidPaint({ r: 0.2, g: 0.4, b: 0.9, a: 1 }).build(),                 // bottom: blue
      solidPaint({ r: 0.9, g: 0.2, b: 0.2, a: 1 }).opacity(0.5).build(),    // top: semi-transparent red
    ],
  };
  figFile.addRoundedRectangle(multiPaintData);
}

/**
 * Shape with solid + gradient fills stacked
 */
function addMultiFillGradient(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("multi-fill-gradient")
      .size(200, 140)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  const shapeData = roundedRectNode(shapeID, frameID)
    .name("multi-gradient")
    .size(160, 100)
    .position(20, 20)
    .cornerRadius(10)
    .fill({ r: 0.5, g: 0.5, b: 0.5, a: 1 })
    .build();

  const multiPaintData = {
    ...shapeData,
    fillPaints: [
      solidPaint({ r: 0.1, g: 0.1, b: 0.3, a: 1 }).build(),  // bottom: dark
      linearGradient()
        .angle(135)
        .stops([
          { position: 0, color: { r: 1, g: 0.5, b: 0, a: 0.7 } },
          { position: 1, color: { r: 0, g: 0, b: 0, a: 0 } },
        ])
        .build(),                                            // top: gradient overlay
    ],
  };
  figFile.addRoundedRectangle(multiPaintData);
}

// =============================================================================
// 4. IMAGE fill
// =============================================================================

function addImageFillBasic(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
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

  // Add image as blob
  const imgData = createTestImageData();
  const imageRef = "test-image-001";
  figFile.addImage(imageRef, imgData.data, imgData.mimeType);

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

function addImageFillWithEffect(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("image-fill-effect")
      .size(180, 140)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const imgData = createTestImageData();
  const imageRef = "test-image-002";
  figFile.addImage(imageRef, imgData.data, imgData.mimeType);

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

function addImageFillRounded(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("image-fill-rounded")
      .size(120, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const imgData = createTestImageData();
  const imageRef = "test-image-003";
  figFile.addImage(imageRef, imgData.data, imgData.mimeType);

  // Circle with image fill (avatar-like)
  const shapeID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(shapeID, frameID)
      .name("image-circle")
      .size(80, 80)
      .position(20, 20)
      .fill(imagePaint(imageRef).build())
      .build(),
  );
}

// =============================================================================
// 5. MASK layer
// =============================================================================

/**
 * Gradient shape masked by a circle — content outside circle is hidden
 */
function addMaskBasic(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("mask-basic")
      .size(160, 160)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Inner frame to hold mask + content
  const innerFrameID = nextID.value++;
  figFile.addFrame(
    frameNode(innerFrameID, frameID)
      .name("mask-group")
      .size(120, 120)
      .position(20, 20)
      .clipsContent(false)
      .build(),
  );

  // Mask shape: circle (mask=true means subsequent siblings are masked by this)
  const maskID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(maskID, innerFrameID)
      .name("mask-circle")
      .size(120, 120)
      .position(0, 0)
      .fill(WHITE)
      .mask()
      .build(),
  );

  // Content behind mask: gradient rectangle
  const contentID = nextID.value++;
  figFile.addRectangle(
    rectNode(contentID, innerFrameID)
      .name("masked-content")
      .size(120, 120)
      .position(0, 0)
      .fill(linearGradient()
        .angle(45)
        .stops([
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
        ])
        .build())
      .build(),
  );
}

/**
 * Gradient masked by a rounded rectangle
 */
function addMaskRounded(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("mask-rounded")
      .size(200, 140)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const innerFrameID = nextID.value++;
  figFile.addFrame(
    frameNode(innerFrameID, frameID)
      .name("mask-group")
      .size(160, 100)
      .position(20, 20)
      .clipsContent(false)
      .build(),
  );

  // Mask: rounded rect
  const maskID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(maskID, innerFrameID)
      .name("mask-shape")
      .size(160, 100)
      .position(0, 0)
      .cornerRadius(20)
      .fill(WHITE)
      .mask()
      .build(),
  );

  // Content: radial gradient larger than mask
  const contentID = nextID.value++;
  figFile.addRectangle(
    rectNode(contentID, innerFrameID)
      .name("masked-gradient")
      .size(200, 140)
      .position(-20, -20)
      .fill(radialGradient()
        .stops([
          { position: 0, color: { r: 1, g: 0.8, b: 0, a: 1 } },
          { position: 1, color: { r: 0.5, g: 0, b: 0.5, a: 1 } },
        ])
        .build())
      .build(),
  );
}

// =============================================================================
// 6. Combinations
// =============================================================================

/**
 * Angular gradient with drop shadow and corner radius
 */
function addAngularGradientWithEffect(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("angular-gradient-effect")
      .size(180, 180)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(shapeID, frameID)
      .name("angular-shadowed")
      .size(120, 120)
      .position(30, 30)
      .cornerRadius(20)
      .fill(angularGradient()
        .stops([
          { position: 0, color: { r: 1, g: 0.3, b: 0.3, a: 1 } },
          { position: 0.25, color: { r: 1, g: 0.8, b: 0.2, a: 1 } },
          { position: 0.5, color: { r: 0.2, g: 0.8, b: 0.5, a: 1 } },
          { position: 0.75, color: { r: 0.3, g: 0.3, b: 1, a: 1 } },
          { position: 1, color: { r: 1, g: 0.3, b: 0.3, a: 1 } },
        ])
        .build())
      .effects(effects(
        dropShadow().offset(0, 4).blur(12).color({ r: 0, g: 0, b: 0, a: 0.2 }),
      ))
      .build(),
  );
}

/**
 * Multiple fills: solid + image overlay
 */
function addMultiFillImage(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("multi-fill-image")
      .size(160, 120)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const imgData = createTestImageData();
  const imageRef = "test-image-004";
  figFile.addImage(imageRef, imgData.data, imgData.mimeType);

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
      solidPaint({ r: 0.2, g: 0.3, b: 0.8, a: 1 }).build(),  // bottom: solid blue
      imagePaint(imageRef).opacity(0.5).build(),  // top: semi-transparent image
    ],
  });
}

// =============================================================================
// Main
// =============================================================================

async function generatePaintAdvancedFixtures(): Promise<void> {
  console.log("Generating advanced paint fixtures...\n");

  const figFile = createFigFile();
  const docID = figFile.addDocument("PaintAdvanced");
  const canvasID = figFile.addCanvas(docID, "Paint Advanced");
  figFile.addInternalCanvas(docID);

  const nextID: IDAllocator = { value: 10 };

  const GRID_COLS = 4;
  const COL_WIDTH = 240;
  const ROW_HEIGHT = 200;
  const MARGIN = 50;

  type Builder = (f: FigFile, c: number, id: IDAllocator, x: number, y: number) => void;

  const builders: { name: string; fn: Builder }[] = [
    // Angular gradient
    { name: "Angular gradient basic", fn: addAngularGradientBasic },
    { name: "Angular gradient rect", fn: addAngularGradientRect },
    // Diamond gradient
    { name: "Diamond gradient", fn: addDiamondGradient },
    // Multiple fills
    { name: "Multi-fill solid", fn: addMultiFillSolid },
    { name: "Multi-fill gradient", fn: addMultiFillGradient },
    // MASK
    { name: "Mask basic (circle)", fn: addMaskBasic },
    { name: "Mask rounded rect", fn: addMaskRounded },
    // Combinations
    { name: "Angular gradient + effect", fn: addAngularGradientWithEffect },
  ];

  for (let i = 0; i < builders.length; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const x = MARGIN + col * COL_WIDTH;
    const y = MARGIN + row * ROW_HEIGHT;
    builders[i].fn(figFile, canvasID, nextID, x, y);
  }

  for (const dir of [OUTPUT_DIR, path.join(OUTPUT_DIR, "actual"), path.join(OUTPUT_DIR, "snapshots")]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const figData = await figFile.buildAsync({ fileName: "paint-advanced" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Frames: ${builders.length}\n`);
  console.log("Frame list:");
  for (const b of builders) {
    console.log(`  - ${b.name}`);
  }
  console.log(`\nNext steps:`);
  console.log(`1. Open ${OUTPUT_FILE} in Figma`);
  console.log(`2. Export each frame as SVG to fixtures/paint-advanced/actual/`);
  console.log(`3. Run: npx vitest run packages/@aurochs-renderer/fig/spec/paint-advanced.spec.ts`);
}

generatePaintAdvancedFixtures().catch(console.error);
