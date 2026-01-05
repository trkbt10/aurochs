/**
 * Debug: trace line spacing parsing
 */
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS, DEFAULT_RENDER_OPTIONS } from "../src/pptx";
import { getEffectiveLineSpacing } from "../src/pptx/render/render-options";
import { loadPptxFile } from "./lib/pptx-loader";

async function main() {
  console.log("=== Testing getEffectiveLineSpacing ===");

  // Test the function directly
  const baseMultiplier = 1.1; // 110%
  const ecmaResult = getEffectiveLineSpacing(baseMultiplier, DEFAULT_RENDER_OPTIONS);
  const loResult = getEffectiveLineSpacing(baseMultiplier, LIBREOFFICE_RENDER_OPTIONS);

  console.log("Base multiplier: " + baseMultiplier);
  console.log("ECMA-376 result: " + ecmaResult);
  console.log("LibreOffice result: " + loResult);
  console.log("Difference factor: " + (loResult / ecmaResult).toFixed(3));

  // Now check if a paragraph with multi-line text exists
  console.log("\n=== Checking slide 2 for multi-line paragraphs ===");
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
  const presentationFile = await loadPptxFile(pptxPath);

  // Extract text element count by shape
  const ecma = openPresentation(presentationFile, { renderOptions: DEFAULT_RENDER_OPTIONS });
  const ecmaSvg = ecma.getSlide(2).renderSVG();

  // Count text elements per group (shape)
  const textCounts = ecmaSvg.match(/<text[^>]*>/g)?.length || 0;
  console.log("Total text elements in slide 2: " + textCounts);

  // Check if any have multiple lines (same x, different y within a group)
  const groups = ecmaSvg.split(/<g[^>]*>/).slice(1);
  let multiLineCount = 0;
  for (const group of groups) {
    const textYs = [...group.matchAll(/<text[^>]*y="([^"]+)"/g)].map((m) => parseFloat(m[1]));
    if (textYs.length > 1) {
      multiLineCount++;
    }
  }
  console.log("Groups with multiple text elements: " + multiLineCount);
}

main().catch(console.error);
