#!/usr/bin/env bun
/**
 * @file Generate frame-properties fixture .fig file
 *
 * Tests FRAME-level properties commonly missed in rendering:
 * - FRAME with background fill
 * - FRAME with corner radius + clip
 * - FRAME with opacity, effects, and stroke
 * - Nested FRAMEs with different fills
 * - INSTANCE inside FRAME
 * - FRAME overflow clipping
 *
 * Usage:
 *   bun packages/@aurochs-renderer/fig/scripts/generate-frame-properties-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFigFile,
  frameNode,
  roundedRectNode,
  dropShadow,
  innerShadow,
  effects,
  solidPaint,
  type EffectData,
  type Paint,
} from "@aurochs/fig/builder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/frame-properties");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "frame-properties.fig");

type AddFrameOptions = {
  fill?: { r: number; g: number; b: number };
  fillPaint?: Paint;
  cornerRadius?: number;
  opacity?: number;
  effects?: readonly EffectData[];
  stroke?: { r: number; g: number; b: number; a: number };
  strokeWeight?: number;
};

type AddFrameArgs = readonly [
  name: string,
  width: number,
  height: number,
  buildFn: (frameID: number) => void,
  opts?: AddFrameOptions,
];

async function generate(): Promise<void> {
  console.log("Generating frame-properties fixtures...");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const figFile = createFigFile();
  const docID = figFile.addDocument("Frame Properties");
  const canvasID = figFile.addCanvas(docID, "Frames Canvas");
  figFile.addInternalCanvas(docID);

  const id = { value: 10 };
  const nextId = () => id.value++;
  let frameX = 0;

  function addFrame(...args: AddFrameArgs): void {
    const [name, width, height, buildFn, opts] = args;
    const frameID = nextId();
    const builder = frameNode(frameID, canvasID)
      .name(name)
      .size(width, height)
      .position(frameX, 0)
      .clipsContent(true)
      .exportAsSVG();
    if (opts?.fill) {
      builder.background({ r: opts.fill.r, g: opts.fill.g, b: opts.fill.b, a: 1 });
    }
    if (opts?.fillPaint) {
      builder.fill(opts.fillPaint);
    }
    if (opts?.cornerRadius) {
      builder.cornerRadius(opts.cornerRadius);
    }
    if (opts?.opacity !== undefined) {
      builder.opacity(opts.opacity);
    }
    if (opts?.effects) {
      builder.effects(opts.effects);
    }
    if (opts?.stroke) {
      builder.stroke(opts.stroke);
    }
    if (opts?.strokeWeight !== undefined) {
      builder.strokeWeight(opts.strokeWeight);
    }
    figFile.addFrame(builder.build());
    buildFn(frameID);
    frameX += width + 20;
  }

  // =========================================================================
  // 1. FRAME with solid background fill
  // =========================================================================
  addFrame("frame-bg-fill", 150, 100, (pid) => {
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), pid).name("inner").size(60, 60).position(20, 20)
        .fill({ r: 1, g: 1, b: 1, a: 1 }).build(),
    );
  }, { fill: { r: 0.2, g: 0.5, b: 0.9 } });

  // =========================================================================
  // 2. FRAME with corner radius + clip (card)
  // =========================================================================
  addFrame("frame-corner-clip", 150, 100, (pid) => {
    // Overflowing rect — should be clipped at rounded corners
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), pid).name("overflow").size(200, 40).position(-25, 10)
        .fill({ r: 0.2, g: 0.7, b: 0.4, a: 1 }).build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), pid).name("content").size(100, 30).position(25, 60)
        .fill({ r: 0.3, g: 0.3, b: 0.3, a: 1 }).build(),
    );
  }, { fill: { r: 1, g: 1, b: 1 }, cornerRadius: 16 });

  // =========================================================================
  // 3. Nested FRAMEs with different backgrounds
  // =========================================================================
  addFrame("frame-nested", 200, 150, (pid) => {
    const innerId = nextId();
    figFile.addFrame(
      frameNode(innerId, pid).name("inner-frame").size(160, 110).position(20, 20)
        .background({ r: 0.9, g: 0.3, b: 0.3, a: 1 }).clipsContent(true).build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), innerId).name("deep-rect").size(80, 60).position(40, 25)
        .fill({ r: 0.2, g: 0.2, b: 0.9, a: 1 }).build(),
    );
  }, { fill: { r: 0.95, g: 0.95, b: 0.95 } });

  // =========================================================================
  // 4. Passport-like: FRAME with fill + corner radius + header sub-frame
  // =========================================================================
  addFrame("frame-passport", 200, 140, (pid) => {
    const headerId = nextId();
    figFile.addFrame(
      frameNode(headerId, pid).name("header").size(200, 50).position(0, 0)
        .background({ r: 0.2, g: 0.3, b: 0.6, a: 1 }).build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), headerId).name("title-bg").size(120, 30).position(40, 10)
        .fill({ r: 1, g: 1, b: 1, a: 1 }).opacity(0.3).cornerRadius(4).build(),
    );
    for (let i = 0; i < 3; i++) {
      figFile.addRoundedRectangle(
        roundedRectNode(nextId(), pid).name(`line-${i}`).size(160 - i * 20, 12).position(20, 65 + i * 22)
          .fill({ r: 0.6, g: 0.6, b: 0.6, a: 1 }).cornerRadius(2).build(),
      );
    }
  }, { fill: { r: 0.96, g: 0.96, b: 0.96 }, cornerRadius: 12 });

  // =========================================================================
  // 5. INSTANCE inside FRAME — deferred until symbolNode API is verified
  // =========================================================================

  // =========================================================================
  // 6. Children with drop shadow inside FRAME
  // =========================================================================
  addFrame("frame-child-effects", 200, 120, (pid) => {
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), pid).name("shadow-rect").size(100, 60).position(20, 20)
        .fill({ r: 0.3, g: 0.5, b: 0.9, a: 1 }).cornerRadius(8)
        // .effects(effects(dropShadow().offset(0, 4).blur(8).color(0, 0, 0, 0.25)))
        .build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), pid).name("plain-rect").size(60, 40).position(130, 40)
        .fill({ r: 0.9, g: 0.2, b: 0.3, a: 1 })
        .build(),
    );
  }, { fill: { r: 1, g: 1, b: 1 } });

  // =========================================================================
  // 7. FRAME opacity with children (group compositing)
  // =========================================================================
  addFrame("frame-opacity", 150, 100, (pid) => {
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), pid).name("opacity-child-a").size(90, 70).position(10, 15)
        .fill({ r: 0.1, g: 0.6, b: 0.9, a: 1 }).cornerRadius(6).build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), pid).name("opacity-child-b").size(80, 60).position(55, 25)
        .fill({ r: 0.95, g: 0.2, b: 0.25, a: 1 }).cornerRadius(6).build(),
    );
  }, { fill: { r: 1, g: 0.9, b: 0.2 }, opacity: 0.5 });

  // =========================================================================
  // 8. FRAME drop shadow effect
  // =========================================================================
  addFrame("frame-drop-shadow", 150, 100, (pid) => {
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), pid).name("drop-shadow-child").size(80, 40).position(35, 30)
        .fill({ r: 1, g: 1, b: 1, a: 1 }).cornerRadius(4).build(),
    );
  }, {
    fillPaint: solidPaint({ r: 0.2, g: 0.45, b: 0.9, a: 1 }).opacity(0.7).build(),
    effects: effects(dropShadow().offset(0, 6).blur(12).color({ r: 0, g: 0, b: 0, a: 0.35 })),
    cornerRadius: 10,
  });

  // =========================================================================
  // 9. FRAME inner shadow effect
  // =========================================================================
  addFrame("frame-inner-shadow", 150, 100, (pid) => {
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), pid).name("inner-shadow-child").size(90, 42).position(30, 29)
        .fill({ r: 1, g: 1, b: 1, a: 0.85 }).cornerRadius(6).build(),
    );
  }, {
    fill: { r: 0.9, g: 0.95, b: 1 },
    effects: effects(innerShadow().offset(0, 4).blur(10).color({ r: 0, g: 0, b: 0, a: 0.4 })),
    cornerRadius: 12,
  });

  // =========================================================================
  // 10. FRAME stroke border
  // =========================================================================
  addFrame("frame-stroke", 150, 100, (pid) => {
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), pid).name("stroke-child").size(90, 46).position(30, 27)
        .fill({ r: 0.2, g: 0.7, b: 0.4, a: 1 }).cornerRadius(6).build(),
    );
  }, {
    fill: { r: 1, g: 1, b: 1 },
    stroke: { r: 0.05, g: 0.05, b: 0.05, a: 1 },
    strokeWeight: 4,
    cornerRadius: 10,
  });

  // =========================================================================
  // 11. Multiple overlapping children (opacity compositing)
  // =========================================================================
  addFrame("frame-overlap", 150, 100, (pid) => {
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), pid).name("rect-a").size(80, 80).position(10, 10)
        .fill({ r: 0.9, g: 0.2, b: 0.2, a: 1 }).build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), pid).name("rect-b").size(80, 80).position(60, 10)
        .fill({ r: 0.2, g: 0.2, b: 0.9, a: 1 }).opacity(0.5).build(),
    );
  }, { fill: { r: 1, g: 1, b: 1 } });

  // =========================================================================
  // 12. Deep nested clip chain
  // =========================================================================
  addFrame("frame-deep-clip", 200, 150, (pid) => {
    const level1 = nextId();
    figFile.addFrame(
      frameNode(level1, pid).name("level-1").size(180, 130).position(10, 10)
        .background({ r: 0.9, g: 0.9, b: 0.95, a: 1 }).cornerRadius(12).clipsContent(true).build(),
    );
    const level2 = nextId();
    figFile.addFrame(
      frameNode(level2, level1).name("level-2").size(140, 90).position(20, 20)
        .background({ r: 0.85, g: 0.85, b: 0.92, a: 1 }).cornerRadius(8).clipsContent(true).build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(nextId(), level2).name("deep-overflow").size(200, 50).position(-30, 20)
        .fill({ r: 0.2, g: 0.7, b: 0.4, a: 1 }).build(),
    );
  }, { fill: { r: 1, g: 1, b: 1 } });

  // =========================================================================
  // Build and save
  // =========================================================================
  const figData = await figFile.buildAsync({ fileName: "frame-properties" });
  fs.writeFileSync(OUTPUT_FILE, figData);
  console.log(`Written: ${OUTPUT_FILE} (${figData.length} bytes)`);
  console.log("Done!");
  console.log("");
  console.log("Next steps:");
  console.log("1. Open frame-properties.fig in Figma");
  console.log("2. Export each frame as SVG to fixtures/frame-properties/actual/");
  console.log("3. Run comparison test");
}

generate().catch(console.error);
