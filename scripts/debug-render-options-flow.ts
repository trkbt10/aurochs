/**
 * Debug: trace render options flow
 */
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS, DEFAULT_RENDER_OPTIONS } from "../src/pptx";
import { renderSlideToSvg } from "../src/pptx/render/svg";
import { loadPptxFile } from "./lib/pptx-loader";

async function main() {
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
  const presentationFile = await loadPptxFile(pptxPath);
  
  console.log("=== ECMA-376 ===");
  const ecma = openPresentation(presentationFile, { renderOptions: DEFAULT_RENDER_OPTIONS });
  const { svg: ecmaSvg } = renderSlideToSvg(ecma.getSlide(2));

  console.log("=== LibreOffice ===");
  const lo = openPresentation(presentationFile, { renderOptions: LIBREOFFICE_RENDER_OPTIONS });
  const { svg: loSvg } = renderSlideToSvg(lo.getSlide(2));
  
  // Compare specific text element positions
  console.log("\n=== Compare Y positions ===");
  const ecmaYs = [...ecmaSvg.matchAll(/<text[^>]*y="([^"]+)"/g)].map(m => parseFloat(m[1]));
  const loYs = [...loSvg.matchAll(/<text[^>]*y="([^"]+)"/g)].map(m => parseFloat(m[1]));
  
  console.log("ECMA Y positions:", ecmaYs);
  console.log("LO Y positions:  ", loYs);
  
  // Check if SVGs are identical
  console.log("\n=== SVG identical? ===", ecmaSvg === loSvg);
  
  // Show first difference if any
  if (ecmaSvg !== loSvg) {
    for (let i = 0; i < Math.min(ecmaSvg.length, loSvg.length); i++) {
      if (ecmaSvg[i] !== loSvg[i]) {
        console.log("First diff at char " + i + ":");
        console.log("  ECMA: ..." + ecmaSvg.slice(Math.max(0, i-20), i+40) + "...");
        console.log("  LO:   ..." + loSvg.slice(Math.max(0, i-20), i+40) + "...");
        break;
      }
    }
  }
}

main().catch(console.error);
