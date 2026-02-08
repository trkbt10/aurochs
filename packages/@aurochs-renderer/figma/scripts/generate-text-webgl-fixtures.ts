#!/usr/bin/env bun
/**
 * @file Generate text WebGL fixture .fig file with glyph outlines
 *
 * Creates a .fig file with focused text test cases. Each text node includes
 * derivedTextData with glyph outline blobs so the renderer produces <path>
 * elements instead of <text> elements (matching Figma's SVG export).
 *
 * Usage:
 *   bun packages/@aurochs-renderer/figma/scripts/generate-text-webgl-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import { createFigFile, frameNode, textNode, roundedRectNode, ellipseNode, type FigBlob } from "@aurochs/fig/builder";
import {
  generateTextGlyphs,
  generateMultilineTextGlyphs,
  computeBaselineY,
  computeAutoLineHeight,
  type GlyphGenResult,
} from "./lib/glyph-generator";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../fixtures/text-webgl");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "text-webgl.fig");

// Font paths from @fontsource/inter
const FONT_DIR = path.resolve(process.cwd(), "node_modules/@fontsource/inter/files");
const INTER_REGULAR = path.join(FONT_DIR, "inter-latin-400-normal.woff");
const INTER_BOLD = path.join(FONT_DIR, "inter-latin-700-normal.woff");

// =============================================================================
// Color Helpers
// =============================================================================

type Color = { r: number; g: number; b: number; a: number };

const white: Color = { r: 1, g: 1, b: 1, a: 1 };
const black: Color = { r: 0, g: 0, b: 0, a: 1 };
const lightGray: Color = { r: 0.94, g: 0.94, b: 0.94, a: 1 };

function rgb(r: number, g: number, b: number): Color {
  return { r, g, b, a: 1 };
}

// =============================================================================
// Helpers
// =============================================================================

type FigFile = ReturnType<typeof createFigFile>;

/**
 * Add text node with glyph outline blobs to a figFile.
 * Returns the text node's local ID.
 */
function addTextWithGlyphs(
  figFile: FigFile,
  builder: ReturnType<typeof textNode>,
  glyphResult: GlyphGenResult,
): number {
  // Add blobs and remap indices
  const blobIndices = glyphResult.blobs.map((b) => figFile.addBlob(b));
  const glyphs = glyphResult.glyphs.map((g) => ({
    ...g,
    commandsBlob: blobIndices[g.commandsBlob] ?? g.commandsBlob,
  }));

  return figFile.addTextNode(
    builder
      .derivedTextData({
        layoutSize: glyphResult.layoutSize,
        baselines: glyphResult.baselines,
        glyphs,
      })
      .build(),
  );
}

// =============================================================================
// Generate .fig File
// =============================================================================

async function generateTextFixtures(): Promise<void> {
  console.log("Generating text WebGL fixtures with glyph outlines...");

  // Load fonts
  if (!fs.existsSync(INTER_REGULAR)) {
    throw new Error(`Inter Regular font not found: ${INTER_REGULAR}`);
  }
  if (!fs.existsSync(INTER_BOLD)) {
    throw new Error(`Inter Bold font not found: ${INTER_BOLD}`);
  }

  const interRegular = opentype.loadSync(INTER_REGULAR);
  const interBold = opentype.loadSync(INTER_BOLD);

  console.log(
    `  Inter Regular: unitsPerEm=${interRegular.unitsPerEm}, ascender=${interRegular.ascender}, descender=${interRegular.descender}`,
  );
  console.log(
    `  Inter Bold: unitsPerEm=${interBold.unitsPerEm}, ascender=${interBold.ascender}, descender=${interBold.descender}`,
  );

  const figFile = createFigFile();

  const docID = figFile.addDocument("Text WebGL");
  const canvasID = figFile.addCanvas(docID, "Text Canvas");
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

  // ---- text-basic: Hello World in Inter Regular 16px ----
  {
    const pos = gridPos();
    const frameID = id();
    const fontSize = 16;
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("text-basic")
        .size(200, 60)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    const glyphs = generateTextGlyphs({
      text: "Hello World",
      font: interRegular,
      fontSize,
      baselineX: 0,
      baselineY: computeBaselineY(interRegular, fontSize),
    });
    addTextWithGlyphs(
      figFile,
      textNode(id(), frameID)
        .name("hello")
        .text("Hello World")
        .font("Inter", "Regular")
        .fontSize(fontSize)
        .color(black)
        .size(180, 30)
        .position(10, 15),
      glyphs,
    );
  }

  // ---- text-bold ----
  {
    const pos = gridPos();
    const frameID = id();
    const fontSize = 16;
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("text-bold")
        .size(200, 60)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    const glyphs = generateTextGlyphs({
      text: "Bold Text",
      font: interBold,
      fontSize,
      baselineX: 0,
      baselineY: computeBaselineY(interBold, fontSize),
    });
    addTextWithGlyphs(
      figFile,
      textNode(id(), frameID)
        .name("bold-text")
        .text("Bold Text")
        .font("Inter", "Bold")
        .fontSize(fontSize)
        .color(black)
        .size(180, 30)
        .position(10, 15),
      glyphs,
    );
  }

  // ---- text-small: 10px text ----
  {
    const pos = gridPos();
    const frameID = id();
    const fontSize = 10;
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("text-small")
        .size(200, 40)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    const glyphs = generateTextGlyphs({
      text: "Small text at 10px",
      font: interRegular,
      fontSize,
      baselineX: 0,
      baselineY: computeBaselineY(interRegular, fontSize),
    });
    addTextWithGlyphs(
      figFile,
      textNode(id(), frameID)
        .name("small-text")
        .text("Small text at 10px")
        .font("Inter", "Regular")
        .fontSize(fontSize)
        .color(black)
        .size(180, 20)
        .position(10, 10),
      glyphs,
    );
  }

  // ---- text-large: 48px text ----
  {
    const pos = gridPos();
    const frameID = id();
    const fontSize = 48;
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("text-large")
        .size(200, 80)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    const glyphs = generateTextGlyphs({
      text: "Big",
      font: interBold,
      fontSize,
      baselineX: 0,
      baselineY: computeBaselineY(interBold, fontSize),
    });
    addTextWithGlyphs(
      figFile,
      textNode(id(), frameID)
        .name("large-text")
        .text("Big")
        .font("Inter", "Bold")
        .fontSize(fontSize)
        .color(black)
        .size(180, 60)
        .position(10, 10),
      glyphs,
    );
  }

  // ---- text-multiline ----
  {
    const pos = gridPos();
    const frameID = id();
    const fontSize = 14;
    const text = "Line one\nLine two\nLine three";
    const lines = text.split("\n");
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("text-multiline")
        .size(200, 100)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    const glyphs = generateMultilineTextGlyphs({
      lines,
      font: interRegular,
      fontSize,
      baselineX: 0,
      firstBaselineY: computeBaselineY(interRegular, fontSize),
      lineHeight: computeAutoLineHeight(interRegular, fontSize),
    });
    addTextWithGlyphs(
      figFile,
      textNode(id(), frameID)
        .name("multiline")
        .text(text)
        .font("Inter", "Regular")
        .fontSize(fontSize)
        .color(black)
        .size(180, 80)
        .position(10, 10),
      glyphs,
    );
  }

  // ---- text-colors: red, green, blue text side by side ----
  {
    const pos = gridPos();
    const frameID = id();
    const fontSize = 14;
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("text-colors")
        .size(200, 60)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );

    const baselineY = computeBaselineY(interBold, fontSize);

    for (const { text, color, posX } of [
      { text: "Red", color: rgb(0.9, 0.1, 0.1), posX: 10 },
      { text: "Green", color: rgb(0.1, 0.7, 0.1), posX: 70 },
      { text: "Blue", color: rgb(0.1, 0.1, 0.9), posX: 130 },
    ]) {
      const glyphs = generateTextGlyphs({
        text,
        font: interBold,
        fontSize,
        baselineX: 0,
        baselineY,
      });
      addTextWithGlyphs(
        figFile,
        textNode(id(), frameID)
          .name(text.toLowerCase())
          .text(text)
          .font("Inter", "Bold")
          .fontSize(fontSize)
          .color(color)
          .size(50, 30)
          .position(posX, 15),
        glyphs,
      );
    }
  }

  // ---- text-align-left ----
  {
    const pos = gridPos();
    const frameID = id();
    const fontSize = 14;
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("text-align-left")
        .size(200, 60)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    const glyphs = generateTextGlyphs({
      text: "Left aligned",
      font: interRegular,
      fontSize,
      baselineX: 0,
      baselineY: computeBaselineY(interRegular, fontSize),
    });
    addTextWithGlyphs(
      figFile,
      textNode(id(), frameID)
        .name("left-aligned")
        .text("Left aligned")
        .font("Inter", "Regular")
        .fontSize(fontSize)
        .color(black)
        .alignHorizontal("LEFT")
        .size(180, 30)
        .position(10, 15),
      glyphs,
    );
  }

  // ---- text-align-center ----
  {
    const pos = gridPos();
    const frameID = id();
    const fontSize = 14;
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("text-align-center")
        .size(200, 60)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    const glyphs = generateTextGlyphs({
      text: "Center aligned",
      font: interRegular,
      fontSize,
      baselineX: 0,
      baselineY: computeBaselineY(interRegular, fontSize),
    });
    addTextWithGlyphs(
      figFile,
      textNode(id(), frameID)
        .name("center-aligned")
        .text("Center aligned")
        .font("Inter", "Regular")
        .fontSize(fontSize)
        .color(black)
        .alignHorizontal("CENTER")
        .size(180, 30)
        .position(10, 15),
      glyphs,
    );
  }

  // ---- text-align-right ----
  {
    const pos = gridPos();
    const frameID = id();
    const fontSize = 14;
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("text-align-right")
        .size(200, 60)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    const glyphs = generateTextGlyphs({
      text: "Right aligned",
      font: interRegular,
      fontSize,
      baselineX: 0,
      baselineY: computeBaselineY(interRegular, fontSize),
    });
    addTextWithGlyphs(
      figFile,
      textNode(id(), frameID)
        .name("right-aligned")
        .text("Right aligned")
        .font("Inter", "Regular")
        .fontSize(fontSize)
        .color(black)
        .alignHorizontal("RIGHT")
        .size(180, 30)
        .position(10, 15),
      glyphs,
    );
  }

  // ---- text-in-clip: text inside 1-level clip ----
  {
    const pos = gridPos();
    const frameID = id();
    const fontSize = 14;
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("text-in-clip")
        .size(200, 80)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    const clipID = id();
    figFile.addFrame(
      frameNode(clipID, frameID)
        .name("clip")
        .size(160, 50)
        .position(20, 15)
        .background(lightGray)
        .clipsContent(true)
        .build(),
    );
    const glyphs = generateTextGlyphs({
      text: "Clipped text content here",
      font: interRegular,
      fontSize,
      baselineX: 0,
      baselineY: computeBaselineY(interRegular, fontSize),
    });
    addTextWithGlyphs(
      figFile,
      textNode(id(), clipID)
        .name("clipped-text")
        .text("Clipped text content here")
        .font("Inter", "Regular")
        .fontSize(fontSize)
        .color(black)
        .size(200, 30)
        .position(5, 10),
      glyphs,
    );
  }

  // ---- text-in-nested-clip: text inside 2-level nested clip ----
  {
    const pos = gridPos();
    const outerID = id();
    const fontSize = 14;
    figFile.addFrame(
      frameNode(outerID, canvasID)
        .name("text-in-nested-clip")
        .size(200, 100)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    const innerID = id();
    figFile.addFrame(
      frameNode(innerID, outerID)
        .name("inner-clip")
        .size(160, 70)
        .position(20, 15)
        .background(lightGray)
        .clipsContent(true)
        .build(),
    );
    const deepID = id();
    figFile.addFrame(
      frameNode(deepID, innerID).name("deep-clip").size(130, 40).position(15, 15).clipsContent(true).build(),
    );
    const glyphs = generateTextGlyphs({
      text: "Nested clip text",
      font: interRegular,
      fontSize,
      baselineX: 0,
      baselineY: computeBaselineY(interRegular, fontSize),
    });
    addTextWithGlyphs(
      figFile,
      textNode(id(), deepID)
        .name("nested-text")
        .text("Nested clip text")
        .font("Inter", "Regular")
        .fontSize(fontSize)
        .color(black)
        .size(120, 30)
        .position(5, 5),
      glyphs,
    );
  }

  // ---- text-with-shape: text alongside shapes ----
  {
    const pos = gridPos();
    const frameID = id();
    figFile.addFrame(
      frameNode(frameID, canvasID)
        .name("text-with-shape")
        .size(200, 100)
        .position(pos.x, pos.y)
        .background(white)
        .clipsContent(true)
        .exportAsSVG()
        .build(),
    );
    figFile.addRoundedRectangle(
      roundedRectNode(id(), frameID)
        .name("bg-card")
        .size(180, 80)
        .position(10, 10)
        .fill(rgb(0.93, 0.93, 0.98))
        .cornerRadius(8)
        .build(),
    );
    figFile.addEllipse(
      ellipseNode(id(), frameID)
        .name("avatar")
        .size(40, 40)
        .position(20, 30)
        .fill(rgb(0.3, 0.5, 0.9))
        .build(),
    );

    // Title text
    {
      const fontSize = 16;
      const glyphs = generateTextGlyphs({
        text: "Card Title",
        font: interBold,
        fontSize,
        baselineX: 0,
        baselineY: computeBaselineY(interBold, fontSize),
      });
      addTextWithGlyphs(
        figFile,
        textNode(id(), frameID)
          .name("title")
          .text("Card Title")
          .font("Inter", "Bold")
          .fontSize(fontSize)
          .color(black)
          .size(110, 24)
          .position(75, 25),
        glyphs,
      );
    }

    // Subtitle text
    {
      const fontSize = 12;
      const glyphs = generateTextGlyphs({
        text: "Description text",
        font: interRegular,
        fontSize,
        baselineX: 0,
        baselineY: computeBaselineY(interRegular, fontSize),
      });
      addTextWithGlyphs(
        figFile,
        textNode(id(), frameID)
          .name("subtitle")
          .text("Description text")
          .font("Inter", "Regular")
          .fontSize(fontSize)
          .color(rgb(0.4, 0.4, 0.4))
          .size(110, 20)
          .position(75, 55),
        glyphs,
      );
    }
  }

  // Ensure output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const actualDir = path.join(OUTPUT_DIR, "actual");
  if (!fs.existsSync(actualDir)) {
    fs.mkdirSync(actualDir, { recursive: true });
  }

  const figData = await figFile.buildAsync({ fileName: "text-webgl" });
  fs.writeFileSync(OUTPUT_FILE, figData);

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Frames: ${frameIndex}`);
  console.log(`\nFrame list:`);
  const names = [
    "text-basic",
    "text-bold",
    "text-small",
    "text-large",
    "text-multiline",
    "text-colors",
    "text-align-left",
    "text-align-center",
    "text-align-right",
    "text-in-clip",
    "text-in-nested-clip",
    "text-with-shape",
  ];
  for (const name of names) {
    console.log(`  - ${name}`);
  }
}

generateTextFixtures().catch(console.error);
