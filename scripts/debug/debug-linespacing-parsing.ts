/**
 * Debug: trace line spacing parsing
 *
 * Usage: bun run scripts/debug/debug-linespacing-parsing.ts <pptx-path> <slide-number> <base-multiplier>
 */
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS, DEFAULT_RENDER_OPTIONS } from "@oxen-office/pptx";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";
import { getEffectiveLineSpacing } from "@oxen-renderer/pptx/render-options";
import { requireFileExists, requireIntArg, requirePositionalArg } from "../lib/cli";
import { loadPptxFile } from "../lib/pptx-loader";

async function main() {
  const usage =
    "bun run scripts/debug/debug-linespacing-parsing.ts <pptx-path> <slide-number> <base-multiplier>";
  const args = process.argv.slice(2);
  const pptxPath = requirePositionalArg(args, 0, "pptx-path", usage);
  const slideNumber = requireIntArg(args[1], "slide-number", usage);
  const baseMultiplierStr = requirePositionalArg(args, 2, "base-multiplier", usage);
  const baseMultiplier = Number.parseFloat(baseMultiplierStr);
  if (!Number.isFinite(baseMultiplier)) {
    throw new Error(`Invalid base-multiplier: ${baseMultiplierStr}`);
  }
  requireFileExists(pptxPath, usage);

  console.log("=== Testing getEffectiveLineSpacing ===");

  // Test the function directly
  const ecmaResult = getEffectiveLineSpacing(baseMultiplier, DEFAULT_RENDER_OPTIONS);
  const loResult = getEffectiveLineSpacing(baseMultiplier, LIBREOFFICE_RENDER_OPTIONS);

  console.log("Base multiplier: " + baseMultiplier);
  console.log("ECMA-376 result: " + ecmaResult);
  console.log("LibreOffice result: " + loResult);
  console.log("Difference factor: " + (loResult / ecmaResult).toFixed(3));

  // Now check if a paragraph with multi-line text exists
  console.log(`\n=== Checking slide ${slideNumber} for multi-line paragraphs ===`);
  const { presentationFile } = await loadPptxFile(pptxPath);

  // Extract text element count by shape
  const ecma = openPresentation(presentationFile, { renderOptions: DEFAULT_RENDER_OPTIONS });
  const { svg: ecmaSvg } = renderSlideToSvg(ecma.getSlide(slideNumber));

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
