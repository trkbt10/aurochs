/**
 * Compare multi-line text rendering between ECMA-376 and LibreOffice dialects
 */
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS, DEFAULT_RENDER_OPTIONS } from "../src/pptx";
import { renderSlideToSvg } from "../src/pptx/render/svg";
import { loadPptxFile } from "./lib/pptx-loader";

async function main() {
  // Use aptia which has multi-line text
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/aptia.pptx";
  const presentationFile = await loadPptxFile(pptxPath);

  console.log("=== Comparing slide 7 (aptia) ===\n");

  // ECMA-376
  const ecma = openPresentation(presentationFile, { renderOptions: DEFAULT_RENDER_OPTIONS });
  const { svg: ecmaSvg } = renderSlideToSvg(ecma.getSlide(7));

  // LibreOffice
  const lo = openPresentation(presentationFile, { renderOptions: LIBREOFFICE_RENDER_OPTIONS });
  const { svg: loSvg } = renderSlideToSvg(lo.getSlide(7));

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
