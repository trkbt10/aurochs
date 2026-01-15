/**
 * @file Shape fill diagnostic for panel2.pdf
 *
 * This diagnostic script analyzes the PDF import process to identify
 * why shapes (especially architecture diagrams) are being filled incorrectly.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { loadNativePdfDocument } from "../../src/pdf/native";
import { parsePdf } from "../../src/pdf/parser/pdf-parser";
import type { PdfPath, PdfPaintOp } from "../../src/pdf/domain";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_PATH = path.join(__dirname, "..", "..", "fixtures", "samples", "panel2.pdf");

describe("Shape Fill Diagnostic for panel2.pdf", () => {
  it("should analyze path elements and their paintOp values", async () => {
    console.log("\n=== SHAPE FILL DIAGNOSTIC ===\n");

    const pdfBuffer = fs.readFileSync(PDF_PATH);
    console.log(`PDF file: ${PDF_PATH}`);
    console.log(`PDF size: ${pdfBuffer.length} bytes\n`);

    // Parse PDF and analyze paths
    const parsed = await parsePdf(pdfBuffer, { pages: [1] });
    const page1 = parsed.pages[0];

    if (!page1) {
      console.log("No page found");
      return;
    }

    // Count paint operations
    const paintOpCounts: Record<PdfPaintOp, number> = {
      stroke: 0,
      fill: 0,
      fillStroke: 0,
      none: 0,
      clip: 0,
    };

    // Collect path information
    const pathElements: PdfPath[] = [];
    for (const element of page1.elements) {
      if (element.type === "path") {
        pathElements.push(element);
        paintOpCounts[element.paintOp]++;
      }
    }

    console.log(`Total path elements: ${pathElements.length}`);
    console.log("\nPaint operation counts:");
    for (const [op, count] of Object.entries(paintOpCounts)) {
      console.log(`  ${op}: ${count}`);
    }

    // Analyze stroke-only paths (should NOT be filled)
    console.log("\n\n=== STROKE-ONLY PATHS ===");
    console.log("(These paths should NOT be filled in the output)\n");

    let strokeOnlyCount = 0;
    for (const path of pathElements) {
      if (path.paintOp === "stroke") {
        strokeOnlyCount++;
        if (strokeOnlyCount <= 10) {
          console.log(`\nStroke-only path #${strokeOnlyCount}:`);
          console.log(`  Operations: ${path.operations.length}`);
          console.log(`  First op: ${JSON.stringify(path.operations[0])}`);
          console.log(`  StrokeColor: ${JSON.stringify(path.graphicsState.strokeColor)}`);
          console.log(`  FillColor: ${JSON.stringify(path.graphicsState.fillColor)}`);
          console.log(`  LineWidth: ${path.graphicsState.lineWidth}`);
        }
      }
    }
    console.log(`\nTotal stroke-only paths: ${strokeOnlyCount}`);

    // Analyze fill paths
    console.log("\n\n=== FILL PATHS ===\n");

    let fillCount = 0;
    for (const path of pathElements) {
      if (path.paintOp === "fill") {
        fillCount++;
        if (fillCount <= 10) {
          console.log(`\nFill path #${fillCount}:`);
          console.log(`  Operations: ${path.operations.length}`);
          console.log(`  First op: ${JSON.stringify(path.operations[0])}`);
          console.log(`  FillColor: ${JSON.stringify(path.graphicsState.fillColor)}`);
        }
      }
    }
    console.log(`\nTotal fill paths: ${fillCount}`);

    // Analyze fillStroke paths
    console.log("\n\n=== FILL+STROKE PATHS ===\n");

    let fillStrokeCount = 0;
    for (const path of pathElements) {
      if (path.paintOp === "fillStroke") {
        fillStrokeCount++;
        if (fillStrokeCount <= 10) {
          console.log(`\nFill+Stroke path #${fillStrokeCount}:`);
          console.log(`  Operations: ${path.operations.length}`);
          console.log(`  First op: ${JSON.stringify(path.operations[0])}`);
          console.log(`  FillColor: ${JSON.stringify(path.graphicsState.fillColor)}`);
          console.log(`  StrokeColor: ${JSON.stringify(path.graphicsState.strokeColor)}`);
        }
      }
    }
    console.log(`\nTotal fill+stroke paths: ${fillStrokeCount}`);

    // Check for clipping paths
    console.log("\n\n=== CLIP PATHS ===\n");

    let clipCount = 0;
    for (const path of pathElements) {
      if (path.paintOp === "clip") {
        clipCount++;
        if (clipCount <= 5) {
          console.log(`\nClip path #${clipCount}:`);
          console.log(`  Operations: ${path.operations.length}`);
        }
      }
    }
    console.log(`\nTotal clip paths: ${clipCount}`);

    console.log("\n=== DIAGNOSTIC COMPLETE ===\n");

    expect(true).toBe(true);
  });

  it("should analyze raw PDF content stream operators", async () => {
    console.log("\n=== RAW CONTENT STREAM ANALYSIS ===\n");

    const pdfBuffer = fs.readFileSync(PDF_PATH);
    const pdfDoc = loadNativePdfDocument(pdfBuffer, { encryption: "ignore" });
    const page = pdfDoc.getPages()[0];
    if (!page) {
      console.log("No pages found");
      return;
    }

    const streams = page.getDecodedContentStreams();
    if (streams.length === 0) {
      console.log("No content streams found");
      return;
    }

    let contentData = "";
    for (const bytes of streams) {
      contentData += new TextDecoder("latin1").decode(bytes) + "\n";
    }

    console.log(`Content stream length: ${contentData.length} bytes\n`);

    // Count paint operators
    const operators = {
      S: 0,   // stroke
      s: 0,   // close and stroke
      f: 0,   // fill non-zero
      F: 0,   // fill non-zero (obsolete)
      "f*": 0, // fill even-odd
      B: 0,   // fill and stroke non-zero
      "B*": 0, // fill and stroke even-odd
      b: 0,   // close, fill and stroke non-zero
      "b*": 0, // close, fill and stroke even-odd
      n: 0,   // no-op
      W: 0,   // clip non-zero
      "W*": 0, // clip even-odd
    };

    // Count path construction operators
    const pathOps = {
      m: 0,   // moveTo
      l: 0,   // lineTo
      c: 0,   // curveTo
      v: 0,   // curveToV
      y: 0,   // curveToY
      h: 0,   // closePath
      re: 0,  // rectangle
    };

    // Simple counting (not perfect but gives an idea)
    for (const [op, _] of Object.entries(operators)) {
      // Match operator at word boundary
      const regex = new RegExp(`\\b${op.replace("*", "\\*")}\\b`, "g");
      const matches = contentData.match(regex);
      if (op in operators) {
        (operators as Record<string, number>)[op] = matches?.length ?? 0;
      }
    }

    for (const [op, _] of Object.entries(pathOps)) {
      const regex = new RegExp(`\\b${op}\\b`, "g");
      const matches = contentData.match(regex);
      if (op in pathOps) {
        (pathOps as Record<string, number>)[op] = matches?.length ?? 0;
      }
    }

    console.log("Paint operators in content stream:");
    for (const [op, count] of Object.entries(operators)) {
      if (count > 0) {
        console.log(`  ${op}: ${count}`);
      }
    }

    console.log("\nPath construction operators:");
    for (const [op, count] of Object.entries(pathOps)) {
      if (count > 0) {
        console.log(`  ${op}: ${count}`);
      }
    }

    // Look for patterns that might indicate stroke-only operations
    // Pattern: path construction followed by S (stroke only)
    console.log("\n\n=== SAMPLE STROKE-ONLY SEQUENCES ===\n");

    // Find sequences ending with " S" (stroke)
    const strokeSequenceRegex = /(\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+m(?:[^SsfFbBnW]*?(?:\s+l|\s+c|\s+v|\s+y|\s+h|\s+re))*?)\s+S/g;
    let strokeMatch;
    let strokeSampleCount = 0;

    while ((strokeMatch = strokeSequenceRegex.exec(contentData)) !== null) {
      strokeSampleCount++;
      if (strokeSampleCount <= 5) {
        const sequence = strokeMatch[0].slice(0, 200);
        console.log(`Stroke sequence #${strokeSampleCount}:`);
        console.log(`  ${sequence}${strokeMatch[0].length > 200 ? "..." : ""}`);
        console.log();
      }
    }
    console.log(`Total stroke sequences found: ${strokeSampleCount}`);

    // Look for fill sequences
    console.log("\n\n=== SAMPLE FILL SEQUENCES ===\n");

    const fillSequenceRegex = /(\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+m(?:[^SsfFbBnW]*?(?:\s+l|\s+c|\s+v|\s+y|\s+h|\s+re))*?)\s+f/g;
    let fillMatch;
    let fillSampleCount = 0;

    while ((fillMatch = fillSequenceRegex.exec(contentData)) !== null) {
      fillSampleCount++;
      if (fillSampleCount <= 5) {
        const sequence = fillMatch[0].slice(0, 200);
        console.log(`Fill sequence #${fillSampleCount}:`);
        console.log(`  ${sequence}${fillMatch[0].length > 200 ? "..." : ""}`);
        console.log();
      }
    }
    console.log(`Total fill sequences found: ${fillSampleCount}`);

    console.log("\n=== DIAGNOSTIC COMPLETE ===\n");

    expect(true).toBe(true);
  });

  it("should check graphics state defaults and inheritance", async () => {
    console.log("\n=== GRAPHICS STATE ANALYSIS ===\n");

    const pdfBuffer = fs.readFileSync(PDF_PATH);
    const parsed = await parsePdf(pdfBuffer, { pages: [1] });
    const page1 = parsed.pages[0];

    if (!page1) {
      console.log("No page found");
      return;
    }

    // Collect all unique fill colors from stroke-only paths
    console.log("Graphics state for STROKE-ONLY paths:");
    console.log("(These should NOT have fill applied)\n");

    const strokeOnlyStates: Map<string, number> = new Map();
    let sampleCount = 0;

    for (const element of page1.elements) {
      if (element.type === "path" && element.paintOp === "stroke") {
        const fillColorKey = JSON.stringify(element.graphicsState.fillColor);
        strokeOnlyStates.set(fillColorKey, (strokeOnlyStates.get(fillColorKey) ?? 0) + 1);

        sampleCount++;
        if (sampleCount <= 5) {
          console.log(`Stroke path #${sampleCount}:`);
          console.log(`  FillColor (inherited): ${fillColorKey}`);
          console.log(`  StrokeColor: ${JSON.stringify(element.graphicsState.strokeColor)}`);
          console.log(`  LineWidth: ${element.graphicsState.lineWidth}`);
          console.log(`  LineCap: ${element.graphicsState.lineCap}`);
          console.log(`  LineJoin: ${element.graphicsState.lineJoin}`);
        }
      }
    }

    console.log("\n\nFill color distribution in stroke-only paths:");
    for (const [color, count] of strokeOnlyStates.entries()) {
      console.log(`  ${color}: ${count} paths`);
    }

    // Check if any stroke-only paths have non-transparent fill colors that might be mistakenly rendered
    console.log("\n\nWARNING CHECK:");
    console.log("If stroke-only paths are being filled, check:");
    console.log("1. PPTX converter is respecting paintOp='stroke'");
    console.log("2. GeometryPath.fill is set to 'none' for stroke-only");
    console.log("3. Shape spPr/solidFill is not being added for stroke-only shapes");

    console.log("\n=== DIAGNOSTIC COMPLETE ===\n");

    expect(true).toBe(true);
  });
});
