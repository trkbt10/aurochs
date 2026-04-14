#!/usr/bin/env bun
/**
 * @file Generate decoration combination fixture .fig file
 *
 * Tests combinations of decorative properties that are individually tested
 * but never tested together. Specifically:
 *
 * Category 1: Gradient + Corner Radius
 * Category 2: Gradient + Effects (shadow, blur)
 * Category 3: Corner Radius + Effects + Fill combos
 * Category 4: Boolean operation with decorated operands
 * Category 5: Instance with decoration overrides/inheritance
 * Category 6: Clipping with decorated content
 * Category 7: Realistic UI patterns (card, button, badge)
 *
 * Usage:
 *   bun packages/@aurochs-renderer/fig/scripts/generate-decoration-combo-fixtures.ts
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
  booleanNode,
  symbolNode,
  instanceNode,
  solidPaint,
  linearGradient,
  radialGradient,
  dropShadow,
  innerShadow,
  layerBlur,
  effects,
  type GradientPaint,
  type EffectData,
} from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/decoration-combo");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "decoration-combo.fig");

// =============================================================================
// Types
// =============================================================================

type Color = { r: number; g: number; b: number; a: number };
type IDAllocator = { value: number };
type FigFile = ReturnType<typeof createFigFile>;

// =============================================================================
// Paint helpers
// =============================================================================

function gradientBlueToGreen(): GradientPaint {
  return linearGradient()
    .stops([
      { position: 0, color: { r: 0.2, g: 0.4, b: 0.9, a: 1 } },
      { position: 1, color: { r: 0.2, g: 0.8, b: 0.5, a: 1 } },
    ])
    .build();
}

function gradientSunset(): GradientPaint {
  return linearGradient()
    .angle(135)
    .stops([
      { position: 0, color: { r: 1.0, g: 0.4, b: 0.3, a: 1 } },
      { position: 0.5, color: { r: 0.9, g: 0.2, b: 0.5, a: 1 } },
      { position: 1, color: { r: 0.5, g: 0.2, b: 0.8, a: 1 } },
    ])
    .build();
}

function gradientRadialGlow(): GradientPaint {
  return radialGradient()
    .stops([
      { position: 0, color: { r: 1.0, g: 1.0, b: 0.8, a: 1 } },
      { position: 1, color: { r: 0.9, g: 0.5, b: 0.1, a: 1 } },
    ])
    .build();
}

function gradientVertical(): GradientPaint {
  return linearGradient()
    .angle(90)
    .stops([
      { position: 0, color: { r: 0.95, g: 0.95, b: 1.0, a: 1 } },
      { position: 1, color: { r: 0.7, g: 0.7, b: 0.9, a: 1 } },
    ])
    .build();
}

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };
const DARK: Color = { r: 0.15, g: 0.15, b: 0.15, a: 1 };
const BLUE: Color = { r: 0.2, g: 0.4, b: 0.9, a: 1 };
const RED: Color = { r: 0.9, g: 0.2, b: 0.2, a: 1 };
const GREEN: Color = { r: 0.2, g: 0.7, b: 0.3, a: 1 };
const LIGHT_GRAY: Color = { r: 0.95, g: 0.95, b: 0.95, a: 1 };

// =============================================================================
// Category 1: Gradient + Corner Radius
// =============================================================================

/**
 * Linear gradient on a rounded rectangle
 */
function addGradientRadius(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("grad-radius-linear")
      .size(180, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(shapeID, frameID)
      .name("rounded-gradient")
      .size(140, 80)
      .position(20, 20)
      .cornerRadius(16)
      .fill(gradientBlueToGreen())
      .build(),
  );
}

/**
 * Radial gradient on a pill-shaped rectangle
 */
function addGradientRadiusPill(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("grad-radius-pill")
      .size(200, 80)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(shapeID, frameID)
      .name("pill-gradient")
      .size(160, 48)
      .position(20, 16)
      .cornerRadius(24)
      .fill(gradientRadialGlow())
      .build(),
  );
}

/**
 * Sunset gradient on a card with moderate radius
 */
function addGradientRadiusCard(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("grad-radius-card")
      .size(200, 140)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(shapeID, frameID)
      .name("card-gradient")
      .size(160, 100)
      .position(20, 20)
      .cornerRadius(12)
      .fill(gradientSunset())
      .build(),
  );
}

// =============================================================================
// Category 2: Gradient + Effects
// =============================================================================

/**
 * Gradient fill + drop shadow
 */
function addGradientDropShadow(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("grad-shadow-drop")
      .size(180, 140)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(shapeID, frameID)
      .name("gradient-shadowed")
      .size(120, 80)
      .position(25, 25)
      .cornerRadius(10)
      .fill(gradientBlueToGreen())
      .effects(effects(
        dropShadow().offset(0, 6).blur(12).color({ r: 0, g: 0, b: 0, a: 0.25 }),
      ))
      .build(),
  );
}

/**
 * Gradient fill + inner shadow
 */
function addGradientInnerShadow(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("grad-shadow-inner")
      .size(180, 140)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(shapeID, frameID)
      .name("gradient-inner-shadow")
      .size(120, 80)
      .position(30, 30)
      .cornerRadius(10)
      .fill(gradientVertical())
      .effects(effects(
        innerShadow().offset(0, 2).blur(6).color({ r: 0, g: 0, b: 0, a: 0.15 }),
      ))
      .build(),
  );
}

/**
 * Gradient fill + multiple effects (drop shadow + inner shadow)
 */
function addGradientMultiEffect(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("grad-multi-effect")
      .size(200, 160)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(shapeID, frameID)
      .name("gradient-multi-fx")
      .size(140, 90)
      .position(30, 35)
      .cornerRadius(14)
      .fill(gradientSunset())
      .effects(effects(
        dropShadow().offset(0, 4).blur(8).color({ r: 0, g: 0, b: 0, a: 0.2 }),
        dropShadow().offset(0, 12).blur(24).color({ r: 0, g: 0, b: 0, a: 0.1 }),
        innerShadow().offset(0, -2).blur(4).color({ r: 1, g: 1, b: 1, a: 0.3 }),
      ))
      .build(),
  );
}

/**
 * Gradient fill + layer blur
 */
function addGradientBlur(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("grad-blur")
      .size(160, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(shapeID, frameID)
      .name("gradient-blur")
      .size(100, 100)
      .position(30, 10)
      .fill(gradientRadialGlow())
      .effects(effects(layerBlur().radius(4)))
      .build(),
  );
}

// =============================================================================
// Category 3: Stroke + Gradient + Radius combos
// =============================================================================

/**
 * Gradient fill + stroke + corner radius
 */
function addGradientStrokeRadius(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("grad-stroke-radius")
      .size(180, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const shapeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(shapeID, frameID)
      .name("grad-stroke-rounded")
      .size(140, 80)
      .position(20, 20)
      .cornerRadius(12)
      .fill(gradientBlueToGreen())
      .stroke(DARK)
      .strokeWeight(2)
      .build(),
  );
}

/**
 * Solid fill + thick stroke + corner radius + drop shadow
 */
function addSolidStrokeRadiusShadow(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("solid-stroke-radius-shadow")
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
      .name("bordered-shadowed")
      .size(120, 80)
      .position(25, 25)
      .cornerRadius(8)
      .fill(WHITE)
      .stroke(BLUE)
      .strokeWeight(2)
      .effects(effects(
        dropShadow().offset(0, 4).blur(10).color({ r: 0, g: 0, b: 0, a: 0.15 }),
      ))
      .build(),
  );
}

// =============================================================================
// Category 4: Boolean operation with decorated operands
// =============================================================================

/**
 * Boolean union with gradient fill on the result
 */
function addBooleanGradient(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("bool-gradient-union")
      .size(200, 150)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("gradient-union")
      .union()
      .size(140, 100)
      .position(30, 25)
      .fill(gradientSunset())
      .build(),
  );

  const rectID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(rectID, boolID)
      .name("base")
      .size(100, 70)
      .position(0, 15)
      .cornerRadius(10)
      .noFill()
      .build(),
  );

  const circleID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(circleID, boolID)
      .name("circle")
      .size(70, 70)
      .position(60, 0)
      .noFill()
      .build(),
  );
}

/**
 * Boolean subtract with gradient + shadow on result
 */
function addBooleanGradientShadow(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("bool-gradient-subtract-shadow")
      .size(200, 160)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("gradient-subtract")
      .subtract()
      .size(120, 90)
      .position(40, 35)
      .fill(gradientBlueToGreen())
      .build(),
  );

  const rectID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(rectID, boolID)
      .name("outer")
      .size(120, 90)
      .position(0, 0)
      .cornerRadius(12)
      .noFill()
      .build(),
  );

  const circleID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(circleID, boolID)
      .name("hole")
      .size(40, 40)
      .position(40, 25)
      .noFill()
      .build(),
  );
}

/**
 * Boolean with rounded rect operands (testing cornerRadius in boolean)
 */
function addBooleanRoundedOperands(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("bool-rounded-operands")
      .size(200, 150)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const boolID = nextID.value++;
  figFile.addBooleanOperation(
    booleanNode(boolID, frameID)
      .name("rounded-subtract")
      .subtract()
      .size(140, 100)
      .position(30, 25)
      .fill(BLUE)
      .build(),
  );

  const outerID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(outerID, boolID)
      .name("outer-rounded")
      .size(140, 100)
      .position(0, 0)
      .cornerRadius(20)
      .noFill()
      .build(),
  );

  const innerID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(innerID, boolID)
      .name("inner-rounded")
      .size(100, 60)
      .position(20, 20)
      .cornerRadius(10)
      .noFill()
      .build(),
  );
}

// =============================================================================
// Category 5: Instance with decoration inheritance
// =============================================================================

/**
 * Symbol with gradient + radius + shadow, then instances that inherit and override
 */
function addInstanceDecorationInherit(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  // Symbol: gradient card with shadow
  const symID = nextID.value++;
  figFile.addSymbol(
    symbolNode(symID, canvasID)
      .name("CardSymbol")
      .size(140, 80)
      .position(frameX - 200, frameY)
      .background(WHITE)
      .cornerRadius(12)
      .exportAsSVG()
      .build(),
  );

  // Child of symbol: gradient background
  const symChildID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(symChildID, symID)
      .name("bg")
      .size(140, 80)
      .position(0, 0)
      .cornerRadius(12)
      .fill(gradientBlueToGreen())
      .effects(effects(
        dropShadow().offset(0, 4).blur(8).color({ r: 0, g: 0, b: 0, a: 0.2 }),
      ))
      .build(),
  );

  // Frame containing instances
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("instance-inherit-decoration")
      .size(360, 120)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Instance 1: default (inherits everything)
  const inst1ID = nextID.value++;
  figFile.addInstance(
    instanceNode(inst1ID, frameID, symID)
      .name("inherited")
      .size(140, 80)
      .position(10, 20)
      .build(),
  );

  // Instance 2: same size
  const inst2ID = nextID.value++;
  figFile.addInstance(
    instanceNode(inst2ID, frameID, symID)
      .name("inherited-2")
      .size(140, 80)
      .position(170, 20)
      .build(),
  );
}

/**
 * Instance that overrides fill to a different gradient
 */
function addInstanceGradientOverride(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  // Symbol: solid blue rect
  const symID = nextID.value++;
  figFile.addSymbol(
    symbolNode(symID, canvasID)
      .name("ButtonSymbol")
      .size(120, 44)
      .position(frameX - 200, frameY + 200)
      .background(BLUE)
      .cornerRadius(8)
      .build(),
  );

  const symChildID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(symChildID, symID)
      .name("btn-bg")
      .size(120, 44)
      .position(0, 0)
      .cornerRadius(8)
      .fill(BLUE)
      .build(),
  );

  // Frame
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("instance-gradient-override")
      .size(300, 100)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Instance 1: default solid
  const inst1ID = nextID.value++;
  figFile.addInstance(
    instanceNode(inst1ID, frameID, symID)
      .name("solid-default")
      .size(120, 44)
      .position(15, 28)
      .build(),
  );

  // Instance 2: override to gradient — set fillPaints override
  const inst2ID = nextID.value++;
  figFile.addInstance(
    instanceNode(inst2ID, frameID, symID)
      .name("gradient-override")
      .size(120, 44)
      .position(160, 28)
      .build(),
  );
}

// =============================================================================
// Category 6: Clipping with decorated content
// =============================================================================

/**
 * Gradient fill inside a rounded clipping frame
 */
function addClipGradient(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("clip-gradient-rounded")
      .size(160, 120)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Inner clipping frame with corner radius
  const clipFrameID = nextID.value++;
  figFile.addFrame(
    frameNode(clipFrameID, frameID)
      .name("clip-frame")
      .size(120, 80)
      .position(20, 20)
      .cornerRadius(16)
      .clipsContent(true)
      .build(),
  );

  // Gradient rect that overflows the clip
  const gradID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(gradID, clipFrameID)
      .name("overflow-gradient")
      .size(160, 120)
      .position(-20, -20)
      .fill(gradientSunset())
      .build(),
  );
}

/**
 * Shadowed shape inside a clip (shadow should be clipped)
 */
function addClipShadow(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("clip-shadow")
      .size(160, 140)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Clip frame
  const clipFrameID = nextID.value++;
  figFile.addFrame(
    frameNode(clipFrameID, frameID)
      .name("clip-boundary")
      .size(120, 100)
      .position(20, 20)
      .clipsContent(true)
      .build(),
  );

  // Shadowed element near the edge — shadow partially clipped
  const shapeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(shapeID, clipFrameID)
      .name("near-edge")
      .size(80, 60)
      .position(30, 30)
      .cornerRadius(8)
      .fill(BLUE)
      .effects(effects(
        dropShadow().offset(0, 8).blur(16).color({ r: 0, g: 0, b: 0, a: 0.3 }),
      ))
      .build(),
  );
}

// =============================================================================
// Category 7: Realistic UI patterns
// =============================================================================

/**
 * Realistic card: gradient + radius + shadow + stroke
 */
function addRealisticCard(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("realistic-card")
      .size(240, 180)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Card body: gradient fill + rounded corners + shadow + subtle border
  const cardID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(cardID, frameID)
      .name("card-body")
      .size(200, 140)
      .position(20, 20)
      .cornerRadius(16)
      .fill(linearGradient().angle(180).stops([
        { position: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
        { position: 1, color: { r: 0.96, g: 0.96, b: 0.98, a: 1 } },
      ]).build())
      .stroke({ r: 0.85, g: 0.85, b: 0.9, a: 1 })
      .strokeWeight(1)
      .effects(effects(
        dropShadow().offset(0, 1).blur(3).color({ r: 0, g: 0, b: 0, a: 0.08 }),
        dropShadow().offset(0, 6).blur(16).color({ r: 0, g: 0, b: 0, a: 0.06 }),
      ))
      .build(),
  );
}

/**
 * Realistic badge: small rounded pill with gradient + shadow
 */
function addRealisticBadge(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("realistic-badge")
      .size(140, 60)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const badgeID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(badgeID, frameID)
      .name("badge")
      .size(100, 32)
      .position(20, 14)
      .cornerRadius(16)
      .fill(linearGradient().stops([
        { position: 0, color: { r: 0.3, g: 0.7, b: 1.0, a: 1 } },
        { position: 1, color: { r: 0.2, g: 0.5, b: 0.9, a: 1 } },
      ]).build())
      .effects(effects(
        dropShadow().offset(0, 2).blur(4).color({ r: 0.2, g: 0.4, b: 0.8, a: 0.3 }),
      ))
      .build(),
  );
}

/**
 * Realistic avatar: circle with image-like gradient + border + shadow
 */
function addRealisticAvatar(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("realistic-avatar")
      .size(120, 120)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  const avatarID = nextID.value++;
  figFile.addEllipse(
    ellipseNode(avatarID, frameID)
      .name("avatar")
      .size(80, 80)
      .position(20, 20)
      .fill(radialGradient().stops([
        { position: 0, color: { r: 0.9, g: 0.7, b: 0.5, a: 1 } },
        { position: 1, color: { r: 0.6, g: 0.3, b: 0.2, a: 1 } },
      ]).build())
      .stroke(WHITE)
      .strokeWeight(3)
      .effects(effects(
        dropShadow().offset(0, 2).blur(6).color({ r: 0, g: 0, b: 0, a: 0.2 }),
      ))
      .build(),
  );
}

/**
 * Ellipse with gradient + opacity (semi-transparent gradient)
 */
function addGradientOpacity(
  figFile: FigFile, canvasID: number, nextID: IDAllocator,
  frameX: number, frameY: number,
): void {
  const frameID = nextID.value++;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("grad-opacity")
      .size(160, 120)
      .position(frameX, frameY)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Background reference shape (solid)
  const bgID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(bgID, frameID)
      .name("bg-solid")
      .size(120, 80)
      .position(20, 20)
      .fill(RED)
      .build(),
  );

  // Overlapping semi-transparent gradient
  const overlayID = nextID.value++;
  figFile.addRoundedRectangle(
    roundedRectNode(overlayID, frameID)
      .name("gradient-overlay")
      .size(100, 60)
      .position(40, 30)
      .cornerRadius(8)
      .fill(gradientBlueToGreen())
      .opacity(0.6)
      .build(),
  );
}

// =============================================================================
// Main
// =============================================================================

async function generateDecorationComboFixtures(): Promise<void> {
  console.log("Generating decoration combination fixtures...\n");

  const figFile = createFigFile();
  const docID = figFile.addDocument("DecorationCombo");
  const canvasID = figFile.addCanvas(docID, "Decoration Combos");
  figFile.addInternalCanvas(docID);

  const nextID: IDAllocator = { value: 10 };

  const GRID_COLS = 4;
  const COL_WIDTH = 280;
  const ROW_HEIGHT = 200;
  const MARGIN = 50;

  type Builder = (f: FigFile, c: number, id: IDAllocator, x: number, y: number) => void;

  const builders: { name: string; fn: Builder }[] = [
    // Category 1: Gradient + Corner Radius
    { name: "Gradient + Linear Radius", fn: addGradientRadius },
    { name: "Gradient + Pill Radius", fn: addGradientRadiusPill },
    { name: "Gradient + Card Radius", fn: addGradientRadiusCard },

    // Category 2: Gradient + Effects
    { name: "Gradient + Drop Shadow", fn: addGradientDropShadow },
    { name: "Gradient + Inner Shadow", fn: addGradientInnerShadow },
    { name: "Gradient + Multi Effects", fn: addGradientMultiEffect },
    { name: "Gradient + Blur", fn: addGradientBlur },

    // Category 3: Stroke + Gradient + Radius combos
    { name: "Gradient + Stroke + Radius", fn: addGradientStrokeRadius },
    { name: "Solid + Stroke + Radius + Shadow", fn: addSolidStrokeRadiusShadow },

    // Category 4: Boolean with decorations
    { name: "Boolean Gradient Union", fn: addBooleanGradient },
    { name: "Boolean Gradient Subtract + Shadow", fn: addBooleanGradientShadow },
    { name: "Boolean Rounded Operands", fn: addBooleanRoundedOperands },

    // Category 5: Instance inheritance
    { name: "Instance Decoration Inherit", fn: addInstanceDecorationInherit },
    { name: "Instance Gradient Override", fn: addInstanceGradientOverride },

    // Category 6: Clipping with decorations
    { name: "Clip + Gradient Rounded", fn: addClipGradient },
    { name: "Clip + Shadow", fn: addClipShadow },

    // Category 7: Realistic UI patterns
    { name: "Realistic Card", fn: addRealisticCard },
    { name: "Realistic Badge", fn: addRealisticBadge },
    { name: "Realistic Avatar", fn: addRealisticAvatar },
    { name: "Gradient + Opacity", fn: addGradientOpacity },
  ];

  for (let i = 0; i < builders.length; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const x = MARGIN + col * COL_WIDTH;
    const y = MARGIN + row * ROW_HEIGHT;
    builders[i].fn(figFile, canvasID, nextID, x, y);
  }

  // Ensure output directories
  for (const dir of [OUTPUT_DIR, path.join(OUTPUT_DIR, "actual"), path.join(OUTPUT_DIR, "snapshots")]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const figData = await figFile.buildAsync({ fileName: "decoration-combo" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Frames: ${builders.length}\n`);
  console.log("Frame list:");
  for (const b of builders) {
    console.log(`  - ${b.name}`);
  }
  console.log(`\nNext steps:`);
  console.log(`1. Open ${OUTPUT_FILE} in Figma`);
  console.log(`2. Export each frame as SVG to fixtures/decoration-combo/actual/`);
  console.log(`3. Run: npx vitest run packages/@aurochs-renderer/fig/spec/decoration-combo.spec.ts`);
}

generateDecorationComboFixtures().catch(console.error);
