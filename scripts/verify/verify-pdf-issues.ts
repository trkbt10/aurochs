/**
 * Verification script for PDF import issues
 *
 * Usage: bun run scripts/verify/verify-pdf-issues.ts <pdf-path> <output-pptx-path>
 */
import * as fs from "node:fs";
import { importPdf } from "@oxen-office/pdf-to-pptx/importer/pdf-importer";
import { exportPptx } from "@oxen-office/pptx/exporter";
import { px } from "@oxen-office/ooxml/domain/units";
import { loadZipPackage } from "@oxen/zip";
import { parsePdf } from "@oxen/pdf";
import { requireFileExists, requirePositionalArg } from "../lib/cli";

async function main() {
  const usage = "bun run scripts/verify/verify-pdf-issues.ts <pdf-path> <output-pptx-path>";
  const args = process.argv.slice(2);
  const pdfPath = requirePositionalArg(args, 0, "pdf-path", usage);
  const outputPptxPath = requirePositionalArg(args, 1, "output-pptx-path", usage);
  requireFileExists(pdfPath, usage);

  console.log("=== PDF Import Issues Verification ===\n");

  const pdfBuffer = fs.readFileSync(pdfPath);
  console.log(`PDF file: ${pdfPath}`);
  console.log(`PDF size: ${pdfBuffer.length} bytes\n`);

  // Issue 1: Paper size
  console.log("--- Issue 1: Paper Size ---");

  // Import without specifying slide size (should use PDF's size)
  const result1 = await importPdf(pdfBuffer, {});
  console.log(`Default import slide size: ${result1.document.slideWidth} x ${result1.document.slideHeight}`);

  // Import with specific slide size
  const result2 = await importPdf(pdfBuffer, {
    slideSize: { width: px(960), height: px(540) }
  });
  console.log(`Specified slide size (960x540): ${result2.document.slideWidth} x ${result2.document.slideHeight}`);

  // Check what PDF's actual size is
  const parsed = await parsePdf(pdfBuffer, { pages: [1] });
  const page = parsed.pages[0];
  console.log(`PDF page size: ${page?.width.toFixed(2)} x ${page?.height.toFixed(2)} points`);
  console.log(`PDF page size in px (1pt = 1.33px): ${((page?.width ?? 0) * 1.33).toFixed(0)} x ${((page?.height ?? 0) * 1.33).toFixed(0)} px`);

  // Issue 2: Text encoding
  console.log("\n--- Issue 2: Text Encoding ---");
  const shapes = result1.document.slides[0]?.slide.shapes ?? [];
  const textShapes = shapes.filter(s => s.type === "sp" && s.textBody);
  console.log(`Text shapes: ${textShapes.length}`);

  // Show first 5 text contents
  let textCount = 0;
  for (const shape of textShapes) {
    if (shape.type !== "sp" || !shape.textBody) {continue;}
    for (const para of shape.textBody.paragraphs) {
      for (const run of para.runs) {
        if (run.type === "text" && textCount < 5) {
          const hasNullBytes = run.text.includes("\u0000");
          const cleanText = run.text.split("\u0000").join("");
          console.log(`  [${textCount}] "${cleanText.slice(0, 50)}${cleanText.length > 50 ? "..." : ""}" (nullBytes: ${hasNullBytes})`);
          textCount++;
        }
      }
    }
  }

  // Issue 3: PPTX output format
  console.log("\n--- Issue 3: PPTX Output Format ---");
  const { blob } = await exportPptx(result1.document);
  const arrayBuffer = await blob.arrayBuffer();
  fs.writeFileSync(outputPptxPath, Buffer.from(arrayBuffer));
  console.log(`Exported PPTX: ${outputPptxPath}`);
  console.log(`PPTX size: ${arrayBuffer.byteLength} bytes`);

  // Check PPTX structure
  const pkg = await loadZipPackage(arrayBuffer);
  console.log("\nPPTX contents:");
  const files = pkg.listFiles().slice().sort();
  for (const file of files.slice(0, 20)) {
    console.log(`  ${file}`);
  }
  if (files.length > 20) {
    console.log(`  ... and ${files.length - 20} more files`);
  }

  // Check presentation.xml
  const presentationXml = pkg.readText("ppt/presentation.xml");
  if (presentationXml) {
    // Extract slide size from presentation.xml
    const sldSzMatch = presentationXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
    if (sldSzMatch) {
      const cxEmu = parseInt(sldSzMatch[1]);
      const cyEmu = parseInt(sldSzMatch[2]);
      // EMU to points: 1 point = 12700 EMU
      const widthPt = cxEmu / 12700;
      const heightPt = cyEmu / 12700;
      console.log(`\nPPTX slide size in EMU: ${cxEmu} x ${cyEmu}`);
      console.log(`PPTX slide size in points: ${widthPt.toFixed(1)} x ${heightPt.toFixed(1)}`);
    }
  }

  // Check slide1.xml content
  const slide1Xml = pkg.readText("ppt/slides/slide1.xml");
  if (slide1Xml) {
    const shapeCount = (slide1Xml.match(/<p:sp\b/g) || []).length;
    const picCount = (slide1Xml.match(/<p:pic\b/g) || []).length;
    console.log(`\nSlide 1 content: ${shapeCount} sp elements, ${picCount} pic elements`);

    // Check for any text content
    const textMatches = slide1Xml.match(/<a:t>([^<]+)<\/a:t>/g) || [];
    console.log(`Text elements: ${textMatches.length}`);
    if (textMatches.length > 0) {
      console.log(`First text: ${textMatches[0]?.slice(0, 60)}`);
    }
  }

  console.log("\n=== Verification Complete ===");
}

main().catch(console.error);
