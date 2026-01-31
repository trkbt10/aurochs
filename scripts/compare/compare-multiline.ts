/**
 * Compare multi-line text rendering between ECMA-376 and LibreOffice dialects
 *
 * Usage: bun run scripts/compare/compare-multiline.ts <pptx-path> <slide-number>
 */
import { openPresentation } from "@oxen-office/pptx";
import { LIBREOFFICE_RENDER_OPTIONS, DEFAULT_RENDER_OPTIONS } from "@oxen-renderer/pptx/render-options";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";
import { requireFileExists, requireIntArg, requirePositionalArg } from "../lib/cli";
import { loadPptxFile } from "../lib/pptx-loader";

async function main() {
  const usage = "bun run scripts/compare/compare-multiline.ts <pptx-path> <slide-number>";
  const args = process.argv.slice(2);
  const pptxPath = requirePositionalArg({ args, index: 0, name: "pptx-path", usage });
  const slideNumber = requireIntArg(args[1], "slide-number", usage);
  requireFileExists(pptxPath, usage);

  const { presentationFile } = await loadPptxFile(pptxPath);

  console.log(`=== Comparing slide ${slideNumber} ===\n`);

  // ECMA-376
  const ecma = openPresentation(presentationFile, { renderOptions: DEFAULT_RENDER_OPTIONS });
  const { svg: ecmaSvg } = renderSlideToSvg(ecma.getSlide(slideNumber));

  // LibreOffice
  const lo = openPresentation(presentationFile, { renderOptions: LIBREOFFICE_RENDER_OPTIONS });
  const { svg: loSvg } = renderSlideToSvg(lo.getSlide(slideNumber));

  // Extract all text element y positions
  const ecmaPositions = [...ecmaSvg.matchAll(/<text[^>]*y="([^"]+)"/g)].map(m => parseFloat(m[1]));
  const loPositions = [...loSvg.matchAll(/<text[^>]*y="([^"]+)"/g)].map(m => parseFloat(m[1]));

  console.log("Text element count - ECMA:", ecmaPositions.length, "LO:", loPositions.length);
  
  // Find differences
  let diffCount = 0;
  for (let i = 0; i < Math.min(ecmaPositions.length, loPositions.length); i++) {
    const diff = Math.abs(ecmaPositions[i] - loPositions[i]);
    if (diff > 0.1) {
      diffCount++;
      console.log("  Line " + i + ": ECMA=" + ecmaPositions[i].toFixed(2) + " LO=" + loPositions[i].toFixed(2) + " diff=" + diff.toFixed(2));
    }
  }
  
  if (diffCount === 0) {
    console.log("\nNo Y position differences found.");
    console.log("This means:");
    console.log("  1. No multi-line paragraphs with percentage line spacing, OR");
    console.log("  2. Line spacing uses 'points' mode, not 'percent' mode");
  } else {
    console.log("\nFound " + diffCount + " position differences");
  }
}

main().catch(console.error);
