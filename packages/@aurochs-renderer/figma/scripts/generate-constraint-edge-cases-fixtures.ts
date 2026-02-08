#!/usr/bin/env bun
/**
 * @file Generate constraint-edge-cases fixture .fig file
 *
 * Edge-case tests for constraint resolution:
 *
 * Canvas 1 — "Nested Constraints":  Cascading constraint resolution through nested instances
 * Canvas 2 — "Variant + Resize":    overriddenSymbolID combined with resize + constraints
 * Canvas 3 — "Ellipse Constraints": Constraint resolution on ELLIPSE nodes
 * Canvas 4 — "Asymmetric STRETCH":  Unequal margins with STRETCH constraint (grow & shrink)
 *
 * Usage:
 *   bun packages/@aurochs-renderer/figma/scripts/generate-constraint-edge-cases-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createFigFile, frameNode, symbolNode, instanceNode, roundedRectNode, ellipseNode } from "@aurochs/fig/builder";
import type { Color } from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/constraint-edge-cases");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "constraint-edge-cases.fig");

// =============================================================================
// Colors
// =============================================================================

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };
const IOS_BLUE: Color = { r: 0, g: 0.478, b: 1, a: 1 };
const IOS_GREEN: Color = { r: 0.204, g: 0.78, b: 0.349, a: 1 };
const IOS_RED: Color = { r: 1, g: 0.231, b: 0.188, a: 1 };
const IOS_ORANGE: Color = { r: 1, g: 0.584, b: 0, a: 1 };
const IOS_PURPLE: Color = { r: 0.686, g: 0.322, b: 0.871, a: 1 };
const IOS_GRAY_BG: Color = { r: 0.949, g: 0.949, b: 0.969, a: 1 };

// =============================================================================
// ID allocator
// =============================================================================

let nextID = 100;
function id(): number {
  return nextID++;
}

// =============================================================================
// Generate
// =============================================================================

async function generate(): Promise<void> {
  console.log("Generating constraint-edge-cases fixtures...\n");

  const figFile = createFigFile();
  const docID = figFile.addDocument("ConstraintEdgeCases");

  // =========================================================================
  // Canvas 1: "Nested Constraints" — Cascading constraint resolution
  // =========================================================================
  const canvas1 = figFile.addCanvas(docID, "Nested Constraints");

  // --- Symbol: NestInner (160x80, white bg, STRETCH child rect) ---
  const nestInnerID = id();
  figFile.addSymbol(
    symbolNode(nestInnerID, canvas1)
      .name("NestInner")
      .size(160, 80)
      .position(0, -600)
      .background(WHITE)
      .cornerRadius(8)
      .clipsContent(true)
      .build(),
  );
  const niChild = id();
  figFile.addRoundedRectangle(
    roundedRectNode(niChild, nestInnerID)
      .name("inner-rect")
      .size(120, 40)
      .position(20, 20) // margins: left=20, right=20, top=20, bottom=20
      .fill(IOS_BLUE)
      .cornerRadius(6)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("STRETCH")
      .build(),
  );

  // --- Symbol: NestOuter (300x200, gray bg, Instance of NestInner with STRETCH) ---
  const nestOuterID = id();
  figFile.addSymbol(
    symbolNode(nestOuterID, canvas1)
      .name("NestOuter")
      .size(300, 200)
      .position(300, -600)
      .background(IOS_GRAY_BG)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  const noInst = id();
  figFile.addInstance(
    instanceNode(noInst, nestOuterID, nestInnerID)
      .name("inner-instance")
      .size(160, 80)
      .position(70, 60) // margins: left=70, right=70, top=60, bottom=60
      .horizontalConstraint("STRETCH")
      .verticalConstraint("STRETCH")
      .build(),
  );

  // --- Canvas 1: Test Frames ---

  let frameX = 50;
  let frameY = 50;

  // 1. nested-stretch-grow: NestOuter enlarged → inner instance stretches → inner rect cascades
  const f_nested_grow = id();
  figFile.addFrame(
    frameNode(f_nested_grow, canvas1)
      .name("nested-stretch-grow")
      .size(420, 300)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_nested_grow, nestOuterID)
      .name("NestOuter-large")
      .size(400, 280) // +100x +80
      .position(10, 10)
      .build(),
  );

  frameX += 450;

  // 2. nested-stretch-shrink: NestOuter shrunk
  const f_nested_shrink = id();
  figFile.addFrame(
    frameNode(f_nested_shrink, canvas1)
      .name("nested-stretch-shrink")
      .size(220, 160)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_nested_shrink, nestOuterID)
      .name("NestOuter-small")
      .size(200, 140) // -100x -60
      .position(10, 10)
      .build(),
  );

  frameX = 50;
  frameY += 330;

  // 3. nested-same-size: NestOuter at original size (baseline)
  const f_nested_same = id();
  figFile.addFrame(
    frameNode(f_nested_same, canvas1)
      .name("nested-same-size")
      .size(320, 220)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_nested_same, nestOuterID)
      .name("NestOuter-same")
      .size(300, 200) // same as symbol
      .position(10, 10)
      .build(),
  );

  // =========================================================================
  // Canvas 2: "Variant + Resize" — overriddenSymbolID + resize + constraints
  // =========================================================================
  const canvas2 = figFile.addCanvas(docID, "Variant + Resize");

  // --- Symbol: VarBtnDefault (120x48, blue bg, STRETCH label placeholder) ---
  const varBtnDefaultID = id();
  figFile.addSymbol(
    symbolNode(varBtnDefaultID, canvas2)
      .name("VarBtnDefault")
      .size(120, 48)
      .position(0, -600)
      .background(IOS_BLUE)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  const vbdLabel = id();
  figFile.addRoundedRectangle(
    roundedRectNode(vbdLabel, varBtnDefaultID)
      .name("label")
      .size(80, 24)
      .position(20, 12) // margins: left=20, right=20, top=12, bottom=12
      .fill(WHITE)
      .opacity(0.2)
      .cornerRadius(4)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("STRETCH")
      .build(),
  );

  // --- Symbol: VarBtnActive (120x48, green bg, STRETCH label placeholder) ---
  const varBtnActiveID = id();
  figFile.addSymbol(
    symbolNode(varBtnActiveID, canvas2)
      .name("VarBtnActive")
      .size(120, 48)
      .position(200, -600)
      .background(IOS_GREEN)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  const vbaLabel = id();
  figFile.addRoundedRectangle(
    roundedRectNode(vbaLabel, varBtnActiveID)
      .name("label")
      .size(80, 24)
      .position(20, 12)
      .fill(WHITE)
      .opacity(0.3)
      .cornerRadius(4)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("STRETCH")
      .build(),
  );

  // --- Canvas 2: Test Frames ---

  frameX = 50;
  frameY = 50;

  // 4. variant-resize-default: VarBtnDefault at wider size (constraints applied)
  const f_var_resize_default = id();
  figFile.addFrame(
    frameNode(f_var_resize_default, canvas2)
      .name("variant-resize-default")
      .size(220, 80)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_var_resize_default, varBtnDefaultID)
      .name("VarBtnDefault-wide")
      .size(200, 60) // wider and taller than symbol
      .position(10, 10)
      .build(),
  );

  frameX += 250;

  // 5. variant-resize-override: overriddenSymbolID to VarBtnActive + resize
  const f_var_resize_override = id();
  figFile.addFrame(
    frameNode(f_var_resize_override, canvas2)
      .name("variant-resize-override")
      .size(220, 80)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_var_resize_override, varBtnDefaultID)
      .name("VarBtnActive-wide")
      .size(200, 60)
      .position(10, 10)
      .overrideSymbol(varBtnActiveID)
      .build(),
  );

  frameX = 50;
  frameY += 110;

  // 6. variant-resize-both: Side by side — default and overridden, both resized
  const f_var_both = id();
  figFile.addFrame(
    frameNode(f_var_both, canvas2)
      .name("variant-resize-both")
      .size(440, 80)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  // Default (blue) — wider
  figFile.addInstance(
    instanceNode(id(), f_var_both, varBtnDefaultID).name("default-wide").size(200, 60).position(10, 10).build(),
  );
  // Active (green via override) — wider
  figFile.addInstance(
    instanceNode(id(), f_var_both, varBtnDefaultID)
      .name("active-wide")
      .size(200, 60)
      .position(230, 10)
      .overrideSymbol(varBtnActiveID)
      .build(),
  );

  // =========================================================================
  // Canvas 3: "Ellipse Constraints" — Non-rectangle constraint resolution
  // =========================================================================
  const canvas3 = figFile.addCanvas(docID, "Ellipse Constraints");

  // --- Symbol: EllipseBox (200x120, white bg, ELLIPSE children with constraints) ---
  const ellipseBoxID = id();
  figFile.addSymbol(
    symbolNode(ellipseBoxID, canvas3)
      .name("EllipseBox")
      .size(200, 120)
      .position(0, -600)
      .background(WHITE)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  // Center ellipse (CENTER/CENTER)
  const ebCenter = id();
  figFile.addEllipse(
    ellipseNode(ebCenter, ellipseBoxID)
      .name("center-ellipse")
      .size(60, 40)
      .position(70, 40) // centered: (200-60)/2=70, (120-40)/2=40
      .fill(IOS_PURPLE)
      .horizontalConstraint("CENTER")
      .verticalConstraint("CENTER")
      .build(),
  );
  // Stretch ellipse (STRETCH/STRETCH)
  const ebStretch = id();
  figFile.addEllipse(
    ellipseNode(ebStretch, ellipseBoxID)
      .name("stretch-ellipse")
      .size(160, 80)
      .position(20, 20) // margins: 20 all around
      .fill(IOS_ORANGE)
      .opacity(0.5)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("STRETCH")
      .build(),
  );

  // --- Symbol: EllipseScaleBox (200x120, SCALE ellipse) ---
  const ellipseScaleBoxID = id();
  figFile.addSymbol(
    symbolNode(ellipseScaleBoxID, canvas3)
      .name("EllipseScaleBox")
      .size(200, 120)
      .position(300, -600)
      .background(IOS_GRAY_BG)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  const esChild = id();
  figFile.addEllipse(
    ellipseNode(esChild, ellipseScaleBoxID)
      .name("scaled-ellipse")
      .size(100, 60)
      .position(50, 30)
      .fill(IOS_RED)
      .horizontalConstraint("SCALE")
      .verticalConstraint("SCALE")
      .build(),
  );

  // --- Canvas 3: Test Frames ---

  frameX = 50;
  frameY = 50;

  // 7. ellipse-center-stretch-grow: EllipseBox enlarged
  const f_ell_grow = id();
  figFile.addFrame(
    frameNode(f_ell_grow, canvas3)
      .name("ellipse-center-stretch-grow")
      .size(320, 200)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_ell_grow, ellipseBoxID)
      .name("EllipseBox-large")
      .size(300, 180) // +100x +60
      .position(10, 10)
      .build(),
  );

  frameX += 350;

  // 8. ellipse-center-stretch-shrink: EllipseBox shrunk
  const f_ell_shrink = id();
  figFile.addFrame(
    frameNode(f_ell_shrink, canvas3)
      .name("ellipse-center-stretch-shrink")
      .size(180, 120)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_ell_shrink, ellipseBoxID)
      .name("EllipseBox-small")
      .size(160, 100) // -40x -20
      .position(10, 10)
      .build(),
  );

  frameX = 50;
  frameY += 230;

  // 9. ellipse-scale: EllipseScaleBox at 1.5x
  const f_ell_scale = id();
  figFile.addFrame(
    frameNode(f_ell_scale, canvas3)
      .name("ellipse-scale")
      .size(320, 200)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_ell_scale, ellipseScaleBoxID)
      .name("EllipseScale-large")
      .size(300, 180)
      .position(10, 10)
      .build(),
  );

  frameX += 350;

  // 10. ellipse-same-size: EllipseBox at original size (baseline)
  const f_ell_same = id();
  figFile.addFrame(
    frameNode(f_ell_same, canvas3)
      .name("ellipse-same-size")
      .size(220, 140)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_ell_same, ellipseBoxID).name("EllipseBox-same").size(200, 120).position(10, 10).build(),
  );

  // =========================================================================
  // Canvas 4: "Asymmetric STRETCH" — Unequal margins
  // =========================================================================
  const canvas4 = figFile.addCanvas(docID, "Asymmetric STRETCH");

  // --- Symbol: AsymBox (200x120, child at asymmetric position) ---
  // Child rect at pos=(10,15) size=(140,70)
  // → left=10, right=50, top=15, bottom=35  (all different!)
  const asymBoxID = id();
  figFile.addSymbol(
    symbolNode(asymBoxID, canvas4)
      .name("AsymBox")
      .size(200, 120)
      .position(0, -600)
      .background(WHITE)
      .cornerRadius(12)
      .clipsContent(true)
      .build(),
  );
  const abChild = id();
  figFile.addRoundedRectangle(
    roundedRectNode(abChild, asymBoxID)
      .name("asym-rect")
      .size(140, 70)
      .position(10, 15) // left=10, right=200-10-140=50; top=15, bottom=120-15-70=35
      .fill(IOS_RED)
      .cornerRadius(6)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("STRETCH")
      .build(),
  );

  // --- Symbol: AsymBoxWide (300x100, child with extreme asymmetry) ---
  // Child rect at pos=(30,10) size=(200,50)
  // → left=30, right=70, top=10, bottom=40
  const asymBoxWideID = id();
  figFile.addSymbol(
    symbolNode(asymBoxWideID, canvas4)
      .name("AsymBoxWide")
      .size(300, 100)
      .position(300, -600)
      .background(IOS_GRAY_BG)
      .cornerRadius(8)
      .clipsContent(true)
      .build(),
  );
  const abwChild = id();
  figFile.addRoundedRectangle(
    roundedRectNode(abwChild, asymBoxWideID)
      .name("wide-rect")
      .size(200, 50)
      .position(30, 10) // left=30, right=300-30-200=70; top=10, bottom=100-10-50=40
      .fill(IOS_GREEN)
      .cornerRadius(4)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("STRETCH")
      .build(),
  );

  // --- Symbol: AsymMultiChild (240x120, two children with different asymmetric margins) ---
  const asymMultiID = id();
  figFile.addSymbol(
    symbolNode(asymMultiID, canvas4)
      .name("AsymMultiChild")
      .size(240, 120)
      .position(600, -600)
      .background(WHITE)
      .cornerRadius(10)
      .clipsContent(true)
      .build(),
  );
  // Child 1: left=10, right=130  (small, left-aligned)  size=(100,40) at pos=(10,10)
  const amcChild1 = id();
  figFile.addRoundedRectangle(
    roundedRectNode(amcChild1, asymMultiID)
      .name("left-rect")
      .size(100, 40)
      .position(10, 10) // left=10, right=240-10-100=130; top=10, bottom=120-10-40=70
      .fill(IOS_BLUE)
      .cornerRadius(4)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("MIN")
      .build(),
  );
  // Child 2: left=130, right=10  (small, right-aligned)  size=(100,40) at pos=(130,70)
  const amcChild2 = id();
  figFile.addRoundedRectangle(
    roundedRectNode(amcChild2, asymMultiID)
      .name("right-rect")
      .size(100, 40)
      .position(130, 70) // left=130, right=240-130-100=10; top=70, bottom=120-70-40=10
      .fill(IOS_ORANGE)
      .cornerRadius(4)
      .horizontalConstraint("STRETCH")
      .verticalConstraint("MAX")
      .build(),
  );

  // --- Canvas 4: Test Frames ---

  frameX = 50;
  frameY = 50;

  // 11. asym-stretch-grow: AsymBox grown
  const f_asym_grow = id();
  figFile.addFrame(
    frameNode(f_asym_grow, canvas4)
      .name("asym-stretch-grow")
      .size(340, 220)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_asym_grow, asymBoxID)
      .name("AsymBox-large")
      .size(320, 200) // +120x +80
      .position(10, 10)
      .build(),
  );

  frameX += 370;

  // 12. asym-stretch-shrink: AsymBox shrunk
  const f_asym_shrink = id();
  figFile.addFrame(
    frameNode(f_asym_shrink, canvas4)
      .name("asym-stretch-shrink")
      .size(140, 100)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_asym_shrink, asymBoxID)
      .name("AsymBox-small")
      .size(120, 80) // -80x -40
      .position(10, 10)
      .build(),
  );

  // Row 2
  frameX = 50;
  frameY += 250;

  // 13. asym-wide-grow: AsymBoxWide grown
  const f_wide_grow = id();
  figFile.addFrame(
    frameNode(f_wide_grow, canvas4)
      .name("asym-wide-grow")
      .size(420, 160)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_wide_grow, asymBoxWideID)
      .name("AsymBoxWide-large")
      .size(400, 140) // +100x +40
      .position(10, 10)
      .build(),
  );

  frameX += 450;

  // 14. asym-wide-shrink: AsymBoxWide shrunk
  const f_wide_shrink = id();
  figFile.addFrame(
    frameNode(f_wide_shrink, canvas4)
      .name("asym-wide-shrink")
      .size(220, 80)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_wide_shrink, asymBoxWideID)
      .name("AsymBoxWide-small")
      .size(200, 60) // -100x -40
      .position(10, 10)
      .build(),
  );

  // Row 3
  frameX = 50;
  frameY += 190;

  // 15. asym-multi-grow: AsymMultiChild grown (two children with inverse margins)
  const f_multi_grow = id();
  figFile.addFrame(
    frameNode(f_multi_grow, canvas4)
      .name("asym-multi-grow")
      .size(380, 200)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_multi_grow, asymMultiID)
      .name("AsymMulti-large")
      .size(360, 180) // +120x +60
      .position(10, 10)
      .build(),
  );

  frameX += 410;

  // 16. asym-multi-shrink: AsymMultiChild shrunk
  const f_multi_shrink = id();
  figFile.addFrame(
    frameNode(f_multi_shrink, canvas4)
      .name("asym-multi-shrink")
      .size(200, 120)
      .position(frameX, frameY)
      .background(IOS_GRAY_BG)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_multi_shrink, asymMultiID)
      .name("AsymMulti-small")
      .size(180, 100) // -60x -20
      .position(10, 10)
      .build(),
  );

  // Row 4
  frameX = 50;
  frameY += 230;

  // 17. asym-same-size: AsymBox at original size (baseline)
  const f_asym_same = id();
  figFile.addFrame(
    frameNode(f_asym_same, canvas4)
      .name("asym-same-size")
      .size(220, 140)
      .position(frameX, frameY)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  figFile.addInstance(
    instanceNode(id(), f_asym_same, asymBoxID).name("AsymBox-same").size(200, 120).position(10, 10).build(),
  );

  // =========================================================================
  // Build and Write
  // =========================================================================

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const subdir of ["actual", "snapshots"]) {
    const dir = path.join(OUTPUT_DIR, subdir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const figData = await figFile.buildAsync({ fileName: "constraint-edge-cases" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`\n=== Structure ===`);
  console.log(`4 canvases, ${nextID - 100} nodes total\n`);

  console.log(`Canvas 1: "Nested Constraints" — Cascading constraint resolution`);
  console.log(`  Symbols: NestInner (160x80), NestOuter (300x200)`);
  console.log(`  Test frames (3):`);
  console.log(`    1. nested-stretch-grow — NestOuter enlarged (400x280)`);
  console.log(`    2. nested-stretch-shrink — NestOuter shrunk (200x140)`);
  console.log(`    3. nested-same-size — NestOuter at original (baseline)`);

  console.log(`\nCanvas 2: "Variant + Resize" — overriddenSymbolID + resize + constraints`);
  console.log(`  Symbols: VarBtnDefault (blue, 120x48), VarBtnActive (green, 120x48)`);
  console.log(`  Test frames (3):`);
  console.log(`    4. variant-resize-default — default button wider (200x60)`);
  console.log(`    5. variant-resize-override — overridden to active + wider`);
  console.log(`    6. variant-resize-both — default & overridden side by side`);

  console.log(`\nCanvas 3: "Ellipse Constraints" — Non-rectangle constraints`);
  console.log(`  Symbols: EllipseBox (CENTER + STRETCH ellipses), EllipseScaleBox (SCALE ellipse)`);
  console.log(`  Test frames (4):`);
  console.log(`    7. ellipse-center-stretch-grow — enlarged (300x180)`);
  console.log(`    8. ellipse-center-stretch-shrink — shrunk (160x100)`);
  console.log(`    9. ellipse-scale — SCALE at 1.5x (300x180)`);
  console.log(`   10. ellipse-same-size — original size (baseline)`);

  console.log(`\nCanvas 4: "Asymmetric STRETCH" — Unequal margins`);
  console.log(`  Symbols: AsymBox (l=10,r=50,t=15,b=35), AsymBoxWide (l=30,r=70), AsymMultiChild (inverse margins)`);
  console.log(`  Test frames (7):`);
  console.log(`   11. asym-stretch-grow — AsymBox enlarged (320x200)`);
  console.log(`   12. asym-stretch-shrink — AsymBox shrunk (120x80)`);
  console.log(`   13. asym-wide-grow — AsymBoxWide enlarged (400x140)`);
  console.log(`   14. asym-wide-shrink — AsymBoxWide shrunk (200x60)`);
  console.log(`   15. asym-multi-grow — AsymMultiChild enlarged (360x180)`);
  console.log(`   16. asym-multi-shrink — AsymMultiChild shrunk (180x100)`);
  console.log(`   17. asym-same-size — AsymBox at original (baseline)`);
}

generate().catch(console.error);
