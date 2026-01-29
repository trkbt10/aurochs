/**
 * Debug script to output current slide rendering
 *
 * Usage: bun run scripts/debug/debug-slide-output.ts <pptx-path> <slide-number> <output-svg-path>
 */
import { openPresentation } from "@oxen-office/pptx";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";
import * as fs from "node:fs";
import { requireFileExists, requireIntArg, requirePositionalArg } from "../lib/cli";
import { loadPptxFile } from "../lib/pptx-loader";

async function main() {
  const usage = "bun run scripts/debug/debug-slide-output.ts <pptx-path> <slide-number> <output-svg-path>";
  const args = process.argv.slice(2);
  const pptxPath = requirePositionalArg(args, 0, "pptx-path", usage);
  const slideNum = requireIntArg(args[1], "slide-number", usage);
  const outputPath = requirePositionalArg(args, 2, "output-svg-path", usage);
  requireFileExists(pptxPath, usage);

  const { presentationFile } = await loadPptxFile(pptxPath);

  const presentation = openPresentation(presentationFile);
  const slideCount = presentation.count;

  if (slideNum < 1 || slideNum > slideCount) {
    console.error(`Invalid slide number: ${slideNum}. Valid range: 1-${slideCount}`);
    process.exit(1);
  }

  const slide = presentation.getSlide(slideNum);
  const { svg } = renderSlideToSvg(slide);

  fs.writeFileSync(outputPath, svg);
  console.log(`Slide ${slideNum} SVG saved to: ${outputPath}`);
  console.log(`SVG length: ${svg.length} bytes`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
