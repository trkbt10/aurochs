/**
 * Detailed slide comparison tool
 *
 * Compares specific elements between our SVG output and PPTX source
 * to identify rendering differences.
 *
 * Usage: bun run scripts/compare/compare-slide-details.ts <pptx-path> <slide-number>
 */
import { openPresentation } from "@oxen-office/pptx";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";
import { requireFileExists, requireIntArg, requirePositionalArg } from "../lib/cli";
import { loadPptxFile } from "../lib/pptx-loader";

type ElementInfo = {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fill?: string;
  fontSize?: number;
  fontFamily?: string;
};

function extractSvgElements(svg: string): ElementInfo[] {
  const elements: ElementInfo[] = [];

  // Extract text elements
  const textPattern = /<text[^>]*x="([^"]+)"[^>]*y="([^"]+)"[^>]*font-size="([^"]+)"[^>]*font-family="([^"]+)"[^>]*fill="([^"]+)"[^>]*>([^<]*)<\/text>/g;
  let match;
  while ((match = textPattern.exec(svg)) !== null) {
    elements.push({
      type: "text",
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
      width: 0,
      height: 0,
      fontSize: parseFloat(match[3]),
      fontFamily: match[4],
      fill: match[5],
      text: match[6],
    });
  }

  // Extract rect/path fills
  const rectPattern = /<(?:rect|path)[^>]*fill="([^"]+)"[^>]*>/g;
  while ((match = rectPattern.exec(svg)) !== null) {
    if (match[1] !== "none") {
      elements.push({
        type: "shape",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: match[1],
      });
    }
  }

  // Extract transform groups
  const transformPattern = /transform="translate\(([^,]+),\s*([^)]+)\)"/g;
  const transforms: { x: number; y: number }[] = [];
  while ((match = transformPattern.exec(svg)) !== null) {
    transforms.push({
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
    });
  }

  return elements;
}

async function main() {
  const usage = "bun run scripts/compare/compare-slide-details.ts <pptx-path> <slide-number>";
  const args = process.argv.slice(2);
  const pptxPath = requirePositionalArg(args, 0, "pptx-path", usage);
  const slideNum = requireIntArg(args[1], "slide-number", usage);
  requireFileExists(pptxPath, usage);

  const { cache, presentationFile } = await loadPptxFile(pptxPath);

  const presentation = openPresentation(presentationFile);

  console.log("=".repeat(70));
  console.log(`Detailed Slide Analysis: Slide ${slideNum}`);
  console.log("=".repeat(70));

  // Get our SVG output
  const slide = presentation.getSlide(slideNum);
  const { svg } = renderSlideToSvg(slide);

  console.log("\n## Our SVG Output Analysis");
  console.log("-".repeat(40));

  // Analyze SVG
  const svgElements = extractSvgElements(svg);

  console.log(`Total text elements: ${svgElements.filter(e => e.type === "text").length}`);
  console.log(`Total shape fills: ${svgElements.filter(e => e.type === "shape").length}`);

  console.log("\n### Text Elements:");
  for (const el of svgElements.filter(e => e.type === "text")) {
    console.log(`  "${el.text?.substring(0, 30)}..."`);
    console.log(`    Position: (${el.x.toFixed(2)}, ${el.y.toFixed(2)})`);
    console.log(`    Font: ${el.fontFamily} ${el.fontSize}px`);
    console.log(`    Fill: ${el.fill}`);
  }

  console.log("\n### Shape Fills:");
  for (const el of svgElements.filter(e => e.type === "shape")) {
    console.log(`  Fill: ${el.fill}`);
  }

  // Read source PPTX slide
  const slideXml = cache.get(`ppt/slides/slide${slideNum}.xml`)?.text;
  if (slideXml) {
    console.log("\n## PPTX Source Analysis");
    console.log("-".repeat(40));

    // Extract key values from PPTX
    const szPattern = /sz="(\d+)"/g;
    const fontSizes: number[] = [];
    let match;
    while ((match = szPattern.exec(slideXml)) !== null) {
      fontSizes.push(parseInt(match[1], 10) / 100); // 1/100 pt to pt
    }
    console.log(`Font sizes (pt): ${fontSizes.join(", ")}`);

    // Extract colors
    const srgbPattern = /<a:srgbClr val="([^"]+)"\/>/g;
    const colors: string[] = [];
    while ((match = srgbPattern.exec(slideXml)) !== null) {
      colors.push(`#${match[1]}`);
    }
    console.log(`sRGB Colors: ${colors.join(", ")}`);

    const schemeClrPattern = /<a:schemeClr val="([^"]+)"[^/]*\/>/g;
    const schemeColors: string[] = [];
    while ((match = schemeClrPattern.exec(slideXml)) !== null) {
      schemeColors.push(match[1]);
    }
    console.log(`Scheme Colors: ${schemeColors.join(", ")}`);
  }

  // Output full SVG for inspection
  console.log("\n## Full SVG Output");
  console.log("-".repeat(40));
  console.log(svg);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
