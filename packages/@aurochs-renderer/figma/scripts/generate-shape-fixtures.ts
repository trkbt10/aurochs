#!/usr/bin/env bun
/**
 * @file Generate shape fixture .fig file
 *
 * Creates a .fig file with various shape examples for testing:
 * - Ellipse: basic, circle, arc, donut
 * - Line: horizontal, diagonal, styled
 * - Star: 5-point, 8-point, custom inner radius
 * - Polygon: triangle, hexagon, octagon
 * - Vector: custom paths
 *
 * Usage:
 *   bun packages/@aurochs-renderer/figma/scripts/generate-shape-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFigFile,
  frameNode,
  ellipseNode,
  lineNode,
  starNode,
  polygonNode,
  roundedRectNode,
} from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/shapes");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "shapes.fig");

// =============================================================================
// Shape Frame Data
// =============================================================================

type ShapeChild = {
  type: "ellipse" | "line" | "star" | "polygon" | "rect";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: { r: number; g: number; b: number };
  stroke?: { r: number; g: number; b: number };
  strokeWeight?: number;
  // Ellipse specific
  arcStart?: number;
  arcEnd?: number;
  innerRadius?: number;
  // Star specific
  points?: number;
  starInnerRadius?: number;
  // Polygon specific
  sides?: number;
  // Rect specific
  cornerRadius?: number;
  // Line specific
  rotation?: number;
  strokeCap?: "NONE" | "ROUND" | "SQUARE" | "ARROW_LINES" | "ARROW_EQUILATERAL";
  dashPattern?: number[];
};

type ShapeFrameData = {
  name: string;
  width: number;
  height: number;
  background: string;
  children: ShapeChild[];
};

// Pre-computed positions for shape test cases
const SHAPE_FRAMES: ShapeFrameData[] = [
  // Ellipse cases
  {
    name: "ellipse-basic",
    width: 160,
    height: 100,
    background: "#f0f0f0",
    children: [
      { type: "ellipse", name: "ellipse", x: 30, y: 20, width: 100, height: 60, fill: { r: 0.9, g: 0.3, b: 0.3 } },
    ],
  },
  {
    name: "ellipse-circle",
    width: 120,
    height: 120,
    background: "#f0f0f0",
    children: [
      { type: "ellipse", name: "circle", x: 20, y: 20, width: 80, height: 80, fill: { r: 0.3, g: 0.6, b: 0.9 } },
    ],
  },
  {
    name: "ellipse-arc",
    width: 120,
    height: 120,
    background: "#f0f0f0",
    children: [
      {
        type: "ellipse",
        name: "semicircle",
        x: 20,
        y: 20,
        width: 80,
        height: 80,
        fill: { r: 0.3, g: 0.8, b: 0.3 },
        arcStart: 0,
        arcEnd: 180,
      },
    ],
  },
  {
    name: "ellipse-donut",
    width: 120,
    height: 120,
    background: "#f0f0f0",
    children: [
      {
        type: "ellipse",
        name: "donut",
        x: 20,
        y: 20,
        width: 80,
        height: 80,
        fill: { r: 0.8, g: 0.5, b: 0.2 },
        innerRadius: 0.5,
      },
    ],
  },

  // Line cases
  {
    name: "line-horizontal",
    width: 160,
    height: 40,
    background: "#f0f0f0",
    children: [
      {
        type: "line",
        name: "h-line",
        x: 20,
        y: 20,
        width: 120,
        height: 0,
        stroke: { r: 0, g: 0, b: 0 },
        strokeWeight: 2,
      },
    ],
  },
  {
    name: "line-diagonal",
    width: 120,
    height: 120,
    background: "#f0f0f0",
    children: [
      {
        type: "line",
        name: "diag-line",
        x: 20,
        y: 20,
        width: 80,
        height: 0,
        stroke: { r: 0.2, g: 0.2, b: 0.8 },
        strokeWeight: 2,
        rotation: 45,
      },
    ],
  },
  {
    name: "line-styled",
    width: 200,
    height: 80,
    background: "#f0f0f0",
    children: [
      {
        type: "line",
        name: "solid",
        x: 20,
        y: 20,
        width: 160,
        height: 0,
        stroke: { r: 0, g: 0, b: 0 },
        strokeWeight: 2,
      },
      {
        type: "line",
        name: "dashed",
        x: 20,
        y: 40,
        width: 160,
        height: 0,
        stroke: { r: 0.5, g: 0, b: 0 },
        strokeWeight: 2,
        dashPattern: [8, 4],
      },
      {
        type: "line",
        name: "dotted",
        x: 20,
        y: 60,
        width: 160,
        height: 0,
        stroke: { r: 0, g: 0.5, b: 0 },
        strokeWeight: 2,
        dashPattern: [2, 4],
      },
    ],
  },

  // Star cases
  {
    name: "star-5point",
    width: 120,
    height: 120,
    background: "#f0f0f0",
    children: [
      { type: "star", name: "5-star", x: 20, y: 20, width: 80, height: 80, fill: { r: 1, g: 0.8, b: 0 }, points: 5 },
    ],
  },
  {
    name: "star-8point",
    width: 120,
    height: 120,
    background: "#f0f0f0",
    children: [
      {
        type: "star",
        name: "8-star",
        x: 20,
        y: 20,
        width: 80,
        height: 80,
        fill: { r: 0.9, g: 0.3, b: 0.7 },
        points: 8,
        starInnerRadius: 0.4,
      },
    ],
  },
  {
    name: "star-sharp",
    width: 120,
    height: 120,
    background: "#f0f0f0",
    children: [
      {
        type: "star",
        name: "sharp-star",
        x: 20,
        y: 20,
        width: 80,
        height: 80,
        fill: { r: 0.3, g: 0.3, b: 0.9 },
        points: 6,
        starInnerRadius: 0.2,
      },
    ],
  },

  // Polygon cases
  {
    name: "polygon-triangle",
    width: 120,
    height: 120,
    background: "#f0f0f0",
    children: [
      {
        type: "polygon",
        name: "triangle",
        x: 20,
        y: 20,
        width: 80,
        height: 80,
        fill: { r: 0.9, g: 0.4, b: 0.4 },
        sides: 3,
      },
    ],
  },
  {
    name: "polygon-hexagon",
    width: 120,
    height: 120,
    background: "#f0f0f0",
    children: [
      {
        type: "polygon",
        name: "hexagon",
        x: 20,
        y: 20,
        width: 80,
        height: 80,
        fill: { r: 0.4, g: 0.7, b: 0.4 },
        sides: 6,
      },
    ],
  },
  {
    name: "polygon-octagon",
    width: 120,
    height: 120,
    background: "#f0f0f0",
    children: [
      {
        type: "polygon",
        name: "octagon",
        x: 20,
        y: 20,
        width: 80,
        height: 80,
        fill: { r: 0.4, g: 0.4, b: 0.8 },
        sides: 8,
      },
    ],
  },

  // Rectangle with corner radius
  {
    name: "rect-rounded",
    width: 160,
    height: 100,
    background: "#f0f0f0",
    children: [
      {
        type: "rect",
        name: "rounded-rect",
        x: 20,
        y: 20,
        width: 120,
        height: 60,
        fill: { r: 0.5, g: 0.5, b: 0.5 },
        cornerRadius: 10,
      },
    ],
  },
  {
    name: "rect-pill",
    width: 160,
    height: 80,
    background: "#f0f0f0",
    children: [
      {
        type: "rect",
        name: "pill",
        x: 20,
        y: 20,
        width: 120,
        height: 40,
        fill: { r: 0.2, g: 0.6, b: 0.9 },
        cornerRadius: 20,
      },
    ],
  },

  // Mixed shapes
  {
    name: "shapes-mixed",
    width: 300,
    height: 120,
    background: "#ffffff",
    children: [
      { type: "ellipse", name: "circle", x: 20, y: 20, width: 80, height: 80, fill: { r: 0.9, g: 0.3, b: 0.3 } },
      { type: "star", name: "star", x: 110, y: 20, width: 80, height: 80, fill: { r: 1, g: 0.8, b: 0 }, points: 5 },
      {
        type: "polygon",
        name: "hex",
        x: 200,
        y: 20,
        width: 80,
        height: 80,
        fill: { r: 0.3, g: 0.6, b: 0.9 },
        sides: 6,
      },
    ],
  },
];

// =============================================================================
// Color Helpers
// =============================================================================

type Color = { r: number; g: number; b: number; a: number };

function hexToColor(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0.9, g: 0.9, b: 0.9, a: 1 };
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
    a: 1,
  };
}

function rgbToColor(rgb: { r: number; g: number; b: number }): Color {
  return { ...rgb, a: 1 };
}

// =============================================================================
// Generate .fig File
// =============================================================================

async function generateShapeFixtures(): Promise<void> {
  console.log("Generating shape fixtures...");

  const figFile = createFigFile();

  // Create document and canvas
  const docID = figFile.addDocument("Shapes");
  const canvasID = figFile.addCanvas(docID, "Shapes Canvas");
  figFile.addInternalCanvas(docID); // Required for Figma compatibility

  // Grid layout parameters
  const GRID_COLS = 4;
  const GRID_GAP = 30;
  const MARGIN = 50;

  // Track next available IDs
  let nextID = 10;

  // Add each shape frame
  SHAPE_FRAMES.forEach((frameData, index) => {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);

    // Calculate frame position
    const maxFrameWidth = 300;
    const maxFrameHeight = 150;
    const frameX = MARGIN + col * (maxFrameWidth + GRID_GAP);
    const frameY = MARGIN + row * (maxFrameHeight + GRID_GAP);

    // Create parent frame
    const frameID = nextID++;
    const bgColor = hexToColor(frameData.background);

    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name(frameData.name)
        .size(frameData.width, frameData.height)
        .position(frameX, frameY)
        .background(bgColor)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );

    // Add children
    for (const child of frameData.children) {
      const childID = nextID++;
      const fill = rgbToColor(child.fill ?? { r: 0.8, g: 0.8, b: 0.8 });

      switch (child.type) {
        case "ellipse": {
          const builder = ellipseNode(childID, frameID)
            .name(child.name)
            .size(child.width, child.height)
            .position(child.x, child.y)
            .fill(fill);

          if (child.arcStart !== undefined && child.arcEnd !== undefined) {
            builder.arc(child.arcStart, child.arcEnd);
          }
          if (child.innerRadius !== undefined) {
            builder.innerRadius(child.innerRadius);
          }

          figFile.addEllipse(builder.build());
          break;
        }

        case "line": {
          const builder = lineNode(childID, frameID).name(child.name).length(child.width).position(child.x, child.y);

          if (child.stroke) {
            builder.stroke(rgbToColor(child.stroke));
          }
          if (child.strokeWeight) {
            builder.strokeWeight(child.strokeWeight);
          }
          if (child.rotation) {
            builder.rotation(child.rotation);
          }
          if (child.dashPattern) {
            builder.dashPattern(child.dashPattern);
          }
          if (child.strokeCap) {
            builder.strokeCap(child.strokeCap);
          }

          figFile.addLine(builder.build());
          break;
        }

        case "star": {
          const builder = starNode(childID, frameID)
            .name(child.name)
            .size(child.width, child.height)
            .position(child.x, child.y)
            .fill(fill);

          if (child.points !== undefined) {
            builder.points(child.points);
          }
          if (child.starInnerRadius !== undefined) {
            builder.innerRadius(child.starInnerRadius);
          }

          figFile.addStar(builder.build());
          break;
        }

        case "polygon": {
          const builder = polygonNode(childID, frameID)
            .name(child.name)
            .size(child.width, child.height)
            .position(child.x, child.y)
            .fill(fill);

          if (child.sides !== undefined) {
            builder.sides(child.sides);
          }

          figFile.addPolygon(builder.build());
          break;
        }

        case "rect": {
          const builder = roundedRectNode(childID, frameID)
            .name(child.name)
            .size(child.width, child.height)
            .position(child.x, child.y)
            .fill(fill);

          if (child.cornerRadius !== undefined) {
            builder.cornerRadius(child.cornerRadius);
          }

          figFile.addRoundedRectangle(builder.build());
          break;
        }
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
  const figData = await figFile.buildAsync({ fileName: "shapes" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Frames: ${SHAPE_FRAMES.length}`);
  console.log(`\nFrame list:`);
  for (const frame of SHAPE_FRAMES) {
    console.log(`  - ${frame.name} (${frame.width}x${frame.height})`);
  }

  console.log(`\nNext steps:`);
  console.log(`1. Open ${OUTPUT_FILE} in Figma`);
  console.log(`2. Adjust positions if needed`);
  console.log(`3. Export each frame as SVG to ${actualDir}/`);
  console.log(`4. Run: npx vitest run packages/@aurochs-renderer/figma/spec/shapes.spec.ts`);
}

// Run
generateShapeFixtures().catch(console.error);
