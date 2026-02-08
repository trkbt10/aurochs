#!/usr/bin/env bun
/**
 * @file Generate comprehensive constraint test fixture .fig file
 *
 * Canvas 1 — "Single Constraints":
 *   25 frames testing all H×V constraint combinations (5×5 grid).
 *   SYMBOL (100×60) with child rect at (10,10) size(60×30).
 *   INSTANCE resized to 160×100.
 *
 * Canvas 2 — "Nested Instance":
 *   Nested INSTANCE cases — circle-to-pill, rounded rect resize.
 *   Tests expandContainersToFitChildren INSTANCE skip + multi-level dsd.
 *
 * Canvas 3 — "Multi-child":
 *   SYMBOL with 3 children having different constraints.
 *   Verifies each child is independently resolved.
 *
 * Usage:
 *   bun packages/@aurochs-renderer/figma/scripts/generate-constraint-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createFigFile, frameNode, symbolNode, instanceNode, roundedRectNode, ellipseNode } from "@aurochs/fig/builder";
import type { Color } from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/constraints");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "constraints.fig");

// Colors
const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };
const BLUE: Color = { r: 0, g: 0.478, b: 1, a: 1 };
const GREEN: Color = { r: 0.204, g: 0.78, b: 0.349, a: 1 };
const RED: Color = { r: 1, g: 0.231, b: 0.188, a: 1 };
const ORANGE: Color = { r: 1, g: 0.584, b: 0, a: 1 };

const CONSTRAINTS = ["MIN", "CENTER", "MAX", "STRETCH", "SCALE"] as const;
type Constraint = (typeof CONSTRAINTS)[number];

// === Shared dimensions (must match spec expectations) ===
// Single constraint frames
const SYM_W = 100,
  SYM_H = 60;
const CHILD_X = 10,
  CHILD_Y = 10,
  CHILD_W = 60,
  CHILD_H = 30;
const INST_W = 160,
  INST_H = 100;

let nextID = 100;
function id(): number {
  return nextID++;
}

async function generate(): Promise<void> {
  console.log("Generating constraint fixtures...\n");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const figFile = createFigFile();
  const docID = figFile.addDocument("Constraints");

  // =========================================================================
  // Canvas 1: Single Constraints (25 frames, 5×5 grid)
  // =========================================================================
  const canvas1 = figFile.addCanvas(docID, "Single Constraints");

  const frameW = INST_W + 20;
  const frameH = INST_H + 20;
  const gap = 20;

  for (let hi = 0; hi < CONSTRAINTS.length; hi++) {
    for (let vi = 0; vi < CONSTRAINTS.length; vi++) {
      const h = CONSTRAINTS[hi];
      const v = CONSTRAINTS[vi];

      // Create SYMBOL (off-screen)
      const symID = id();
      figFile.addSymbol(
        symbolNode(symID, canvas1)
          .name(`Sym-${h}-${v}`)
          .size(SYM_W, SYM_H)
          .position(0, -500 - (hi * 5 + vi) * 100)
          .clipsContent(true)
          .build(),
      );

      // Add child rect with H=h, V=v constraints
      figFile.addRoundedRectangle(
        roundedRectNode(id(), symID)
          .name("child")
          .size(CHILD_W, CHILD_H)
          .position(CHILD_X, CHILD_Y)
          .fill(BLUE)
          .cornerRadius(4)
          .horizontalConstraint(h)
          .verticalConstraint(v)
          .build(),
      );

      // Create test frame
      const fID = id();
      figFile.addFrame(
        frameNode(fID, canvas1)
          .name(`${h}-${v}`)
          .size(frameW, frameH)
          .position(vi * (frameW + gap), hi * (frameH + gap))
          .background(WHITE)
          .exportAsSVG()
          .build(),
      );

      // Instance at resized dimensions
      figFile.addInstance(
        instanceNode(id(), fID, symID).name(`inst-${h}-${v}`).size(INST_W, INST_H).position(10, 10).build(),
      );
    }
  }

  // =========================================================================
  // Canvas 2: Nested Instance
  // =========================================================================
  const canvas2 = figFile.addCanvas(docID, "Nested Instance");

  // --- CircleBG SYMBOL (48x48, cr=1000 → circle) ---
  const circleBgID = id();
  figFile.addSymbol(
    symbolNode(circleBgID, canvas2)
      .name("CircleBG")
      .size(48, 48)
      .position(0, -200)
      .background(BLUE)
      .cornerRadius(1000)
      .clipsContent(true)
      .build(),
  );
  figFile.addRoundedRectangle(
    roundedRectNode(id(), circleBgID)
      .name("inner-fill")
      .size(48, 48)
      .position(0, 0)
      .fill(BLUE)
      .cornerRadius(1000)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("STRETCH")
      .build(),
  );

  // --- WindowControl SYMBOL (44x22, uses CircleBG) ---
  const windowControlID = id();
  figFile.addSymbol(
    symbolNode(windowControlID, canvas2)
      .name("WindowControl")
      .size(44, 22)
      .position(0, -100)
      .clipsContent(true)
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), windowControlID, circleBgID)
      .name("BG")
      .size(44, 22)
      .position(0, 0)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("STRETCH")
      .build(),
  );
  figFile.addEllipse(ellipseNode(id(), windowControlID).name("dot1").size(6, 6).position(10, 8).fill(RED).build());
  figFile.addEllipse(ellipseNode(id(), windowControlID).name("dot2").size(6, 6).position(19, 8).fill(ORANGE).build());
  figFile.addEllipse(ellipseNode(id(), windowControlID).name("dot3").size(6, 6).position(28, 8).fill(GREEN).build());

  // --- Test Frame: circle-to-pill (44x22) ---
  const f1 = id();
  figFile.addFrame(
    frameNode(f1, canvas2).name("circle-to-pill").size(80, 50).position(50, 50).background(WHITE).exportAsSVG().build(),
  );
  figFile.addInstance(
    instanceNode(id(), f1, windowControlID).name("control-pill").size(44, 22).position(18, 14).build(),
  );

  // --- Test Frame: circle-to-wide-pill (80x22) ---
  const f2 = id();
  figFile.addFrame(
    frameNode(f2, canvas2)
      .name("circle-to-wide-pill")
      .size(120, 50)
      .position(50, 120)
      .background(WHITE)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f2, windowControlID).name("control-wide").size(80, 22).position(20, 14).build(),
  );

  // --- RoundedBox SYMBOL (40x40, cr=10) ---
  const roundedBoxID = id();
  figFile.addSymbol(
    symbolNode(roundedBoxID, canvas2)
      .name("RoundedBox")
      .size(40, 40)
      .position(0, -300)
      .background(GREEN)
      .cornerRadius(10)
      .clipsContent(true)
      .build(),
  );
  figFile.addRoundedRectangle(
    roundedRectNode(id(), roundedBoxID)
      .name("bg-fill")
      .size(40, 40)
      .position(0, 0)
      .fill(GREEN)
      .cornerRadius(10)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("STRETCH")
      .build(),
  );

  // --- Test Frame: rounded-grow-h (100x40) ---
  const f3 = id();
  figFile.addFrame(
    frameNode(f3, canvas2)
      .name("rounded-grow-h")
      .size(140, 80)
      .position(50, 200)
      .background(WHITE)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(instanceNode(id(), f3, roundedBoxID).name("box-wide").size(100, 40).position(20, 20).build());

  // --- Test Frame: rounded-grow-both (100x60) ---
  const f4 = id();
  figFile.addFrame(
    frameNode(f4, canvas2)
      .name("rounded-grow-both")
      .size(140, 100)
      .position(50, 300)
      .background(WHITE)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(instanceNode(id(), f4, roundedBoxID).name("box-larger").size(100, 60).position(20, 20).build());

  // =========================================================================
  // Canvas 3: Multi-child
  // SYMBOL with 3 children having different constraints, resized together.
  // =========================================================================
  const canvas3 = figFile.addCanvas(docID, "Multi-child");

  const multiSymID = id();
  figFile.addSymbol(
    symbolNode(multiSymID, canvas3).name("MultiChild").size(200, 100).position(0, -200).clipsContent(true).build(),
  );

  // Child 1: STRETCH × STRETCH (background fill)
  figFile.addRoundedRectangle(
    roundedRectNode(id(), multiSymID)
      .name("bg")
      .size(200, 100)
      .position(0, 0)
      .fill({ r: 0.9, g: 0.9, b: 0.95, a: 1 })
      .cornerRadius(0)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("STRETCH")
      .build(),
  );

  // Child 2: CENTER × CENTER
  figFile.addRoundedRectangle(
    roundedRectNode(id(), multiSymID)
      .name("center-box")
      .size(60, 30)
      .position(70, 35)
      .fill(BLUE)
      .cornerRadius(8)
      .horizontalConstraint("CENTER")
      .verticalConstraint("CENTER")
      .build(),
  );

  // Child 3: MAX × MAX (anchored to bottom-right)
  figFile.addRoundedRectangle(
    roundedRectNode(id(), multiSymID)
      .name("corner-badge")
      .size(20, 20)
      .position(170, 70)
      .fill(RED)
      .cornerRadius(10)
      .horizontalConstraint("MAX")
      .verticalConstraint("MAX")
      .build(),
  );

  // Test frame: multi-child resized (200x100 → 300x160)
  const f5 = id();
  figFile.addFrame(
    frameNode(f5, canvas3)
      .name("multi-child-grow")
      .size(320, 180)
      .position(50, 50)
      .background(WHITE)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(instanceNode(id(), f5, multiSymID).name("multi-inst").size(300, 160).position(10, 10).build());

  // =========================================================================
  // Build
  // =========================================================================
  const figData = await figFile.buildAsync({ fileName: "constraints" });
  fs.writeFileSync(OUTPUT_FILE, figData);
  console.log(`Written: ${OUTPUT_FILE}`);
  console.log(`Size: ${(figData.byteLength / 1024).toFixed(1)} KB`);
}

generate().catch(console.error);
