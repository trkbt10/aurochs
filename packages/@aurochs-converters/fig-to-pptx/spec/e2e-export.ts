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
      createRect({ id: "0:2", name: "Blue Rectangle", x: 50, y: 50, w: 200, h: 120, color: { r: 0.267, g: 0.447, b: 0.769, a: 1 } }),

      // Red ellipse (approximated as rectangle with ellipse node type)
      createEllipse({ id: "0:3", name: "Red Ellipse", x: 300, y: 50, w: 150, h: 100, color: { r: 0.8, g: 0.2, b: 0.2, a: 1 } }),

      // Green rectangle with stroke
      createRectWithStroke({
        id: "0:4",
        name: "Green Stroked",
        x: 50,
        y: 220,
        w: 180,
        h: 80,
        fillColor: { r: 0.4, g: 0.8, b: 0.4, a: 1 },
        strokeColor: { r: 0, g: 0.4, b: 0, a: 1 },
        strokeWidth: 3,
      }),

      // Text node
      createTextNode({ id: "0:5", text: "Hello from Fig!", x: 300, y: 220, w: 200, h: 40, fontSize: 24 }),

      // Semi-transparent rectangle
      createRect({ id: "0:6", name: "Semi-Transparent", x: 50, y: 350, w: 150, h: 80, color: { r: 1, g: 0.647, b: 0, a: 0.5 } }),

      // Small text
      createTextNode({ id: "0:7", text: "Fig → PPTX conversion test", x: 250, y: 350, w: 250, h: 30, fontSize: 14 }),

      // Rounded rectangle (via cornerRadius)
      createRoundedRect({ id: "0:8", name: "Rounded Rect", x: 50, y: 460, w: 180, h: 60, radius: 15, color: { r: 0.5, g: 0.3, b: 0.7, a: 1 } }),

      // Group with children
      createGroup({
        id: "0:9",
        name: "Shape Group",
        x: 300,
        y: 400,
        w: 150,
        h: 120,
        children: [
          createRect({ id: "0:10", name: "Child 1", x: 0, y: 0, w: 60, h: 50, color: { r: 0.9, g: 0.9, b: 0.2, a: 1 } }),
          createRect({ id: "0:11", name: "Child 2", x: 80, y: 30, w: 60, h: 50, color: { r: 0.2, g: 0.9, b: 0.9, a: 1 } }),
        ],
      }),
    ],
  };

  return {
    pages: [page],
    components: new Map(),
    images: new Map(),
    metadata: null,
  };
}

type CreateRectOptions = {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly color: { r: number; g: number; b: number; a: number };
};

function createRect(
  { id, name, x, y, w, h, color }: CreateRectOptions,
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

type CreateEllipseOptions = {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly color: { r: number; g: number; b: number; a: number };
};

function createEllipse(
  { id, name, x, y, w, h, color }: CreateEllipseOptions,
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

type CreateRectWithStrokeOptions = {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly fillColor: { r: number; g: number; b: number; a: number };
  readonly strokeColor: { r: number; g: number; b: number; a: number };
  readonly strokeWidth: number;
};

function createRectWithStroke(
  { id, name, x, y, w, h, fillColor, strokeColor, strokeWidth }: CreateRectWithStrokeOptions,
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

type CreateRoundedRectOptions = {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly radius: number;
  readonly color: { r: number; g: number; b: number; a: number };
};

function createRoundedRect(
  { id, name, x, y, w, h, radius, color }: CreateRoundedRectOptions,
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

type CreateTextNodeOptions = {
  readonly id: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly fontSize: number;
};

function createTextNode(
  { id, text, x, y, w, h, fontSize }: CreateTextNodeOptions,
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

type CreateGroupOptions = {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly children: FigDesignNode[];
};

function createGroup(
  { id, name, x, y, w, h, children }: CreateGroupOptions,
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
  if (!existsSync(outDir)) {mkdirSync(outDir, { recursive: true });}

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
  } catch (error) {
    console.log(`   LibreOffice not available or conversion failed: ${String(error)}. Skipping PDF generation.`);
    console.log("   You can manually open the .pptx file to verify.");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("E2E export failed:", err);
  process.exit(1);
});
