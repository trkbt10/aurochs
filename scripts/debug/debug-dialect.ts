/**
 * Debug test to verify dialect is being applied
 *
 * Usage: bun run scripts/debug/debug-dialect.ts <pptx-path> <slide-number>
 */
import { openPresentation } from "@oxen-office/pptx";
import { LIBREOFFICE_RENDER_OPTIONS, DEFAULT_RENDER_OPTIONS } from "@oxen-renderer/pptx/render-options";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";
import { requireFileExists, requireIntArg, requirePositionalArg } from "../lib/cli";
import { loadPptxFile } from "../lib/pptx-loader";

async function main() {
  const usage = "bun run scripts/debug/debug-dialect.ts <pptx-path> <slide-number>";
  const args = process.argv.slice(2);
  const pptxPath = requirePositionalArg({ args, index: 0, name: "pptx-path", usage });
  const slideNumber = requireIntArg(args[1], "slide-number", usage);
  requireFileExists(pptxPath, usage);

  const { presentationFile } = await loadPptxFile(pptxPath);

  console.log("=== ECMA-376 (default) dialect ===");
  const ecma = openPresentation(presentationFile, { renderOptions: DEFAULT_RENDER_OPTIONS });
  const ecmaSlide = ecma.getSlide(slideNumber);
  const { svg: ecmaSvg } = renderSlideToSvg(ecmaSlide);

  // Extract y positions from text elements
  const ecmaYPositions = [...ecmaSvg.matchAll(/<text[^>]*y="([^"]+)"/g)].map(m => parseFloat(m[1]));
  console.log("Y positions (first 5):", ecmaYPositions.slice(0, 5));

  console.log("\n=== LibreOffice dialect ===");
  const lo = openPresentation(presentationFile, { renderOptions: LIBREOFFICE_RENDER_OPTIONS });
  const loSlide = lo.getSlide(slideNumber);
  const { svg: loSvg } = renderSlideToSvg(loSlide);

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
