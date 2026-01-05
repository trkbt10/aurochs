/**
 * Debug test to verify dialect is being applied
 */
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS, DEFAULT_RENDER_OPTIONS } from "../src/pptx";
import { loadPptxFile } from "./lib/pptx-loader";

async function main() {
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
  const presentationFile = await loadPptxFile(pptxPath);

  console.log("=== ECMA-376 (default) dialect ===");
  const ecma = openPresentation(presentationFile, { renderOptions: DEFAULT_RENDER_OPTIONS });
  const ecmaSlide = ecma.getSlide(1);
  const ecmaSvg = ecmaSlide.renderSVG();

  // Extract y positions from text elements
  const ecmaYPositions = [...ecmaSvg.matchAll(/<text[^>]*y="([^"]+)"/g)].map(m => parseFloat(m[1]));
  console.log("Y positions (first 5):", ecmaYPositions.slice(0, 5));

  console.log("\n=== LibreOffice dialect ===");
  const lo = openPresentation(presentationFile, { renderOptions: LIBREOFFICE_RENDER_OPTIONS });
  const loSlide = lo.getSlide(1);
  const loSvg = loSlide.renderSVG();

  const loYPositions = [...loSvg.matchAll(/<text[^>]*y="([^"]+)"/g)].map(m => parseFloat(m[1]));
  console.log("Y positions (first 5):", loYPositions.slice(0, 5));

  console.log("\n=== Comparison ===");
  console.log("Positions differ:", ecmaYPositions.some((y, i) => y !== loYPositions[i]));

  // Show diffs
  for (let i = 0; i < Math.min(5, ecmaYPositions.length); i++) {
    const diff = ecmaYPositions[i] - loYPositions[i];
    if (Math.abs(diff) > 0.1) {
      console.log("  Position " + i + ": ECMA=" + ecmaYPositions[i].toFixed(2) + ", LO=" + loYPositions[i].toFixed(2) + ", diff=" + diff.toFixed(2));
    }
  }
}

main().catch(console.error);
