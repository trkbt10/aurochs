/**
 * @file Generate PPTX fixtures for visual regression testing
 *
 * Creates test slide data that can be rendered by the PPTX slide renderer
 * for visual regression testing.
 *
 * Usage:
 *   bun packages/@aurochs-ui/pptx-editor/scripts/generate-visual-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Slide, SlideSize, Shape, SpShape, TextBody, Paragraph, Run, Transform, Fill, Line } from "@aurochs-office/pptx/domain";
import type { PresetGeometry } from "@aurochs-office/drawing-ml/domain/geometry";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Types
// =============================================================================

type SlideData = {
  slide: Slide;
  slideSize: SlideSize;
};

// =============================================================================
// Helpers
// =============================================================================

const DEFAULT_SLIDE_SIZE: SlideSize = {
  width: px(960),
  height: px(540),
};

function createTextRun(text: string, props?: Partial<Run>): Run {
  return {
    text,
    ...props,
  };
}

function createParagraph(runs: Run[], props?: Partial<Paragraph>): Paragraph {
  return {
    runs,
    properties: props?.properties ?? {},
  };
}

function createTextBody(paragraphs: Paragraph[]): TextBody {
  return {
    bodyProperties: {
      // Default body properties
    },
    paragraphs,
  };
}

function createSolidFill(color: string) {
  return {
    type: "solidFill" as const,
    color: {
      spec: { type: "srgb" as const, value: color },
    },
  };
}

/**
 * Create a line (stroke) with solid color
 */
function createLine(options: { color: string; width: number }): Line {
  return {
    width: px(options.width),
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    fill: createSolidFill(options.color),
    dash: "solid",
    join: "round",
  } as Line;
}

function createOptionalTextBody(text?: string): TextBody | undefined {
  if (!text) {
    return undefined;
  }
  return createTextBody([createParagraph([createTextRun(text)])]);
}

/**
 * Create transform with full properties
 */
function createTransform(options: { x: number; y: number; width: number; height: number }): Transform {
  return {
    x: px(options.x),
    y: px(options.y),
    width: px(options.width),
    height: px(options.height),
    rotation: deg(0),
    flipH: false,
    flipV: false,
  };
}

/**
 * Create preset geometry
 */
function createPresetGeometry(preset: string): PresetGeometry {
  return {
    type: "preset",
    preset,
    adjustValues: [],
  };
}

function createRectangleShape(options: {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: { type: "solid"; color: string };
  stroke?: { color: string; width: number };
  text?: string;
}): SpShape {
  return {
    type: "sp",
    nonVisual: {
      id: options.id,
      name: options.name,
    },
    properties: {
      transform: createTransform(options),
      geometry: createPresetGeometry("rect"),
      fill: options.fill ? createSolidFill(options.fill.color) as Fill : undefined,
      line: options.stroke ? createLine(options.stroke) : undefined,
    },
    textBody: createOptionalTextBody(options.text),
  };
}

function createEllipseShape(options: {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: { type: "solid"; color: string };
  stroke?: { color: string; width: number };
}): SpShape {
  return {
    type: "sp",
    nonVisual: {
      id: options.id,
      name: options.name,
    },
    properties: {
      transform: createTransform(options),
      geometry: createPresetGeometry("ellipse"),
      fill: options.fill ? createSolidFill(options.fill.color) as Fill : undefined,
      line: options.stroke ? createLine(options.stroke) : undefined,
    },
  };
}

// =============================================================================
// Test Slides
// =============================================================================

function createTextBoxSlide(): SlideData {
  // Note: textBody removed until TextRenderer issues are fixed
  return {
    slide: {
      shapes: [
        createRectangleShape({
          id: "1",
          name: "Title",
          x: 50,
          y: 50,
          width: 860,
          height: 80,
          fill: { type: "solid", color: "4472C4" },
          text: "Visual Regression Test - Text Box",
        }),
        createRectangleShape({
          id: "2",
          name: "Content",
          x: 50,
          y: 150,
          width: 400,
          height: 200,
          fill: { type: "solid", color: "FFFFFF" },
          text: "This is a text box with content.",
        }),
      ],
    },
    slideSize: DEFAULT_SLIDE_SIZE,
  };
}

function createRectangleSlide(): SlideData {
  return {
    slide: {
      shapes: [
        createRectangleShape({
          id: "1",
          name: "Rectangle 1",
          x: 50,
          y: 50,
          width: 200,
          height: 150,
          fill: { type: "solid", color: "FF6B6B" },
        }),
        createRectangleShape({
          id: "2",
          name: "Rectangle 2",
          x: 300,
          y: 50,
          width: 200,
          height: 150,
          fill: { type: "solid", color: "4ECDC4" },
        }),
        createRectangleShape({
          id: "3",
          name: "Rectangle 3",
          x: 550,
          y: 50,
          width: 200,
          height: 150,
          fill: { type: "solid", color: "45B7D1" },
        }),
        createRectangleShape({
          id: "4",
          name: "Rectangle 4",
          x: 175,
          y: 250,
          width: 250,
          height: 200,
          fill: { type: "solid", color: "96CEB4" },
        }),
        createRectangleShape({
          id: "5",
          name: "Rectangle 5",
          x: 475,
          y: 250,
          width: 250,
          height: 200,
          fill: { type: "solid", color: "FFEAA7" },
        }),
      ],
    },
    slideSize: DEFAULT_SLIDE_SIZE,
  };
}

function createEllipseSlide(): SlideData {
  return {
    slide: {
      shapes: [
        createEllipseShape({
          id: "1",
          name: "Circle",
          x: 100,
          y: 100,
          width: 150,
          height: 150,
          fill: { type: "solid", color: "E74C3C" },
        }),
        createEllipseShape({
          id: "2",
          name: "Ellipse Horizontal",
          x: 300,
          y: 100,
          width: 250,
          height: 150,
          fill: { type: "solid", color: "3498DB" },
        }),
        createEllipseShape({
          id: "3",
          name: "Ellipse Vertical",
          x: 600,
          y: 50,
          width: 150,
          height: 250,
          fill: { type: "solid", color: "2ECC71" },
        }),
        createEllipseShape({
          id: "4",
          name: "Large Circle",
          x: 150,
          y: 300,
          width: 200,
          height: 200,
          fill: { type: "solid", color: "9B59B6" },
        }),
        createEllipseShape({
          id: "5",
          name: "Small Circle",
          x: 450,
          y: 350,
          width: 100,
          height: 100,
          fill: { type: "solid", color: "F39C12" },
        }),
      ],
    },
    slideSize: DEFAULT_SLIDE_SIZE,
  };
}

function createSolidFillSlide(): SlideData {
  const colors = [
    { color: "FF0000", name: "Red" },
    { color: "00FF00", name: "Green" },
    { color: "0000FF", name: "Blue" },
    { color: "FFFF00", name: "Yellow" },
    { color: "FF00FF", name: "Magenta" },
    { color: "00FFFF", name: "Cyan" },
    { color: "000000", name: "Black" },
    { color: "FFFFFF", name: "White" },
  ];

  const shapes: Shape[] = colors.map((c, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    return createRectangleShape({
      id: String(i + 1),
      name: c.name,
      x: 50 + col * 220,
      y: 50 + row * 230,
      width: 200,
      height: 200,
      fill: { type: "solid", color: c.color },
    });
  });

  return {
    slide: { shapes },
    slideSize: DEFAULT_SLIDE_SIZE,
  };
}

function createMixedShapesSlide(): SlideData {
  // Note: textBody removed until TextRenderer issues are fixed
  return {
    slide: {
      shapes: [
        createRectangleShape({
          id: "1",
          name: "Title Box",
          x: 50,
          y: 20,
          width: 860,
          height: 60,
          fill: { type: "solid", color: "2C3E50" },
          // text: "Mixed Shapes Test", // TODO: add back when TextRenderer is fixed
        }),
        createRectangleShape({
          id: "2",
          name: "Rectangle",
          x: 50,
          y: 100,
          width: 180,
          height: 120,
          fill: { type: "solid", color: "E74C3C" },
        }),
        createEllipseShape({
          id: "3",
          name: "Ellipse",
          x: 260,
          y: 100,
          width: 180,
          height: 120,
          fill: { type: "solid", color: "3498DB" },
        }),
        createRectangleShape({
          id: "4",
          name: "Square",
          x: 470,
          y: 100,
          width: 120,
          height: 120,
          fill: { type: "solid", color: "2ECC71" },
        }),
        createEllipseShape({
          id: "5",
          name: "Circle",
          x: 620,
          y: 100,
          width: 120,
          height: 120,
          fill: { type: "solid", color: "F39C12" },
        }),
        createRectangleShape({
          id: "6",
          name: "Wide Rectangle",
          x: 50,
          y: 250,
          width: 400,
          height: 100,
          fill: { type: "solid", color: "9B59B6" },
        }),
        createEllipseShape({
          id: "7",
          name: "Wide Ellipse",
          x: 480,
          y: 250,
          width: 400,
          height: 100,
          fill: { type: "solid", color: "1ABC9C" },
        }),
        createRectangleShape({
          id: "8",
          name: "Content Box",
          x: 50,
          y: 380,
          width: 860,
          height: 120,
          fill: { type: "solid", color: "ECF0F1" },
          // text: "This slide demonstrates...", // TODO: add back when TextRenderer is fixed
        }),
      ],
    },
    slideSize: DEFAULT_SLIDE_SIZE,
  };
}

function createStrokeSlide(): SlideData {
  return {
    slide: {
      shapes: [
        // Stroke only (no fill)
        createRectangleShape({
          id: "1",
          name: "Stroke Only Rect",
          x: 50,
          y: 50,
          width: 180,
          height: 120,
          stroke: { color: "E74C3C", width: 4 },
        }),
        createEllipseShape({
          id: "2",
          name: "Stroke Only Ellipse",
          x: 260,
          y: 50,
          width: 180,
          height: 120,
          stroke: { color: "3498DB", width: 4 },
        }),
        // Fill with stroke
        createRectangleShape({
          id: "3",
          name: "Fill + Stroke Rect",
          x: 470,
          y: 50,
          width: 180,
          height: 120,
          fill: { type: "solid", color: "FFEAA7" },
          stroke: { color: "2C3E50", width: 3 },
        }),
        createEllipseShape({
          id: "4",
          name: "Fill + Stroke Ellipse",
          x: 680,
          y: 50,
          width: 180,
          height: 120,
          fill: { type: "solid", color: "DDA0DD" },
          stroke: { color: "8E44AD", width: 3 },
        }),
        // Different stroke widths
        createRectangleShape({
          id: "5",
          name: "Thin Stroke",
          x: 50,
          y: 200,
          width: 150,
          height: 100,
          fill: { type: "solid", color: "FFFFFF" },
          stroke: { color: "000000", width: 1 },
        }),
        createRectangleShape({
          id: "6",
          name: "Medium Stroke",
          x: 230,
          y: 200,
          width: 150,
          height: 100,
          fill: { type: "solid", color: "FFFFFF" },
          stroke: { color: "000000", width: 3 },
        }),
        createRectangleShape({
          id: "7",
          name: "Thick Stroke",
          x: 410,
          y: 200,
          width: 150,
          height: 100,
          fill: { type: "solid", color: "FFFFFF" },
          stroke: { color: "000000", width: 6 },
        }),
        createRectangleShape({
          id: "8",
          name: "Extra Thick Stroke",
          x: 590,
          y: 200,
          width: 150,
          height: 100,
          fill: { type: "solid", color: "FFFFFF" },
          stroke: { color: "000000", width: 10 },
        }),
        // Colored strokes
        createEllipseShape({
          id: "9",
          name: "Red Stroke Circle",
          x: 100,
          y: 350,
          width: 120,
          height: 120,
          stroke: { color: "FF0000", width: 5 },
        }),
        createEllipseShape({
          id: "10",
          name: "Green Stroke Circle",
          x: 280,
          y: 350,
          width: 120,
          height: 120,
          stroke: { color: "00FF00", width: 5 },
        }),
        createEllipseShape({
          id: "11",
          name: "Blue Stroke Circle",
          x: 460,
          y: 350,
          width: 120,
          height: 120,
          stroke: { color: "0000FF", width: 5 },
        }),
        createEllipseShape({
          id: "12",
          name: "Orange Stroke Circle",
          x: 640,
          y: 350,
          width: 120,
          height: 120,
          stroke: { color: "FF8C00", width: 5 },
        }),
      ],
    },
    slideSize: DEFAULT_SLIDE_SIZE,
  };
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const fixturesDir = path.resolve(__dirname, "../fixtures/visual");
  const jsonDir = path.join(fixturesDir, "json");

  // Ensure directories exist
  if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
  }

  // Generate slides
  const slides = [
    { name: "text-box", slide: createTextBoxSlide() },
    { name: "rectangle", slide: createRectangleSlide() },
    { name: "ellipse", slide: createEllipseSlide() },
    { name: "solid-fill", slide: createSolidFillSlide() },
    { name: "stroke", slide: createStrokeSlide() },
    { name: "mixed-shapes", slide: createMixedShapesSlide() },
  ];

  console.log("Generating PPTX fixtures for visual regression testing...\n");

  for (const { name, slide } of slides) {
    const jsonPath = path.join(jsonDir, `${name}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(slide, null, 2));
    console.log(`  Created: ${jsonPath}`);
  }

  console.log(`
========================================
FIXTURE GENERATION COMPLETE
========================================

Generated: ${slides.length} slide fixtures

JSON fixtures saved to: ${jsonDir}

Next steps:
1. Generate baselines:
   bun packages/@aurochs-ui/pptx-editor/scripts/generate-editor-baselines.ts

2. Run visual tests:
   npx vitest run packages/@aurochs-ui/pptx-editor/spec/pptx-visual.spec.ts
`);
}

main().catch(console.error);
