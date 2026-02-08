#!/usr/bin/env bun
/**
 * @file Generate effect fixture .fig file
 *
 * Creates a .fig file with effect examples for testing:
 * - Drop shadow (basic, offset, colored, multiple)
 * - Inner shadow
 * - Layer blur
 * - Opacity
 * - Blend modes
 *
 * Usage:
 *   bun packages/@aurochs-renderer/figma/scripts/generate-effect-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFigFile,
  frameNode,
  roundedRectNode,
  ellipseNode,
  dropShadow,
  innerShadow,
  layerBlur,
  effects,
  type EffectData,
} from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/effects");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "effects.fig");

// =============================================================================
// Effect Frame Data
// =============================================================================

type EffectChild = {
  shape: "rect" | "ellipse";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number;
  fill: { r: number; g: number; b: number };
  opacity?: number;
  effects?: readonly EffectData[];
};

type EffectFrameData = {
  name: string;
  width: number;
  height: number;
  background: string;
  children: EffectChild[];
};

// Pre-computed effect test cases
const EFFECT_FRAMES: EffectFrameData[] = [
  // Drop shadow cases
  {
    name: "shadow-drop-basic",
    width: 120,
    height: 120,
    background: "#ffffff",
    children: [
      {
        shape: "rect",
        name: "box",
        x: 20,
        y: 20,
        width: 80,
        height: 80,
        cornerRadius: 8,
        fill: { r: 0.3, g: 0.5, b: 0.9 },
        effects: effects(dropShadow().offset(0, 4).blur(8).color(0, 0, 0, 0.25)),
      },
    ],
  },
  {
    name: "shadow-drop-offset",
    width: 140,
    height: 140,
    background: "#ffffff",
    children: [
      {
        shape: "rect",
        name: "box",
        x: 20,
        y: 20,
        width: 80,
        height: 80,
        cornerRadius: 8,
        fill: { r: 0.9, g: 0.5, b: 0.3 },
        effects: effects(dropShadow().offset(10, 10).blur(4).color(0, 0, 0, 0.3)),
      },
    ],
  },
  {
    name: "shadow-drop-color",
    width: 120,
    height: 120,
    background: "#f5f5f5",
    children: [
      {
        shape: "rect",
        name: "box",
        x: 20,
        y: 20,
        width: 80,
        height: 80,
        cornerRadius: 8,
        fill: { r: 1, g: 1, b: 1 },
        effects: effects(dropShadow().offset(0, 4).blur(12).color(0.5, 0, 0.8, 0.4)),
      },
    ],
  },
  {
    name: "shadow-drop-multi",
    width: 140,
    height: 140,
    background: "#ffffff",
    children: [
      {
        shape: "rect",
        name: "box",
        x: 30,
        y: 30,
        width: 80,
        height: 80,
        cornerRadius: 8,
        fill: { r: 0.2, g: 0.7, b: 0.4 },
        effects: effects(
          dropShadow().offset(0, 2).blur(4).color(0, 0, 0, 0.1),
          dropShadow().offset(0, 8).blur(16).color(0, 0, 0, 0.15),
        ),
      },
    ],
  },

  // Inner shadow
  {
    name: "shadow-inner",
    width: 120,
    height: 120,
    background: "#ffffff",
    children: [
      {
        shape: "rect",
        name: "box",
        x: 20,
        y: 20,
        width: 80,
        height: 80,
        cornerRadius: 8,
        fill: { r: 0.9, g: 0.9, b: 0.9 },
        effects: effects(innerShadow().offset(0, 2).blur(4).color(0, 0, 0, 0.15)),
      },
    ],
  },

  // Layer blur
  {
    name: "blur-layer",
    width: 120,
    height: 120,
    background: "#ffffff",
    children: [
      {
        shape: "ellipse",
        name: "circle",
        x: 20,
        y: 20,
        width: 80,
        height: 80,
        fill: { r: 0.9, g: 0.3, b: 0.3 },
        effects: effects(layerBlur().radius(4)),
      },
    ],
  },

  // Opacity
  {
    name: "opacity-50",
    width: 160,
    height: 100,
    background: "#dddddd",
    children: [
      { shape: "rect", name: "full", x: 15, y: 25, width: 50, height: 50, fill: { r: 0.2, g: 0.5, b: 0.9 } },
      {
        shape: "rect",
        name: "half",
        x: 95,
        y: 25,
        width: 50,
        height: 50,
        fill: { r: 0.2, g: 0.5, b: 0.9 },
        opacity: 0.5,
      },
    ],
  },

  // Combined effects
  {
    name: "effects-combined",
    width: 140,
    height: 140,
    background: "#ffffff",
    children: [
      {
        shape: "rect",
        name: "card",
        x: 20,
        y: 20,
        width: 100,
        height: 100,
        cornerRadius: 12,
        fill: { r: 1, g: 1, b: 1 },
        effects: effects(
          dropShadow().offset(0, 4).blur(6).color(0, 0, 0, 0.1),
          dropShadow().offset(0, 12).blur(24).color(0, 0, 0, 0.1),
          innerShadow().offset(0, 1).blur(0).color(1, 1, 1, 0.5),
        ),
      },
    ],
  },

  // Shadows on different shapes
  {
    name: "shadow-shapes",
    width: 280,
    height: 100,
    background: "#ffffff",
    children: [
      {
        shape: "rect",
        name: "rect",
        x: 20,
        y: 20,
        width: 60,
        height: 60,
        fill: { r: 0.9, g: 0.3, b: 0.3 },
        effects: effects(dropShadow().offset(0, 4).blur(8)),
      },
      {
        shape: "rect",
        name: "rounded",
        x: 110,
        y: 20,
        width: 60,
        height: 60,
        cornerRadius: 12,
        fill: { r: 0.3, g: 0.7, b: 0.3 },
        effects: effects(dropShadow().offset(0, 4).blur(8)),
      },
      {
        shape: "ellipse",
        name: "circle",
        x: 200,
        y: 20,
        width: 60,
        height: 60,
        fill: { r: 0.3, g: 0.5, b: 0.9 },
        effects: effects(dropShadow().offset(0, 4).blur(8)),
      },
    ],
  },
];

// =============================================================================
// Color Helpers
// =============================================================================

function hexToColor(hex: string): { r: number; g: number; b: number; a: number } {
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

// =============================================================================
// Generate .fig File
// =============================================================================

async function generateEffectFixtures(): Promise<void> {
  console.log("Generating effect fixtures...");

  const figFile = createFigFile();

  // Create document and canvas
  const docID = figFile.addDocument("Document");
  const canvasID = figFile.addCanvas(docID, "Page 1");
  figFile.addInternalCanvas(docID); // Required for Figma compatibility

  // Grid layout
  const GRID_COLS = 4;
  const GRID_GAP = 30;
  const MARGIN = 50;

  let nextID = 10;

  // Add each effect frame
  EFFECT_FRAMES.forEach((frameData, index) => {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);

    const maxFrameWidth = 280;
    const maxFrameHeight = 150;
    const frameX = MARGIN + col * (maxFrameWidth + GRID_GAP);
    const frameY = MARGIN + row * (maxFrameHeight + GRID_GAP);

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

      if (child.shape === "rect") {
        const builder = roundedRectNode(childID, frameID)
          .name(child.name)
          .size(child.width, child.height)
          .position(child.x, child.y)
          .fill({ ...child.fill, a: 1 });

        if (child.cornerRadius) {
          builder.cornerRadius(child.cornerRadius);
        }
        if (child.opacity !== undefined) {
          builder.opacity(child.opacity);
        }
        if (child.effects) {
          builder.effects(child.effects);
        }

        figFile.addRoundedRectangle(builder.build());
      } else if (child.shape === "ellipse") {
        const builder = ellipseNode(childID, frameID)
          .name(child.name)
          .size(child.width, child.height)
          .position(child.x, child.y)
          .fill({ ...child.fill, a: 1 });

        if (child.opacity !== undefined) {
          builder.opacity(child.opacity);
        }
        if (child.effects) {
          builder.effects(child.effects);
        }

        figFile.addEllipse(builder.build());
      }
    }
  });

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Create actual/ directory
  const actualDir = path.join(OUTPUT_DIR, "actual");
  if (!fs.existsSync(actualDir)) {
    fs.mkdirSync(actualDir, { recursive: true });
  }

  // Build and write
  const figData = await figFile.buildAsync({ fileName: "effects" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Frames: ${EFFECT_FRAMES.length}`);
  console.log(`\nFrame list:`);
  for (const frame of EFFECT_FRAMES) {
    console.log(`  - ${frame.name} (${frame.width}x${frame.height})`);
  }

  console.log(`\nEffects are now applied programmatically via the builder.`);

  console.log(`\nNext steps:`);
  console.log(`1. Open ${OUTPUT_FILE} in Figma to verify effects`);
  console.log(`2. Export each frame as SVG to ${actualDir}/`);
  console.log(`3. Run: npx vitest run packages/@aurochs-renderer/figma/spec/effects.spec.ts`);
}

// Run
generateEffectFixtures().catch(console.error);
