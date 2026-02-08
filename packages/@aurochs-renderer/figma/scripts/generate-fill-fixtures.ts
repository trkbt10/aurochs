#!/usr/bin/env bun
/**
 * @file Generate fill/paint fixture .fig file
 *
 * Creates a .fig file with various fill examples for testing:
 * - Solid colors (various colors, opacity)
 * - Linear gradients (horizontal, vertical, diagonal, multi-stop)
 * - Radial gradients (centered, offset, elliptical)
 * - Stroke styles (caps, joins, dash patterns, alignment)
 *
 * Usage:
 *   bun packages/@aurochs-renderer/figma/scripts/generate-fill-fixtures.ts
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
  linearGradient,
  radialGradient,
  stroke,
  type Paint,
  type GradientPaint,
} from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/fills");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "fills.fig");

// =============================================================================
// Fill Frame Data
// =============================================================================

type FillChild = {
  shape: "rect" | "ellipse";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number;
  fill?: Paint | GradientPaint;
  strokeData?: {
    color: { r: number; g: number; b: number };
    weight: number;
    cap?: "NONE" | "ROUND" | "SQUARE";
    join?: "MITER" | "BEVEL" | "ROUND";
    align?: "CENTER" | "INSIDE" | "OUTSIDE";
    dash?: number[];
  };
};

type FillFrameData = {
  name: string;
  width: number;
  height: number;
  background: string;
  children: FillChild[];
};

// Create paint objects for each test case
function createSolidRed(): Paint {
  return solidPaint(0.9, 0.2, 0.2).build();
}

function createSolidGreen(): Paint {
  return solidPaint(0.2, 0.8, 0.3).build();
}

function createSolidBlue(): Paint {
  return solidPaint(0.2, 0.4, 0.9).build();
}

function createSolid50Opacity(): Paint {
  return solidPaint(0.5, 0.2, 0.8).opacity(0.5).build();
}

function createLinearHorizontal(): GradientPaint {
  return linearGradient()
    .angle(0)
    .stops([
      { color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
      { color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 },
    ])
    .build();
}

function createLinearVertical(): GradientPaint {
  return linearGradient()
    .angle(90)
    .stops([
      { color: { r: 0, g: 1, b: 0, a: 1 }, position: 0 },
      { color: { r: 1, g: 1, b: 0, a: 1 }, position: 1 },
    ])
    .build();
}

function createLinear45(): GradientPaint {
  return linearGradient()
    .angle(45)
    .stops([
      { color: { r: 1, g: 0, b: 1, a: 1 }, position: 0 },
      { color: { r: 0, g: 1, b: 1, a: 1 }, position: 1 },
    ])
    .build();
}

function createLinearMultiStop(): GradientPaint {
  return linearGradient()
    .angle(0)
    .stops([
      { color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
      { color: { r: 1, g: 1, b: 0, a: 1 }, position: 0.25 },
      { color: { r: 0, g: 1, b: 0, a: 1 }, position: 0.5 },
      { color: { r: 0, g: 1, b: 1, a: 1 }, position: 0.75 },
      { color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 },
    ])
    .build();
}

function createRadialCentered(): GradientPaint {
  return radialGradient()
    .center(0.5, 0.5)
    .radius(0.5)
    .stops([
      { color: { r: 1, g: 1, b: 1, a: 1 }, position: 0 },
      { color: { r: 0, g: 0, b: 0, a: 1 }, position: 1 },
    ])
    .build();
}

function createRadialOffset(): GradientPaint {
  return radialGradient()
    .center(0.3, 0.3)
    .radius(0.7)
    .stops([
      { color: { r: 1, g: 0.8, b: 0, a: 1 }, position: 0 },
      { color: { r: 0.8, g: 0.2, b: 0, a: 1 }, position: 1 },
    ])
    .build();
}

// Pre-computed fill test cases
const FILL_FRAMES: FillFrameData[] = [
  // Solid colors
  {
    name: "solid-colors",
    width: 260,
    height: 80,
    background: "#ffffff",
    children: [
      { shape: "rect", name: "red", x: 10, y: 15, width: 50, height: 50, fill: createSolidRed() },
      { shape: "rect", name: "green", x: 70, y: 15, width: 50, height: 50, fill: createSolidGreen() },
      { shape: "rect", name: "blue", x: 130, y: 15, width: 50, height: 50, fill: createSolidBlue() },
      { shape: "rect", name: "black", x: 190, y: 15, width: 25, height: 50, fill: solidPaint(0, 0, 0).build() },
      {
        shape: "rect",
        name: "white",
        x: 225,
        y: 15,
        width: 25,
        height: 50,
        fill: solidPaint(1, 1, 1).build(),
        strokeData: { color: { r: 0.8, g: 0.8, b: 0.8 }, weight: 1 },
      },
    ],
  },
  {
    name: "solid-opacity",
    width: 120,
    height: 80,
    background: "#dddddd",
    children: [
      { shape: "rect", name: "full", x: 10, y: 15, width: 40, height: 50, fill: solidPaint(0.5, 0.2, 0.8).build() },
      { shape: "rect", name: "half", x: 65, y: 15, width: 40, height: 50, fill: createSolid50Opacity() },
    ],
  },

  // Linear gradients
  {
    name: "gradient-linear-h",
    width: 120,
    height: 80,
    background: "#f5f5f5",
    children: [
      { shape: "rect", name: "linear-h", x: 10, y: 15, width: 100, height: 50, fill: createLinearHorizontal() },
    ],
  },
  {
    name: "gradient-linear-v",
    width: 80,
    height: 120,
    background: "#f5f5f5",
    children: [{ shape: "rect", name: "linear-v", x: 15, y: 10, width: 50, height: 100, fill: createLinearVertical() }],
  },
  {
    name: "gradient-linear-45",
    width: 100,
    height: 100,
    background: "#f5f5f5",
    children: [{ shape: "rect", name: "linear-45", x: 10, y: 10, width: 80, height: 80, fill: createLinear45() }],
  },
  {
    name: "gradient-multi-stop",
    width: 220,
    height: 60,
    background: "#f5f5f5",
    children: [{ shape: "rect", name: "rainbow", x: 10, y: 10, width: 200, height: 40, fill: createLinearMultiStop() }],
  },

  // Radial gradients
  {
    name: "gradient-radial",
    width: 100,
    height: 100,
    background: "#f5f5f5",
    children: [{ shape: "ellipse", name: "radial", x: 10, y: 10, width: 80, height: 80, fill: createRadialCentered() }],
  },
  {
    name: "gradient-radial-offset",
    width: 100,
    height: 100,
    background: "#f5f5f5",
    children: [
      { shape: "ellipse", name: "radial-offset", x: 10, y: 10, width: 80, height: 80, fill: createRadialOffset() },
    ],
  },

  // Stroke styles
  {
    name: "stroke-basic",
    width: 200,
    height: 80,
    background: "#ffffff",
    children: [
      {
        shape: "rect",
        name: "thin",
        x: 10,
        y: 15,
        width: 50,
        height: 50,
        strokeData: { color: { r: 0, g: 0, b: 0 }, weight: 1 },
      },
      {
        shape: "rect",
        name: "medium",
        x: 75,
        y: 15,
        width: 50,
        height: 50,
        strokeData: { color: { r: 0.2, g: 0.4, b: 0.8 }, weight: 3 },
      },
      {
        shape: "rect",
        name: "thick",
        x: 140,
        y: 15,
        width: 50,
        height: 50,
        strokeData: { color: { r: 0.8, g: 0.2, b: 0.2 }, weight: 6 },
      },
    ],
  },
  {
    name: "stroke-caps",
    width: 200,
    height: 60,
    background: "#ffffff",
    children: [
      {
        shape: "rect",
        name: "none-cap",
        x: 10,
        y: 20,
        width: 50,
        height: 20,
        strokeData: { color: { r: 0, g: 0, b: 0 }, weight: 4, cap: "NONE" },
      },
      {
        shape: "rect",
        name: "round-cap",
        x: 75,
        y: 20,
        width: 50,
        height: 20,
        strokeData: { color: { r: 0, g: 0, b: 0 }, weight: 4, cap: "ROUND" },
      },
      {
        shape: "rect",
        name: "square-cap",
        x: 140,
        y: 20,
        width: 50,
        height: 20,
        strokeData: { color: { r: 0, g: 0, b: 0 }, weight: 4, cap: "SQUARE" },
      },
    ],
  },
  {
    name: "stroke-dash",
    width: 220,
    height: 100,
    background: "#ffffff",
    children: [
      {
        shape: "rect",
        name: "solid",
        x: 10,
        y: 10,
        width: 200,
        height: 20,
        strokeData: { color: { r: 0, g: 0, b: 0 }, weight: 2 },
      },
      {
        shape: "rect",
        name: "dashed",
        x: 10,
        y: 40,
        width: 200,
        height: 20,
        strokeData: { color: { r: 0, g: 0, b: 0 }, weight: 2, dash: [8, 4] },
      },
      {
        shape: "rect",
        name: "dotted",
        x: 10,
        y: 70,
        width: 200,
        height: 20,
        strokeData: { color: { r: 0, g: 0, b: 0 }, weight: 2, dash: [2, 4] },
      },
    ],
  },
  {
    name: "stroke-align",
    width: 200,
    height: 80,
    background: "#f0f0f0",
    children: [
      {
        shape: "rect",
        name: "center",
        x: 15,
        y: 15,
        width: 50,
        height: 50,
        fill: solidPaint(0.9, 0.9, 0.9).build(),
        strokeData: { color: { r: 0, g: 0, b: 0 }, weight: 4, align: "CENTER" },
      },
      {
        shape: "rect",
        name: "inside",
        x: 80,
        y: 15,
        width: 50,
        height: 50,
        fill: solidPaint(0.9, 0.9, 0.9).build(),
        strokeData: { color: { r: 0, g: 0, b: 0 }, weight: 4, align: "INSIDE" },
      },
      {
        shape: "rect",
        name: "outside",
        x: 145,
        y: 15,
        width: 50,
        height: 50,
        fill: solidPaint(0.9, 0.9, 0.9).build(),
        strokeData: { color: { r: 0, g: 0, b: 0 }, weight: 4, align: "OUTSIDE" },
      },
    ],
  },
];

// =============================================================================
// Color Helpers
// =============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0.9, g: 0.9, b: 0.9 };
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

// =============================================================================
// Generate .fig File
// =============================================================================

async function generateFillFixtures(): Promise<void> {
  console.log("Generating fill fixtures...");

  const figFile = createFigFile();

  // Create document and canvas
  const docID = figFile.addDocument("Fills");
  const canvasID = figFile.addCanvas(docID, "Fills Canvas");

  // Grid layout parameters
  const GRID_COLS = 4;
  const GRID_GAP = 30;
  const MARGIN = 50;

  let nextID = 10;

  // Add each fill frame
  FILL_FRAMES.forEach((frameData, index) => {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);

    const maxFrameWidth = 260;
    const maxFrameHeight = 120;
    const frameX = MARGIN + col * (maxFrameWidth + GRID_GAP);
    const frameY = MARGIN + row * (maxFrameHeight + GRID_GAP);

    const frameID = nextID++;
    const bgColor = hexToRgb(frameData.background);

    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name(frameData.name)
        .size(frameData.width, frameData.height)
        .position(frameX, frameY)
        .background(bgColor.r, bgColor.g, bgColor.b)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );

    // Add children
    for (const child of frameData.children) {
      const childID = nextID++;

      if (child.shape === "rect") {
        const builder = roundedRectNode(childID, frameID)
          .name(child.name)
          .size(child.width, child.height)
          .position(child.x, child.y);

        if (child.cornerRadius) {
          builder.cornerRadius(child.cornerRadius);
        }

        if (child.fill) {
          // Use the paint directly - need to access internal fill method
          // For now, extract color from paint
          const fillColor = (child.fill as Paint).color;
          if (fillColor) {
            builder.fill(fillColor.r, fillColor.g, fillColor.b, fillColor.a);
          }
        } else {
          builder.noFill();
        }

        if (child.strokeData) {
          builder.stroke(child.strokeData.color.r, child.strokeData.color.g, child.strokeData.color.b);
          builder.strokeWeight(child.strokeData.weight);
          if (child.strokeData.cap) {
            builder.strokeCap(child.strokeData.cap);
          }
          if (child.strokeData.join) {
            builder.strokeJoin(child.strokeData.join);
          }
          if (child.strokeData.align) {
            builder.strokeAlign(child.strokeData.align);
          }
          if (child.strokeData.dash) {
            builder.dashPattern(child.strokeData.dash);
          }
        }

        figFile.addRoundedRectangle(builder.build());
      } else if (child.shape === "ellipse") {
        const builder = ellipseNode(childID, frameID)
          .name(child.name)
          .size(child.width, child.height)
          .position(child.x, child.y);

        if (child.fill) {
          const fillColor = (child.fill as Paint).color;
          if (fillColor) {
            builder.fill(fillColor.r, fillColor.g, fillColor.b, fillColor.a);
          }
        } else {
          builder.noFill();
        }

        if (child.strokeData) {
          builder.stroke(child.strokeData.color.r, child.strokeData.color.g, child.strokeData.color.b);
          builder.strokeWeight(child.strokeData.weight);
        }

        figFile.addEllipse(builder.build());
      }
    }
  });

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Create actual/ directory for SVG exports
  const actualDir = path.join(OUTPUT_DIR, "actual");
  if (!fs.existsSync(actualDir)) {
    fs.mkdirSync(actualDir, { recursive: true });
  }

  // Build and write the .fig file
  const figData = await figFile.buildAsync({ fileName: "fills" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Frames: ${FILL_FRAMES.length}`);
  console.log(`\nFrame list:`);
  for (const frame of FILL_FRAMES) {
    console.log(`  - ${frame.name} (${frame.width}x${frame.height})`);
  }

  console.log(`\nNext steps:`);
  console.log(`1. Open ${OUTPUT_FILE} in Figma`);
  console.log(`2. Apply gradients manually (solid fills are applied, gradients need Figma)`);
  console.log(`3. Export each frame as SVG to ${actualDir}/`);
  console.log(`4. Run: npx vitest run packages/@aurochs-renderer/figma/spec/fills.spec.ts`);
}

// Run
generateFillFixtures().catch(console.error);
