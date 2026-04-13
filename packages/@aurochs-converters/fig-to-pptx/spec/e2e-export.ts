/**
 * @file E2E test: Fig → PPTX export and LibreOffice verification
 *
 * Usage:
 *   bun packages/@aurochs-converters/fig-to-pptx/spec/e2e-export.ts
 *
 * This script:
 * 1. Builds a FigDesignDocument with various shapes
 * 2. Converts to PresentationDocument via fig-to-pptx
 * 3. Creates a blank PPTX template (presentationFile)
 * 4. Exports to .pptx binary
 * 5. Writes to disk
 * 6. Optionally runs LibreOffice to convert to PDF for visual verification
 */

import { convert } from "@aurochs-converters/fig-to-pptx";
import { exportPptxAsBuffer } from "@aurochs-builder/pptx/export";
import type { FigDesignDocument, FigDesignNode, FigPage, FigPageId, FigNodeId } from "@aurochs/fig/domain";
import { DEFAULT_PAGE_BACKGROUND } from "@aurochs-builder/fig";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { createBlankPptxPackageFile } from "@aurochs-converters/pdf-to-pptx/importer/pptx-template";
import { openPresentation } from "@aurochs-office/pptx/app";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

// =============================================================================
// Test Document
// =============================================================================

function createTestFigDocument(): FigDesignDocument {
  const page: FigPage = {
    id: "0:1" as FigPageId,
    name: "Test Shapes",
    backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
    children: [
      // Blue rectangle
      createRect("0:2", "Blue Rectangle", 50, 50, 200, 120, { r: 0.267, g: 0.447, b: 0.769, a: 1 }),

      // Red ellipse (approximated as rectangle with ellipse node type)
      createEllipse("0:3", "Red Ellipse", 300, 50, 150, 100, { r: 0.8, g: 0.2, b: 0.2, a: 1 }),

      // Green rectangle with stroke
      createRectWithStroke("0:4", "Green Stroked", 50, 220, 180, 80,
        { r: 0.4, g: 0.8, b: 0.4, a: 1 },
        { r: 0, g: 0.4, b: 0, a: 1 },
        3,
      ),

      // Text node
      createTextNode("0:5", "Hello from Fig!", 300, 220, 200, 40, 24),

      // Semi-transparent rectangle
      createRect("0:6", "Semi-Transparent", 50, 350, 150, 80, { r: 1, g: 0.647, b: 0, a: 0.5 }),

      // Small text
      createTextNode("0:7", "Fig → PPTX conversion test", 250, 350, 250, 30, 14),

      // Rounded rectangle (via cornerRadius)
      createRoundedRect("0:8", "Rounded Rect", 50, 460, 180, 60, 15, { r: 0.5, g: 0.3, b: 0.7, a: 1 }),

      // Group with children
      createGroup("0:9", "Shape Group", 300, 400, 150, 120, [
        createRect("0:10", "Child 1", 0, 0, 60, 50, { r: 0.9, g: 0.9, b: 0.2, a: 1 }),
        createRect("0:11", "Child 2", 80, 30, 60, 50, { r: 0.2, g: 0.9, b: 0.9, a: 1 }),
      ]),
    ],
  };

  return {
    pages: [page],
    components: new Map(),
    images: new Map(),
    metadata: null,
  };
}

function createRect(
  id: string, name: string, x: number, y: number, w: number, h: number,
  color: { r: number; g: number; b: number; a: number },
): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "RECTANGLE",
    name,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
    size: { x: w, y: h },
    fills: [{ type: "SOLID" as const, visible: true, opacity: 1, color }],
    strokes: [],
    strokeWeight: 0,
    effects: [],
  };
}

function createEllipse(
  id: string, name: string, x: number, y: number, w: number, h: number,
  color: { r: number; g: number; b: number; a: number },
): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "ELLIPSE",
    name,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
    size: { x: w, y: h },
    fills: [{ type: "SOLID" as const, visible: true, opacity: 1, color }],
    strokes: [],
    strokeWeight: 0,
    effects: [],
  };
}

function createRectWithStroke(
  id: string, name: string, x: number, y: number, w: number, h: number,
  fillColor: { r: number; g: number; b: number; a: number },
  strokeColor: { r: number; g: number; b: number; a: number },
  strokeWidth: number,
): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "RECTANGLE",
    name,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
    size: { x: w, y: h },
    fills: [{ type: "SOLID" as const, visible: true, opacity: 1, color: fillColor }],
    strokes: [{ type: "SOLID" as const, visible: true, opacity: 1, color: strokeColor }],
    strokeWeight: strokeWidth,
    effects: [],
  };
}

function createRoundedRect(
  id: string, name: string, x: number, y: number, w: number, h: number,
  radius: number,
  color: { r: number; g: number; b: number; a: number },
): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "ROUNDED_RECTANGLE",
    name,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
    size: { x: w, y: h },
    fills: [{ type: "SOLID" as const, visible: true, opacity: 1, color }],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    cornerRadius: radius,
  };
}

function createTextNode(
  id: string, text: string, x: number, y: number, w: number, h: number,
  fontSize: number,
): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "TEXT",
    name: text,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
    size: { x: w, y: h },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    textData: {
      characters: text,
      fontSize,
      fontName: { family: "Arial", style: "Regular", postscript: "Arial-Regular" },
    },
  };
}

function createGroup(
  id: string, name: string, x: number, y: number, w: number, h: number,
  children: FigDesignNode[],
): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "GROUP",
    name,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
    size: { x: w, y: h },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    children,
  };
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const outDir = join(import.meta.dir, "__output__");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  console.log("1. Creating test FigDesignDocument...");
  const figDoc = createTestFigDocument();
  console.log(`   ${figDoc.pages[0].children.length} shapes on 1 page`);

  console.log("2. Converting Fig → PresentationDocument...");
  // Use default slide size (1280×720 = PowerPoint standard 16:9)
  const { data: presDoc } = await convert(figDoc);
  console.log(`   ${presDoc.slides.length} slides, ${presDoc.slides[0].slide.shapes.length} shapes`);

  console.log("3. Creating blank PPTX template and attaching apiSlide...");
  const templateFile = createBlankPptxPackageFile(
    presDoc.slides.length,
    { width: presDoc.slideWidth, height: presDoc.slideHeight },
  );
  const templatePresentation = openPresentation(templateFile);

  // Attach the template as presentationFile and wire up apiSlide
  // so exportPptx can detect shape changes and patch the slide XML.
  const slidesWithApi = presDoc.slides.map((slideWithId, index) => ({
    ...slideWithId,
    apiSlide: templatePresentation.getSlide(index + 1),
  }));

  const docWithTemplate = {
    ...presDoc,
    slides: slidesWithApi,
    presentationFile: templateFile,
  };

  console.log("4. Exporting to PPTX binary...");
  const buffer = await exportPptxAsBuffer(docWithTemplate);
  const pptxPath = join(outDir, "fig-to-pptx-test.pptx");
  writeFileSync(pptxPath, new Uint8Array(buffer));
  console.log(`   Written: ${pptxPath} (${buffer.byteLength} bytes)`);

  // Try LibreOffice conversion
  console.log("5. Attempting LibreOffice PDF conversion...");
  try {
    execSync(
      `soffice --headless --convert-to pdf --outdir "${outDir}" "${pptxPath}"`,
      { timeout: 30000, stdio: "pipe" },
    );
    const pdfPath = join(outDir, "fig-to-pptx-test.pdf");
    console.log(`   PDF: ${pdfPath}`);
  } catch {
    console.log("   LibreOffice not available or conversion failed. Skipping PDF generation.");
    console.log("   You can manually open the .pptx file to verify.");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("E2E export failed:", err);
  process.exit(1);
});
