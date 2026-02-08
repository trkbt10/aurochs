#!/usr/bin/env bun
/**
 * @file Generate clip fixture .fig file
 *
 * Creates a .fig file with clipping test cases using only rect/ellipse
 * (star/polygon don't have fillGeometry blobs in the builder, so Figma can't render them).
 *
 * - 1-level clip: shapes inside a single clip frame
 * - 2-level nested clips: shapes inside double-nested clip frames
 * - 3-level nested clips: shapes inside triple-nested clip frames
 * - Overflow: shapes exceeding clip bounds
 * - Nested with shapes: rect+ellipse in 2-level nested clip
 * - Mixed depths: shapes at different nesting depths
 * - Overlapping: shapes overlapping inside clip
 *
 * Usage:
 *   bun packages/@aurochs-renderer/figma/scripts/generate-clip-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createFigFile, frameNode, roundedRectNode, ellipseNode } from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/clips");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "clips.fig");

// =============================================================================
// Color Helpers
// =============================================================================

type Color = { r: number; g: number; b: number; a: number };

const white: Color = { r: 1, g: 1, b: 1, a: 1 };
const lightGray: Color = { r: 0.94, g: 0.94, b: 0.94, a: 1 };

function rgb(r: number, g: number, b: number): Color {
  return { r, g, b, a: 1 };
}

// =============================================================================
// Generate .fig File
// =============================================================================

async function generateClipFixtures(): Promise<void> {
  console.log("Generating clip fixtures...");

  const figFile = createFigFile();

  const docID = figFile.addDocument("Clips");
  const canvasID = figFile.addCanvas(docID, "Clips Canvas");
  figFile.addInternalCanvas(docID);

  let nextID = 10;
  const id = () => nextID++;

  // Grid layout
  const GRID_COLS = 4;
  const GRID_GAP = 30;
  const MARGIN = 50;
  let frameIndex = 0;

  function gridPos() {
    const col = frameIndex % GRID_COLS;
    const row = Math.floor(frameIndex / GRID_COLS);
    const x = MARGIN + col * (220 + GRID_GAP);
    const y = MARGIN + row * (220 + GRID_GAP);
    frameIndex++;
    return { x, y };
  }

  // ---- clip-1level: single clip frame with rect + ellipse ----
  {
    const pos = gridPos();
    const frameID = id();
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("clip-1level")
        .size(200, 200)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(id(), frameID)
        .name("rect")
        .size(80, 80)
        .position(20, 20)
        .fill(rgb(0.3, 0.5, 0.9))
        .cornerRadius(8)
        .build(),
    );
    figFile.addEllipse(
      ellipseNode(id(), frameID)
        .name("circle")
        .size(60, 60)
        .position(100, 100)
        .fill(rgb(0.9, 0.3, 0.3))
        .build(),
    );
  }

  // ---- clip-2level: double-nested clip frames with ellipse ----
  {
    const pos = gridPos();
    const outerID = id();
    figFile.addFrame(
      frameNode(outerID, canvasID)
        .name("clip-2level")
        .size(200, 200)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    const innerID = id();
    figFile.addFrame(
      frameNode(innerID, outerID)
        .name("inner")
        .size(160, 160)
        .position(20, 20)
        .background(lightGray)
        .clipsContent(true)
        .build(),
    );
    figFile.addEllipse(
      ellipseNode(id(), innerID)
        .name("circle")
        .size(80, 80)
        .position(40, 40)
        .fill(rgb(1, 0.8, 0))
        .build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(id(), innerID)
        .name("rect")
        .size(60, 60)
        .position(10, 90)
        .fill(rgb(0.3, 0.7, 0.3))
        .cornerRadius(6)
        .build(),
    );
  }

  // ---- clip-3level: triple-nested clip frames ----
  {
    const pos = gridPos();
    const level1ID = id();
    figFile.addFrame(
      frameNode(level1ID, canvasID)
        .name("clip-3level")
        .size(200, 200)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    const level2ID = id();
    figFile.addFrame(
      frameNode(level2ID, level1ID)
        .name("level-2")
        .size(180, 180)
        .position(10, 10)
        .background(lightGray)
        .clipsContent(true)
        .build(),
    );
    const level3ID = id();
    figFile.addFrame(
      frameNode(level3ID, level2ID).name("level-3").size(160, 160).position(10, 10).clipsContent(true).build(),
    );
    figFile.addEllipse(
      ellipseNode(id(), level3ID)
        .name("circle")
        .size(80, 80)
        .position(40, 40)
        .fill(rgb(0.4, 0.7, 0.4))
        .build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(id(), level3ID)
        .name("rect")
        .size(50, 50)
        .position(10, 10)
        .fill(rgb(0.9, 0.3, 0.6))
        .cornerRadius(8)
        .build(),
    );
  }

  // ---- clip-overflow: shapes exceeding clip bounds ----
  {
    const pos = gridPos();
    const frameID = id();
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("clip-overflow")
        .size(200, 200)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(id(), frameID)
        .name("overflow-rect")
        .size(150, 150)
        .position(100, 100)
        .fill(rgb(0.2, 0.6, 0.9))
        .cornerRadius(12)
        .build(),
    );
    figFile.addEllipse(
      ellipseNode(id(), frameID)
        .name("overflow-circle")
        .size(120, 120)
        .position(-30, -30)
        .fill(rgb(0.9, 0.5, 0.2))
        .build(),
    );
  }

  // ---- clip-nested-shapes: rect+ellipse in 2-level nested clip ----
  {
    const pos = gridPos();
    const outerID = id();
    figFile.addFrame(
      frameNode(outerID, canvasID)
        .name("clip-nested-shapes")
        .size(200, 200)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    const innerID = id();
    figFile.addFrame(
      frameNode(innerID, outerID).name("inner").size(160, 160).position(20, 20).clipsContent(true).build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(id(), innerID)
        .name("rect-large")
        .size(100, 100)
        .position(30, 30)
        .fill(rgb(0.3, 0.3, 0.9))
        .cornerRadius(10)
        .build(),
    );
    figFile.addEllipse(
      ellipseNode(id(), innerID)
        .name("circle-small")
        .size(60, 60)
        .position(10, 10)
        .fill(rgb(0.9, 0.7, 0))
        .build(),
    );
  }

  // ---- clip-mixed: shapes at different nesting depths ----
  {
    const pos = gridPos();
    const outerID = id();
    figFile.addFrame(
      frameNode(outerID, canvasID)
        .name("clip-mixed")
        .size(200, 200)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    // Shape directly in outer clip
    figFile.addRoundedRectangle(
      roundedRectNode(id(), outerID)
        .name("outer-rect")
        .size(60, 60)
        .position(10, 10)
        .fill(rgb(0.9, 0.3, 0.3))
        .cornerRadius(6)
        .build(),
    );
    // Nested clip with shapes
    const innerID = id();
    figFile.addFrame(
      frameNode(innerID, outerID)
        .name("inner")
        .size(120, 120)
        .position(70, 70)
        .background(lightGray)
        .clipsContent(true)
        .build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(id(), innerID)
        .name("inner-rect")
        .size(80, 80)
        .position(20, 20)
        .fill(rgb(0.3, 0.7, 0.3))
        .cornerRadius(8)
        .build(),
    );
    figFile.addEllipse(
      ellipseNode(id(), innerID)
        .name("inner-ellipse")
        .size(50, 50)
        .position(60, 60)
        .fill(rgb(0.3, 0.5, 0.9))
        .build(),
    );
  }

  // ---- clip-shapes-overlap: overlapping shapes inside clip ----
  {
    const pos = gridPos();
    const frameID = id();
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("clip-shapes-overlap")
        .size(200, 200)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(id(), frameID)
        .name("bg-rect")
        .size(120, 120)
        .position(40, 40)
        .fill(rgb(0.2, 0.5, 0.8))
        .cornerRadius(10)
        .build(),
    );
    figFile.addEllipse(
      ellipseNode(id(), frameID)
        .name("overlap-circle")
        .size(100, 100)
        .position(60, 60)
        .fill(rgb(0.9, 0.3, 0.3))
        .build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(id(), frameID)
        .name("top-rect")
        .size(80, 80)
        .position(20, 20)
        .fill(rgb(1, 0.8, 0))
        .cornerRadius(8)
        .build(),
    );
  }

  // Ensure output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const actualDir = path.join(OUTPUT_DIR, "actual");
  if (!fs.existsSync(actualDir)) {
    fs.mkdirSync(actualDir, { recursive: true });
  }

  const figData = await figFile.buildAsync({ fileName: "clips" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Frames: ${frameIndex}`);
  console.log(`\nFrame list:`);
  const names = [
    "clip-1level",
    "clip-2level",
    "clip-3level",
    "clip-overflow",
    "clip-nested-shapes",
    "clip-mixed",
    "clip-shapes-overlap",
  ];
  for (const name of names) {
    console.log(`  - ${name}`);
  }
}

generateClipFixtures().catch(console.error);
