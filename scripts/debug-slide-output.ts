/**
 * Debug script to output current slide rendering
 *
 * Usage: bun run scripts/debug-slide-output.ts [pptx-path] [slide-number]
 * Default: fixtures/poi-test-data/test-data/slideshow/themes.pptx slide 4
 */
import { openPresentation } from "../src/pptx";
import * as fs from "node:fs";
import { loadPptxFile } from "./lib/pptx-loader";

async function main() {
  const pptxPath = process.argv[2] ?? "fixtures/poi-test-data/test-data/slideshow/themes.pptx";
  const slideNum = parseInt(process.argv[3] ?? "4", 10);

  if (!fs.existsSync(pptxPath)) {
    console.error(`File not found: ${pptxPath}`);
    process.exit(1);
  }

  const { presentationFile } = await loadPptxFile(pptxPath);

  const presentation = openPresentation(presentationFile);
  const slideCount = presentation.count;

  if (slideNum < 1 || slideNum > slideCount) {
    console.error(`Invalid slide number: ${slideNum}. Valid range: 1-${slideCount}`);
    process.exit(1);
  }

  const slide = presentation.getSlide(slideNum);
  const svg = slide.renderSVG();

  const outputPath = `debug-slide-output.svg`;
  fs.writeFileSync(outputPath, svg);
  console.log(`Slide ${slideNum} SVG saved to: ${outputPath}`);
  console.log(`SVG length: ${svg.length} bytes`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
