#!/usr/bin/env bun
/**
 * @file Generate composite (boolean operation) fixture .fig file
 *
 * Creates a .fig file with various boolean operation test cases to verify
 * that the renderer correctly uses pre-computed geometry from BOOLEAN_OPERATION
 * nodes instead of rendering children individually.
 *
 * Test categories:
 * 1. Basic operations: union, subtract, intersect, exclude with simple shapes
 * 2. Icon patterns: real-world icon-like composites (settings gear, eye, shield, etc.)
 * 3. Nested booleans: boolean operations containing other boolean operations
 * 4. Multi-operand: more than 2 children in a single boolean operation
 * 5. Edge cases: identical shapes, non-overlapping shapes, fully contained shapes
 *
 * Usage:
 *   bun packages/@aurochs-renderer/fig/scripts/generate-composite-fixtures.ts
 *
 * After generation:
 *   1. Open the .fig in Figma
 *   2. Export each frame as SVG to fixtures/composite/actual/
 *   3. Run: npx vitest run packages/@aurochs-renderer/fig/spec/composite.spec.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFigFile,
  frameNode,
  ellipseNode,
  rectNode,
  roundedRectNode,
  booleanNode,
  starNode,
  polygonNode,
} from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/composite");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "composite.fig");

// =============================================================================
// Types
// =============================================================================

type Color = { r: number; g: number; b: number; a: number };

type IDAllocator = { value: number };

// =============================================================================
// Color Helpers
// =============================================================================

const COLORS = {
  blue: { r: 0.2, g: 0.4, b: 0.9, a: 1 } as Color,
  red: { r: 0.9, g: 0.2, b: 0.2, a: 1 } as Color,
  green: { r: 0.2, g: 0.7, b: 0.3, a: 1 } as Color,
  orange: { r: 0.9, g: 0.5, b: 0.1, a: 1 } as Color,
  purple: { r: 0.5, g: 0.2, b: 0.8, a: 1 } as Color,
  teal: { r: 0.1, g: 0.6, b: 0.6, a: 1 } as Color,
  dark: { r: 0.2, g: 0.2, b: 0.2, a: 1 } as Color,
  gray: { r: 0.6, g: 0.6, b: 0.6, a: 1 } as Color,
  white: { r: 1, g: 1, b: 1, a: 1 } as Color,
  bgGray: { r: 0.95, g: 0.95, b: 0.95, a: 1 } as Color,
};

// =============================================================================
// Fixture builders — each function creates one test frame
// =============================================================================

type FigFile = ReturnType<typeof createFigFile>;

/**
 * 1. Basic UNION: rectangle + circle → combined shape
 *
 * Expect: single merged path, not two overlapping shapes
 */
function addBasicUnion(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-union-basic")
      .size(200, 150)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("union")
      .union()
      .size(120, 80)
      .position(40, 35)
      .fill(COLORS.blue)
      .build(),
  );

  // Left rectangle
  const rectID = nextID.value++;
  figFile.addRectangle(
    rectNode(rectID, boolID)
      .name("rect")
      .size(80, 60)
      .position(0, 10)
      .noFill()
      .build(),
  );

  // Right circle overlapping
  const circleID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(circleID, boolID)
      .name("circle")
      .size(60, 60)
      .position(50, 0)
      .noFill()
      .build(),
  );
}

/**
 * 2. Basic SUBTRACT: rectangle − circle → shape with hole
 *
 * Expect: single path with cutout region
 */
function addBasicSubtract(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-subtract-basic")
      .size(200, 150)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("subtract")
      .subtract()
      .size(120, 80)
      .position(40, 35)
      .fill(COLORS.red)
      .build(),
  );

  // Base rectangle
  const rectID = nextID.value++;
  figFile.addRectangle(
    rectNode(rectID, boolID)
      .name("base-rect")
      .size(120, 80)
      .position(0, 0)
      .noFill()
      .build(),
  );

  // Circle to subtract (centered)
  const circleID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(circleID, boolID)
      .name("cut-circle")
      .size(50, 50)
      .position(35, 15)
      .noFill()
      .build(),
  );
}

/**
 * 3. Basic INTERSECT: rectangle ∩ circle → only overlapping area
 */
function addBasicIntersect(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-intersect-basic")
      .size(200, 150)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("intersect")
      .intersect()
      .size(120, 80)
      .position(40, 35)
      .fill(COLORS.green)
      .build(),
  );

  const rectID = nextID.value++;
  figFile.addRectangle(
    rectNode(rectID, boolID)
      .name("rect")
      .size(80, 80)
      .position(0, 0)
      .noFill()
      .build(),
  );

  const circleID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(circleID, boolID)
      .name("circle")
      .size(80, 80)
      .position(40, 0)
      .noFill()
      .build(),
  );
}

/**
 * 4. Basic EXCLUDE: rectangle ⊕ circle → non-overlapping areas only
 */
function addBasicExclude(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-exclude-basic")
      .size(200, 150)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("exclude")
      .exclude()
      .size(120, 80)
      .position(40, 35)
      .fill(COLORS.orange)
      .build(),
  );

  const rectID = nextID.value++;
  figFile.addRectangle(
    rectNode(rectID, boolID)
      .name("rect")
      .size(80, 80)
      .position(0, 0)
      .noFill()
      .build(),
  );

  const circleID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(circleID, boolID)
      .name("circle")
      .size(80, 80)
      .position(40, 0)
      .noFill()
      .build(),
  );
}

/**
 * 5. Icon: Settings gear — circle with inner circle subtracted,
 *    representing a simplified gear/cog icon.
 *
 *    Large circle − small center circle = ring (donut)
 */
function addIconGear(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-icon-gear")
      .size(120, 120)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Outer subtract: star - center circle = gear shape
  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("gear")
      .subtract()
      .size(80, 80)
      .position(20, 20)
      .fill(COLORS.dark)
      .build(),
  );

  // Outer star (gear teeth)
  const starID = nextID.value++;
  figFile.addStar(
    starNode(starID, boolID)
      .name("gear-body")
      .size(80, 80)
      .position(0, 0)
      .points(8)
      .innerRadius(0.7)
      .noFill()
      .build(),
  );

  // Inner circle (hollow center)
  const innerID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(innerID, boolID)
      .name("gear-hole")
      .size(30, 30)
      .position(25, 25)
      .noFill()
      .build(),
  );
}

/**
 * 6. Icon: Eye — two overlapping ellipses intersected, with pupil subtracted.
 *    Uses nested boolean: intersect(2 ellipses) then subtract(circle)
 *
 *    Here we flatten it: 3 operands in one subtract.
 *    outer-ellipse shapes the eye, inner small circle is the pupil hole.
 */
function addIconEye(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-icon-eye")
      .size(160, 100)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Eye shape: intersect two ellipses to form almond shape
  const eyeShapeID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(eyeShapeID, frameID)
      .name("eye-shape")
      .intersect()
      .size(120, 60)
      .position(20, 20)
      .fill(COLORS.teal)
      .build(),
  );

  // Upper ellipse
  const upperID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(upperID, eyeShapeID)
      .name("upper-lid")
      .size(120, 80)
      .position(0, -10)
      .noFill()
      .build(),
  );

  // Lower ellipse
  const lowerID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(lowerID, eyeShapeID)
      .name("lower-lid")
      .size(120, 80)
      .position(0, -10)
      .noFill()
      .build(),
  );
}

/**
 * 7. Icon: Shield — rounded rect with triangle union on top, and inner
 *    shape subtracted for hollow effect.
 *
 *    Simplified: large rounded rect + small rect subtracted from center
 */
function addIconShield(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-icon-shield")
      .size(120, 140)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("shield")
      .subtract()
      .size(80, 100)
      .position(20, 20)
      .fill(COLORS.blue)
      .build(),
  );

  // Outer shield body (rounded rect)
  const outerID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(outerID, boolID)
      .name("shield-body")
      .size(80, 100)
      .position(0, 0)
      .cornerRadius(10)
      .noFill()
      .build(),
  );

  // Inner cutout (smaller rounded rect)
  const innerID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(innerID, boolID)
      .name("shield-cutout")
      .size(60, 80)
      .position(10, 10)
      .cornerRadius(6)
      .noFill()
      .build(),
  );
}

/**
 * 8. Multi-operand UNION: 4 overlapping circles → flower/clover pattern
 *
 * Tests that multi-child boolean operations are merged correctly.
 */
function addMultiOperandUnion(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-multi-union")
      .size(160, 160)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("clover")
      .union()
      .size(100, 100)
      .position(30, 30)
      .fill(COLORS.green)
      .build(),
  );

  // 4 circles in a clover pattern
  const positions = [
    { x: 20, y: 0 },  // top
    { x: 20, y: 40 }, // bottom
    { x: 0, y: 20 },  // left
    { x: 40, y: 20 }, // right
  ];
  for (let i = 0; i < positions.length; i++) {
    const circleID = nextID.value++;
    figFile.addEllipse(
      ellipseNode(circleID, boolID)
        .name(`petal-${i}`)
        .size(60, 60)
        .position(positions[i].x, positions[i].y)
        .noFill()
        .build(),
    );
  }
}

/**
 * 9. Nested boolean: (rect ∪ circle) − smallCircle
 *
 * BOOLEAN_OPERATION containing another BOOLEAN_OPERATION as child.
 * This tests that nested composite shapes are handled correctly.
 */
function addNestedBoolean(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-nested")
      .size(200, 150)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Outer: subtract
  const outerBoolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(outerBoolID, frameID)
      .name("outer-subtract")
      .subtract()
      .size(140, 100)
      .position(30, 25)
      .fill(COLORS.purple)
      .build(),
  );

  // Inner: union (first operand of subtract)
  const innerBoolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(innerBoolID, outerBoolID)
      .name("inner-union")
      .union()
      .size(140, 100)
      .position(0, 0)
      .build(),
  );

  // Rect in inner union
  const rectID = nextID.value++;
  figFile.addRectangle(
    rectNode(rectID, innerBoolID)
      .name("rect")
      .size(100, 70)
      .position(0, 15)
      .noFill()
      .build(),
  );

  // Circle in inner union
  const circleID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(circleID, innerBoolID)
      .name("circle")
      .size(70, 70)
      .position(70, 0)
      .noFill()
      .build(),
  );

  // Small circle to subtract (second operand of outer subtract)
  const cutoutID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(cutoutID, outerBoolID)
      .name("cutout")
      .size(40, 40)
      .position(50, 30)
      .noFill()
      .build(),
  );
}

/**
 * 10. Non-overlapping subtract: two shapes that don't overlap.
 *
 * When shapes don't overlap, subtract should leave the first shape intact.
 * This is an edge case that verifies the renderer doesn't just render children.
 */
function addNonOverlapping(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-non-overlapping")
      .size(200, 100)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("subtract-no-overlap")
      .subtract()
      .size(170, 60)
      .position(15, 20)
      .fill(COLORS.gray)
      .build(),
  );

  // Left rectangle
  const rectID = nextID.value++;
  figFile.addRectangle(
    rectNode(rectID, boolID)
      .name("left-rect")
      .size(60, 60)
      .position(0, 0)
      .noFill()
      .build(),
  );

  // Right circle (no overlap with rect)
  const circleID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(circleID, boolID)
      .name("right-circle")
      .size(60, 60)
      .position(110, 0)
      .noFill()
      .build(),
  );
}

/**
 * 11. Fully contained subtract: small rect inside large rect.
 *
 * Result should be the large rect with a rectangular hole in the center.
 * Classic "picture frame" pattern.
 */
function addFullyContained(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-fully-contained")
      .size(160, 120)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("picture-frame")
      .subtract()
      .size(120, 80)
      .position(20, 20)
      .fill(COLORS.dark)
      .build(),
  );

  // Outer rect
  const outerID = nextID.value++;
  figFile.addRectangle(
    rectNode(outerID, boolID)
      .name("outer")
      .size(120, 80)
      .position(0, 0)
      .noFill()
      .build(),
  );

  // Inner rect (fully contained)
  const innerID = nextID.value++;
  figFile.addRectangle(
    rectNode(innerID, boolID)
      .name("inner")
      .size(80, 40)
      .position(20, 20)
      .noFill()
      .build(),
  );
}

/**
 * 12. Icon: Play button — triangle inside circle (intersect to clip triangle)
 *    Or: circle with triangle subtract → pause-like
 *    Here: union of circle and nothing = just the circle for sanity,
 *    but we do subtract of rounded-rect - triangle = play button cutout
 */
function addIconPlayButton(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-icon-play")
      .size(120, 120)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("play-btn")
      .subtract()
      .size(80, 80)
      .position(20, 20)
      .fill(COLORS.red)
      .build(),
  );

  // Circle body
  const circleID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(circleID, boolID)
      .name("circle")
      .size(80, 80)
      .position(0, 0)
      .noFill()
      .build(),
  );

  // Triangle cutout (play icon)
  const triID = nextID.value++;
  figFile.addPolygon(
    polygonNode(triID, boolID)
      .name("triangle")
      .size(30, 34)
      .position(30, 23)
      .sides(3)
      .noFill()
      .build(),
  );
}

/**
 * 13. Multiple separate booleans in one frame.
 *
 * Tests that multiple independent boolean operations coexist correctly.
 */
function addMultipleBooleans(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-multiple")
      .size(300, 120)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Boolean 1: union (left)
  const bool1ID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(bool1ID, frameID)
      .name("union-part")
      .union()
      .size(80, 80)
      .position(10, 20)
      .fill(COLORS.blue)
      .build(),
  );

  const r1 = nextID.value++;
  figFile.addRectangle(rectNode(r1, bool1ID).name("r1").size(50, 50).position(0, 15).noFill().build());
  const c1 = nextID.value++;
  figFile.addEllipse(ellipseNode(c1, bool1ID).name("c1").size(50, 50).position(30, 0).noFill().build());

  // Boolean 2: subtract (center)
  const bool2ID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(bool2ID, frameID)
      .name("subtract-part")
      .subtract()
      .size(80, 80)
      .position(110, 20)
      .fill(COLORS.red)
      .build(),
  );

  const r2 = nextID.value++;
  figFile.addRectangle(rectNode(r2, bool2ID).name("r2").size(60, 60).position(10, 10).noFill().build());
  const c2 = nextID.value++;
  figFile.addEllipse(ellipseNode(c2, bool2ID).name("c2").size(40, 40).position(20, 20).noFill().build());

  // Boolean 3: exclude (right)
  const bool3ID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(bool3ID, frameID)
      .name("exclude-part")
      .exclude()
      .size(80, 80)
      .position(210, 20)
      .fill(COLORS.green)
      .build(),
  );

  const r3 = nextID.value++;
  figFile.addRectangle(rectNode(r3, bool3ID).name("r3").size(50, 60).position(0, 10).noFill().build());
  const c3 = nextID.value++;
  figFile.addEllipse(ellipseNode(c3, bool3ID).name("c3").size(50, 50).position(30, 15).noFill().build());
}

/**
 * 14. Boolean with opacity on the boolean node itself.
 *
 * Tests that opacity is applied to the merged result, not per-child.
 */
function addBooleanWithOpacity(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-opacity")
      .size(200, 150)
      .position(frameX, frameY)
      .background(COLORS.bgGray)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("semi-transparent-union")
      .union()
      .size(120, 80)
      .position(40, 35)
      .fill(COLORS.dark)
      .opacity(0.5)
      .build(),
  );

  const rectID = nextID.value++;
  figFile.addRectangle(
    rectNode(rectID, boolID)
      .name("rect")
      .size(80, 60)
      .position(0, 10)
      .noFill()
      .build(),
  );

  const circleID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(circleID, boolID)
      .name("circle")
      .size(60, 60)
      .position(50, 0)
      .noFill()
      .build(),
  );
}

/**
 * 15. Icon: Notification bell — multiple subtracts to create bell shape with clapper
 */
function addIconBell(
  figFile: FigFile,
  canvasID: number,
  nextID: IDAllocator,
  frameX: number,
  frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("composite-icon-bell")
      .size(120, 140)
      .position(frameX, frameY)
      .background(COLORS.white)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Bell: union of rounded rect (body) + small circle (clapper at bottom)
  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("bell")
      .union()
      .size(80, 100)
      .position(20, 15)
      .fill(COLORS.orange)
      .build(),
  );

  // Bell body (rounded rect)
  const bodyID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(bodyID, boolID)
      .name("bell-body")
      .size(60, 70)
      .position(10, 0)
      .cornerRadius(20)
      .noFill()
      .build(),
  );

  // Bottom rect (brim)
  const brimID = nextID.value++;
  figFile.addRectangle(
    rectNode(brimID, boolID)
      .name("bell-brim")
      .size(80, 10)
      .position(0, 65)
      .noFill()
      .build(),
  );

  // Clapper (small circle)
  const clapperID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(clapperID, boolID)
      .name("clapper")
      .size(20, 20)
      .position(30, 80)
      .noFill()
      .build(),
  );
}

// =============================================================================
// Main
// =============================================================================

async function generateCompositeFixtures(): Promise<void> {
  console.log("Generating composite (boolean operation) fixtures...\n");

  const figFile = createFigFile();
  const docID = figFile.addDocument("Composite");
  const canvasID = figFile.addCanvas(docID, "Composite Canvas");
  figFile.addInternalCanvas(docID);

  const nextID: IDAllocator = { value: 10 };

  // Layout: grid of test frames
  const GRID_COLS = 4;
  const COL_WIDTH = 320;
  const ROW_HEIGHT = 180;
  const MARGIN = 50;

  type FrameBuilder = (
    figFile: FigFile,
    canvasID: number,
    nextID: IDAllocator,
    x: number,
    y: number,
  ) => void;

  const builders: { name: string; fn: FrameBuilder }[] = [
    { name: "Basic UNION", fn: addBasicUnion },
    { name: "Basic SUBTRACT", fn: addBasicSubtract },
    { name: "Basic INTERSECT", fn: addBasicIntersect },
    { name: "Basic EXCLUDE", fn: addBasicExclude },
    { name: "Icon: Gear", fn: addIconGear },
    { name: "Icon: Eye", fn: addIconEye },
    { name: "Icon: Shield", fn: addIconShield },
    { name: "Multi-operand UNION", fn: addMultiOperandUnion },
    { name: "Nested boolean", fn: addNestedBoolean },
    { name: "Non-overlapping", fn: addNonOverlapping },
    { name: "Fully contained", fn: addFullyContained },
    { name: "Icon: Play button", fn: addIconPlayButton },
    { name: "Multiple booleans", fn: addMultipleBooleans },
    { name: "Boolean with opacity", fn: addBooleanWithOpacity },
    { name: "Icon: Bell", fn: addIconBell },
  ];

  for (let i = 0; i < builders.length; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const x = MARGIN + col * COL_WIDTH;
    const y = MARGIN + row * ROW_HEIGHT;
    builders[i].fn(figFile, canvasID, nextID, x, y);
  }

  // Ensure output directories exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const actualDir = path.join(OUTPUT_DIR, "actual");
  if (!fs.existsSync(actualDir)) {
    fs.mkdirSync(actualDir, { recursive: true });
  }
  const snapshotsDir = path.join(OUTPUT_DIR, "snapshots");
  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
  }

  // Build and write .fig file
  const figData = await figFile.buildAsync({ fileName: "composite" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Frames: ${builders.length}\n`);
  console.log("Frame list:");
  for (const b of builders) {
    console.log(`  - ${b.name}`);
  }
  console.log(`\nNext steps:`);
  console.log(`1. Open ${OUTPUT_FILE} in Figma`);
  console.log(`2. Export each frame as SVG to ${actualDir}/`);
  console.log(`3. Run: npx vitest run packages/@aurochs-renderer/fig/spec/composite.spec.ts`);
}

generateCompositeFixtures().catch(console.error);
