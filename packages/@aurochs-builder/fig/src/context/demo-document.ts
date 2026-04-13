/**
 * @file Demo .fig document builder
 *
 * Builds a rich demo FigDesignDocument that showcases the fig renderer's
 * capabilities. Uses the fig file builder to generate a proper .fig binary,
 * then parses it back into a FigDesignDocument.
 *
 * Demonstrates:
 * - Multiple artboards (pages)
 * - Component (SYMBOL) definitions and INSTANCE inheritance
 * - Shapes: rectangle, ellipse, star, polygon, line
 * - Text: centering, multi-line, varied fonts and sizes
 * - Effects: drop shadow, inner shadow, layer blur
 * - Fills: solid colors, linear/radial gradients
 * - Strokes: solid, dashed
 */

import {
  createFigFile,
  frameNode,
  roundedRectNode,
  ellipseNode,
  starNode,
  polygonNode,
  lineNode,
  textNode,
  symbolNode,
  instanceNode,
  dropShadow,
  innerShadow,
  layerBlur,
  effects,
  linearGradient,
  radialGradient,
} from "@aurochs/fig/builder";
import type { FigDesignDocument } from "../types/document";
import { createFigDesignDocument } from "./fig-context";

// =============================================================================
// Color Palette
// =============================================================================

const BLUE = { r: 0.24, g: 0.47, b: 0.85, a: 1 };
const RED = { r: 0.90, g: 0.25, b: 0.25, a: 1 };
const GREEN = { r: 0.22, g: 0.72, b: 0.45, a: 1 };
const ORANGE = { r: 0.95, g: 0.55, b: 0.15, a: 1 };
const PURPLE = { r: 0.55, g: 0.30, b: 0.85, a: 1 };
const DARK = { r: 0.15, g: 0.15, b: 0.20, a: 1 };
const GRAY = { r: 0.55, g: 0.55, b: 0.60, a: 1 };
const LIGHT_GRAY = { r: 0.92, g: 0.92, b: 0.93, a: 1 };
const WHITE = { r: 1, g: 1, b: 1, a: 1 };

// =============================================================================
// ID Counter
// =============================================================================

function createIDCounter(start = 10): { next(): number } {
  const ref = { value: start };
  return { next: () => ref.value++ };
}

// =============================================================================
// Page 1: Shapes & Fills
// =============================================================================

function buildShapesPage(
  figFile: ReturnType<typeof createFigFile>,
  docID: number,
  id: ReturnType<typeof createIDCounter>,
) {
  const canvasID = figFile.addCanvas(docID, "Shapes & Fills");

  // --- Artboard: Basic Shapes ---
  const shapesFrameID = id.next();
  figFile.addFrame(
    frameNode(shapesFrameID, canvasID)
      .name("Basic Shapes")
      .size(480, 320)
      .position(0, 0)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  // Title
  figFile.addTextNode(
    textNode(id.next(), shapesFrameID)
      .name("title")
      .text("Basic Shapes")
      .font("Inter", "Bold")
      .fontSize(20)
      .color(DARK)
      .size(200, 28)
      .position(24, 20)
      .build(),
  );

  // Rectangle
  figFile.addRoundedRectangle(
    roundedRectNode(id.next(), shapesFrameID)
      .name("Rectangle")
      .size(80, 80)
      .position(24, 68)
      .fill(BLUE)
      .cornerRadius(8)
      .build(),
  );

  // Ellipse
  figFile.addEllipse(
    ellipseNode(id.next(), shapesFrameID)
      .name("Ellipse")
      .size(80, 80)
      .position(128, 68)
      .fill(RED)
      .build(),
  );

  // Star
  figFile.addStar(
    starNode(id.next(), shapesFrameID)
      .name("Star")
      .size(80, 80)
      .position(232, 68)
      .fill(ORANGE)
      .build(),
  );

  // Polygon (hexagon)
  figFile.addPolygon(
    polygonNode(id.next(), shapesFrameID)
      .name("Hexagon")
      .size(80, 80)
      .position(336, 68)
      .fill(GREEN)
      .build(),
  );

  // Stroked shapes row
  figFile.addTextNode(
    textNode(id.next(), shapesFrameID)
      .name("subtitle-strokes")
      .text("Strokes")
      .font("Inter", "Medium")
      .fontSize(14)
      .color(GRAY)
      .size(100, 20)
      .position(24, 170)
      .build(),
  );

  // Dashed rectangle
  figFile.addRoundedRectangle(
    roundedRectNode(id.next(), shapesFrameID)
      .name("Dashed Rect")
      .size(80, 80)
      .position(24, 200)
      .noFill()
      .stroke(BLUE)
      .strokeWeight(2)
      .dashPattern([8, 4])
      .cornerRadius(4)
      .build(),
  );

  // Stroke circle
  figFile.addEllipse(
    ellipseNode(id.next(), shapesFrameID)
      .name("Stroke Circle")
      .size(80, 80)
      .position(128, 200)
      .noFill()
      .stroke(RED)
      .strokeWeight(3)
      .build(),
  );

  // Line
  figFile.addLine(
    lineNode(id.next(), shapesFrameID)
      .name("Line")
      .size(80, 0)
      .position(232, 240)
      .stroke(DARK)
      .strokeWeight(2)
      .strokeCap("ROUND")
      .build(),
  );

  // --- Artboard: Gradient Fills ---
  const gradientFrameID = id.next();
  figFile.addFrame(
    frameNode(gradientFrameID, canvasID)
      .name("Gradients")
      .size(480, 200)
      .position(520, 0)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  figFile.addTextNode(
    textNode(id.next(), gradientFrameID)
      .name("title")
      .text("Gradient Fills")
      .font("Inter", "Bold")
      .fontSize(20)
      .color(DARK)
      .size(200, 28)
      .position(24, 20)
      .build(),
  );

  // Linear gradient rect
  const linearGrad = linearGradient()
    .angle(135)
    .stops([
      { color: BLUE, position: 0 },
      { color: PURPLE, position: 1 },
    ])
    .build();

  figFile.addRoundedRectangle(
    roundedRectNode(id.next(), gradientFrameID)
      .name("Linear Gradient")
      .size(120, 80)
      .position(24, 68)
      .fill(linearGrad)
      .cornerRadius(12)
      .build(),
  );

  // Radial gradient ellipse
  const radialGrad = radialGradient()
    .stops([
      { color: ORANGE, position: 0 },
      { color: RED, position: 1 },
    ])
    .build();

  figFile.addEllipse(
    ellipseNode(id.next(), gradientFrameID)
      .name("Radial Gradient")
      .size(100, 100)
      .position(168, 58)
      .fill(radialGrad)
      .build(),
  );

  // Multi-stop gradient
  const multiGrad = linearGradient()
    .angle(90)
    .stops([
      { color: RED, position: 0 },
      { color: ORANGE, position: 0.33 },
      { color: GREEN, position: 0.66 },
      { color: BLUE, position: 1 },
    ])
    .build();

  figFile.addRoundedRectangle(
    roundedRectNode(id.next(), gradientFrameID)
      .name("Multi-stop")
      .size(140, 80)
      .position(296, 68)
      .fill(multiGrad)
      .cornerRadius(12)
      .build(),
  );
}

// =============================================================================
// Page 2: Typography
// =============================================================================

function buildTypographyPage(
  figFile: ReturnType<typeof createFigFile>,
  docID: number,
  id: ReturnType<typeof createIDCounter>,
) {
  const canvasID = figFile.addCanvas(docID, "Typography");

  // --- Artboard: Text Alignment ---
  const alignFrameID = id.next();
  figFile.addFrame(
    frameNode(alignFrameID, canvasID)
      .name("Text Alignment")
      .size(480, 320)
      .position(0, 0)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  figFile.addTextNode(
    textNode(id.next(), alignFrameID)
      .name("title")
      .text("Text Alignment")
      .font("Inter", "Bold")
      .fontSize(20)
      .color(DARK)
      .size(200, 28)
      .position(24, 20)
      .build(),
  );

  // Left aligned
  figFile.addTextNode(
    textNode(id.next(), alignFrameID)
      .name("left-align")
      .text("Left aligned text\nwith two lines")
      .font("Inter", "Regular")
      .fontSize(14)
      .color(DARK)
      .size(180, 44)
      .position(24, 68)
      .alignHorizontal("LEFT")
      .alignVertical("TOP")
      .autoResize("NONE")
      .build(),
  );

  // Center aligned
  figFile.addTextNode(
    textNode(id.next(), alignFrameID)
      .name("center-align")
      .text("Center aligned text\nwith two lines")
      .font("Inter", "Regular")
      .fontSize(14)
      .color(DARK)
      .size(180, 44)
      .position(24, 128)
      .alignHorizontal("CENTER")
      .alignVertical("TOP")
      .autoResize("NONE")
      .build(),
  );

  // Right aligned
  figFile.addTextNode(
    textNode(id.next(), alignFrameID)
      .name("right-align")
      .text("Right aligned text\nwith two lines")
      .font("Inter", "Regular")
      .fontSize(14)
      .color(DARK)
      .size(180, 44)
      .position(24, 188)
      .alignHorizontal("RIGHT")
      .alignVertical("TOP")
      .autoResize("NONE")
      .build(),
  );

  // Vertical top
  figFile.addRoundedRectangle(
    roundedRectNode(id.next(), alignFrameID)
      .name("vtop-bg")
      .size(180, 80)
      .position(260, 20)
      .fill(LIGHT_GRAY)
      .cornerRadius(8)
      .build(),
  );
  figFile.addTextNode(
    textNode(id.next(), alignFrameID)
      .name("vtop-text")
      .text("Vertical top\nalignment")
      .font("Inter", "Regular")
      .fontSize(14)
      .color(DARK)
      .size(180, 80)
      .position(260, 20)
      .alignHorizontal("CENTER")
      .alignVertical("TOP")
      .autoResize("NONE")
      .build(),
  );

  // Vertical center
  figFile.addRoundedRectangle(
    roundedRectNode(id.next(), alignFrameID)
      .name("vcenter-bg")
      .size(180, 80)
      .position(260, 116)
      .fill(LIGHT_GRAY)
      .cornerRadius(8)
      .build(),
  );
  figFile.addTextNode(
    textNode(id.next(), alignFrameID)
      .name("vcenter-text")
      .text("Vertical center\nalignment")
      .font("Inter", "Regular")
      .fontSize(14)
      .color(DARK)
      .size(180, 80)
      .position(260, 116)
      .alignHorizontal("CENTER")
      .alignVertical("CENTER")
      .autoResize("NONE")
      .build(),
  );

  // Vertical bottom
  figFile.addRoundedRectangle(
    roundedRectNode(id.next(), alignFrameID)
      .name("vbottom-bg")
      .size(180, 80)
      .position(260, 212)
      .fill(LIGHT_GRAY)
      .cornerRadius(8)
      .build(),
  );
  figFile.addTextNode(
    textNode(id.next(), alignFrameID)
      .name("vbottom-text")
      .text("Vertical bottom\nalignment")
      .font("Inter", "Regular")
      .fontSize(14)
      .color(DARK)
      .size(180, 80)
      .position(260, 212)
      .alignHorizontal("CENTER")
      .alignVertical("BOTTOM")
      .autoResize("NONE")
      .build(),
  );

  // --- Artboard: Font Styles ---
  const fontFrameID = id.next();
  figFile.addFrame(
    frameNode(fontFrameID, canvasID)
      .name("Font Styles")
      .size(480, 360)
      .position(520, 0)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  figFile.addTextNode(
    textNode(id.next(), fontFrameID)
      .name("title")
      .text("Font Styles & Sizes")
      .font("Inter", "Bold")
      .fontSize(20)
      .color(DARK)
      .size(240, 28)
      .position(24, 20)
      .build(),
  );

  // Size hierarchy
  const sizes = [
    { label: "Heading 1", size: 32, weight: "Bold" as const },
    { label: "Heading 2", size: 24, weight: "SemiBold" as const },
    { label: "Heading 3", size: 18, weight: "Medium" as const },
    { label: "Body text — Regular weight, comfortable for reading", size: 14, weight: "Regular" as const },
    { label: "Caption — Smaller text for labels and annotations", size: 12, weight: "Regular" as const },
  ];

  let yPos = 64;
  for (const entry of sizes) {
    figFile.addTextNode(
      textNode(id.next(), fontFrameID)
        .name(entry.label)
        .text(entry.label)
        .font("Inter", entry.weight)
        .fontSize(entry.size)
        .color(DARK)
        .size(440, entry.size + 12)
        .position(24, yPos)
        .build(),
    );
    yPos += entry.size + 20;
  }

  // Multi-line paragraph
  figFile.addTextNode(
    textNode(id.next(), fontFrameID)
      .name("paragraph")
      .text(
        "This is a longer paragraph of text that demonstrates how multi-line " +
        "text wrapping works in Figma files. The text box has a fixed width " +
        "and the content flows naturally within the bounds.",
      )
      .font("Inter", "Regular")
      .fontSize(13)
      .color(GRAY)
      .size(440, 60)
      .position(24, yPos + 8)
      .alignHorizontal("LEFT")
      .autoResize("HEIGHT")
      .lineHeight(150, "PERCENT")
      .build(),
  );
}

// =============================================================================
// Page 3: Components & Effects
// =============================================================================

function buildComponentsPage(
  figFile: ReturnType<typeof createFigFile>,
  docID: number,
  id: ReturnType<typeof createIDCounter>,
) {
  const canvasID = figFile.addCanvas(docID, "Components & Effects");

  // =========================================================================
  // Symbol: Button Component
  // =========================================================================
  const btnSymbolID = id.next();
  figFile.addSymbol(
    symbolNode(btnSymbolID, canvasID)
      .name("Button")
      .size(140, 44)
      .position(0, -120)
      .background(BLUE)
      .cornerRadius(8)
      .autoLayout("HORIZONTAL")
      .gap(8)
      .padding({ top: 10, right: 20, bottom: 10, left: 20 })
      .primaryAlign("CENTER")
      .counterAlign("CENTER")
      .exportAsSVG()
      .build(),
  );

  // No separate bg rectangle — the SYMBOL frame itself provides the
  // background via .background(BLUE). This way overrideBackground()
  // on INSTANCE nodes directly changes the visible background color.

  figFile.addTextNode(
    textNode(id.next(), btnSymbolID)
      .name("label")
      .text("Button")
      .font("Inter", "SemiBold")
      .fontSize(14)
      .color(WHITE)
      .size(56, 20)
      .position(42, 12)
      .alignHorizontal("CENTER")
      .build(),
  );

  // =========================================================================
  // Symbol: Card Component
  // =========================================================================
  const cardSymbolID = id.next();
  figFile.addSymbol(
    symbolNode(cardSymbolID, canvasID)
      .name("Card")
      .size(240, 160)
      .position(200, -200)
      .background(WHITE)
      .cornerRadius(12)
      .autoLayout("VERTICAL")
      .gap(8)
      .padding(16)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  figFile.addTextNode(
    textNode(id.next(), cardSymbolID)
      .name("heading")
      .text("Card Title")
      .font("Inter", "SemiBold")
      .fontSize(16)
      .color(DARK)
      .size(208, 22)
      .position(16, 16)
      .build(),
  );

  figFile.addTextNode(
    textNode(id.next(), cardSymbolID)
      .name("body")
      .text("Card body text that describes the content. Can span multiple lines.")
      .font("Inter", "Regular")
      .fontSize(13)
      .color(GRAY)
      .size(208, 40)
      .position(16, 46)
      .autoResize("HEIGHT")
      .lineHeight(140, "PERCENT")
      .build(),
  );

  figFile.addRoundedRectangle(
    roundedRectNode(id.next(), cardSymbolID)
      .name("accent-bar")
      .size(208, 4)
      .position(16, 140)
      .fill(BLUE)
      .cornerRadius(2)
      .build(),
  );

  // =========================================================================
  // Artboard: Component Instances
  // =========================================================================
  const compFrameID = id.next();
  figFile.addFrame(
    frameNode(compFrameID, canvasID)
      .name("Component Instances")
      .size(560, 360)
      .position(0, 0)
      .background(LIGHT_GRAY)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  figFile.addTextNode(
    textNode(id.next(), compFrameID)
      .name("title")
      .text("Component Instances")
      .font("Inter", "Bold")
      .fontSize(20)
      .color(DARK)
      .size(280, 28)
      .position(24, 20)
      .build(),
  );

  // Button instances row
  figFile.addTextNode(
    textNode(id.next(), compFrameID)
      .name("btn-label")
      .text("Button variants")
      .font("Inter", "Medium")
      .fontSize(12)
      .color(GRAY)
      .size(120, 16)
      .position(24, 64)
      .build(),
  );

  // Default button
  figFile.addInstance(
    instanceNode(id.next(), compFrameID, btnSymbolID)
      .name("Default")
      .size(140, 44)
      .position(24, 88)
      .build(),
  );

  // Red button (override)
  figFile.addInstance(
    instanceNode(id.next(), compFrameID, btnSymbolID)
      .name("Danger")
      .size(140, 44)
      .position(184, 88)
      .overrideBackground(RED)
      .build(),
  );

  // Green button (override)
  figFile.addInstance(
    instanceNode(id.next(), compFrameID, btnSymbolID)
      .name("Success")
      .size(140, 44)
      .position(344, 88)
      .overrideBackground(GREEN)
      .build(),
  );

  // Card instances
  figFile.addTextNode(
    textNode(id.next(), compFrameID)
      .name("card-label")
      .text("Card instances")
      .font("Inter", "Medium")
      .fontSize(12)
      .color(GRAY)
      .size(120, 16)
      .position(24, 152)
      .build(),
  );

  figFile.addInstance(
    instanceNode(id.next(), compFrameID, cardSymbolID)
      .name("Card 1")
      .size(240, 160)
      .position(24, 176)
      .build(),
  );

  figFile.addInstance(
    instanceNode(id.next(), compFrameID, cardSymbolID)
      .name("Card 2")
      .size(240, 160)
      .position(288, 176)
      .overrideBackground({ r: 0.95, g: 0.97, b: 1.0, a: 1 }) // light blue tint
      .build(),
  );

  // =========================================================================
  // Artboard: Effects
  // =========================================================================
  const effectFrameID = id.next();
  figFile.addFrame(
    frameNode(effectFrameID, canvasID)
      .name("Effects")
      .size(560, 300)
      .position(600, 0)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );

  figFile.addTextNode(
    textNode(id.next(), effectFrameID)
      .name("title")
      .text("Effects")
      .font("Inter", "Bold")
      .fontSize(20)
      .color(DARK)
      .size(200, 28)
      .position(24, 20)
      .build(),
  );

  // Drop shadow
  figFile.addRoundedRectangle(
    roundedRectNode(id.next(), effectFrameID)
      .name("Drop Shadow")
      .size(120, 80)
      .position(24, 72)
      .fill(WHITE)
      .cornerRadius(12)
      .effects(effects(dropShadow().offset(0, 4).blur(12).color({ r: 0, g: 0, b: 0, a: 0.15 })))
      .build(),
  );
  figFile.addTextNode(
    textNode(id.next(), effectFrameID)
      .name("shadow-label")
      .text("Drop Shadow")
      .font("Inter", "Regular")
      .fontSize(11)
      .color(GRAY)
      .size(120, 16)
      .position(24, 160)
      .alignHorizontal("CENTER")
      .build(),
  );

  // Inner shadow
  figFile.addRoundedRectangle(
    roundedRectNode(id.next(), effectFrameID)
      .name("Inner Shadow")
      .size(120, 80)
      .position(168, 72)
      .fill(LIGHT_GRAY)
      .cornerRadius(12)
      .effects(effects(innerShadow().offset(0, 4).blur(8).color({ r: 0, g: 0, b: 0, a: 0.2 })))
      .build(),
  );
  figFile.addTextNode(
    textNode(id.next(), effectFrameID)
      .name("inner-label")
      .text("Inner Shadow")
      .font("Inter", "Regular")
      .fontSize(11)
      .color(GRAY)
      .size(120, 16)
      .position(168, 160)
      .alignHorizontal("CENTER")
      .build(),
  );

  // Layer blur
  figFile.addRoundedRectangle(
    roundedRectNode(id.next(), effectFrameID)
      .name("Layer Blur")
      .size(120, 80)
      .position(312, 72)
      .fill(BLUE)
      .cornerRadius(12)
      .effects(effects(layerBlur().radius(4)))
      .build(),
  );
  figFile.addTextNode(
    textNode(id.next(), effectFrameID)
      .name("blur-label")
      .text("Layer Blur")
      .font("Inter", "Regular")
      .fontSize(11)
      .color(GRAY)
      .size(120, 16)
      .position(312, 160)
      .alignHorizontal("CENTER")
      .build(),
  );

  // Multiple shadows stacked
  figFile.addRoundedRectangle(
    roundedRectNode(id.next(), effectFrameID)
      .name("Multi Shadow")
      .size(120, 80)
      .position(24, 200)
      .fill(WHITE)
      .cornerRadius(12)
      .effects(effects(
        dropShadow().offset(0, 1).blur(3).color({ r: 0, g: 0, b: 0, a: 0.08 }),
        dropShadow().offset(0, 4).blur(8).color({ r: 0, g: 0, b: 0, a: 0.08 }),
        dropShadow().offset(0, 12).blur(24).color({ r: 0, g: 0, b: 0, a: 0.12 }),
      ))
      .build(),
  );
  figFile.addTextNode(
    textNode(id.next(), effectFrameID)
      .name("multi-label")
      .text("Multi Shadow")
      .font("Inter", "Regular")
      .fontSize(11)
      .color(GRAY)
      .size(120, 16)
      .position(24, 288)
      .alignHorizontal("CENTER")
      .build(),
  );

  // Colored shadow
  const colorShadowGrad = linearGradient()
    .angle(135)
    .stops([
      { color: PURPLE, position: 0 },
      { color: BLUE, position: 1 },
    ])
    .build();

  figFile.addRoundedRectangle(
    roundedRectNode(id.next(), effectFrameID)
      .name("Colored Shadow")
      .size(120, 80)
      .position(168, 200)
      .fill(colorShadowGrad)
      .cornerRadius(12)
      .effects(effects(dropShadow().offset(0, 8).blur(20).color({ ...PURPLE, a: 0.4 })))
      .build(),
  );
  figFile.addTextNode(
    textNode(id.next(), effectFrameID)
      .name("color-shadow-label")
      .text("Colored Shadow")
      .font("Inter", "Regular")
      .fontSize(11)
      .color(GRAY)
      .size(120, 16)
      .position(168, 288)
      .alignHorizontal("CENTER")
      .build(),
  );
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Create a demo FigDesignDocument with rich content.
 *
 * Builds a .fig binary using the fig file builder, then parses it back
 * into a FigDesignDocument. This ensures all geometry, blob data, and
 * structural metadata are properly generated.
 *
 * Pages:
 * 1. Shapes & Fills — basic shapes, strokes, gradients
 * 2. Typography — alignment, sizes, multi-line, paragraph
 * 3. Components & Effects — symbol/instance, shadows, blur
 */
export async function createDemoFigDesignDocument(): Promise<FigDesignDocument> {
  const figFile = createFigFile();
  const docID = figFile.addDocument("Fig Demo");
  const id = createIDCounter();

  buildShapesPage(figFile, docID, id);
  buildTypographyPage(figFile, docID, id);
  buildComponentsPage(figFile, docID, id);

  figFile.addInternalCanvas(docID);

  const buffer = await figFile.buildAsync({ fileName: "fig-demo" });
  return createFigDesignDocument(new Uint8Array(buffer));
}
