/**
 * @file Detailed slide comparison tool
 *
 * Compares specific elements between our SVG output and PPTX source
 * to identify rendering differences.
 *
 * Usage: bun run scripts/compare/compare-slide-details.ts <pptx-path> <slide-number>
 */
import { openPresentation } from "@aurochs-office/pptx";
import { renderSlideToSvg } from "@aurochs-renderer/pptx/svg";
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
  const textPattern =
    /<text[^>]*x="([^"]+)"[^>]*y="([^"]+)"[^>]*font-size="([^"]+)"[^>]*font-family="([^"]+)"[^>]*fill="([^"]+)"[^>]*>([^<]*)<\/text>/g;
  const match = { value: textPattern.exec(svg) };
  while (match.value !== null) {
    elements.push({
      type: "text",
      x: parseFloat(match.value[1]),
      y: parseFloat(match.value[2]),
      width: 0,
      height: 0,
      fontSize: parseFloat(match.value[3]),
      fontFamily: match.value[4],
      fill: match.value[5],
      text: match.value[6],
    });
    match.value = textPattern.exec(svg);
  }

  // Extract rect/path fills
  const rectPattern = /<(?:rect|path)[^>]*fill="([^"]+)"[^>]*>/g;
  const rectMatch = { value: rectPattern.exec(svg) };
  while (rectMatch.value !== null) {
    if (rectMatch.value[1] !== "none") {
      elements.push({
        type: "shape",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: rectMatch.value[1],
      });
    }
    rectMatch.value = rectPattern.exec(svg);
  }

  // Extract transform groups
  const transformPattern = /transform="translate\(([^,]+),\s*([^)]+)\)"/g;
  const transforms: { x: number; y: number }[] = [];
  const trMatch = { value: transformPattern.exec(svg) };
  while (trMatch.value !== null) {
    transforms.push({
      x: parseFloat(trMatch.value[1]),
      y: parseFloat(trMatch.value[2]),
    });
    trMatch.value = transformPattern.exec(svg);
  }

  return elements;
}

/** Extract all regex matches from input, mapping each match with the given transform */
function extractRegexMatches<T>(pattern: RegExp, input: string, transform: (m: RegExpExecArray) => T): T[] {
  const results: T[] = [];
  const m = { value: pattern.exec(input) };
  while (m.value !== null) {
    results.push(transform(m.value));
    m.value = pattern.exec(input);
  }
  return results;
}

async function main() {
  const usage = "bun run scripts/compare/compare-slide-details.ts <pptx-path> <slide-number>";
  const args = process.argv.slice(2);
  const pptxPath = requirePositionalArg({ args, index: 0, name: "pptx-path", usage });
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

  console.log(`Total text elements: ${svgElements.filter((e) => e.type === "text").length}`);
  console.log(`Total shape fills: ${svgElements.filter((e) => e.type === "shape").length}`);

  console.log("\n### Text Elements:");
  for (const el of svgElements.filter((e) => e.type === "text")) {
    console.log(`  "${el.text?.substring(0, 30)}..."`);
    console.log(`    Position: (${el.x.toFixed(2)}, ${el.y.toFixed(2)})`);
    console.log(`    Font: ${el.fontFamily} ${el.fontSize}px`);
    console.log(`    Fill: ${el.fill}`);
  }

  console.log("\n### Shape Fills:");
  for (const el of svgElements.filter((e) => e.type === "shape")) {
    console.log(`  Fill: ${el.fill}`);
  }

  // Read source PPTX slide
  const slideXml = cache.get(`ppt/slides/slide${slideNum}.xml`)?.text;
  if (slideXml) {
    console.log("\n## PPTX Source Analysis");
    console.log("-".repeat(40));

    // Extract key values from PPTX
    const fontSizes = extractRegexMatches(/sz="(\d+)"/g, slideXml, (m) => parseInt(m[1], 10) / 100);
    console.log(`Font sizes (pt): ${fontSizes.join(", ")}`);

    // Extract colors
    const colors = extractRegexMatches(/<a:srgbClr val="([^"]+)"\/>/g, slideXml, (m) => `#${m[1]}`);
    console.log(`sRGB Colors: ${colors.join(", ")}`);

    const schemeColors = extractRegexMatches(/<a:schemeClr val="([^"]+)"[^/]*\/>/g, slideXml, (m) => m[1]);
    console.log(`Scheme Colors: ${schemeColors.join(", ")}`);
  }

  // Output full SVG for inspection
  console.log("\n## Full SVG Output");
  console.log("-".repeat(40));
  console.log(svg);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
