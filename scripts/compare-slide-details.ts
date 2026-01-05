/**
 * Detailed slide comparison tool
 *
 * Compares specific elements between our SVG output and PPTX source
 * to identify rendering differences.
 *
 * Usage: bun run scripts/compare-slide-details.ts [pptx-path] [slide-number]
 */
import { openPresentation } from "../src/pptx";
import * as fs from "node:fs";
import { loadPptxFileBundle } from "./lib/pptx-loader";

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

function extractPptxShapeInfo(xml: string): { shapes: any[] } {
  const shapes: any[] = [];

  // Extract shape transforms (simplified)
  const offPattern = /<a:off x="(\d+)" y="(\d+)"\/>/g;
  const extPattern = /<a:ext cx="(\d+)" cy="(\d+)"\/>/g;

  let match;
  const positions: { x: number; y: number }[] = [];
  while ((match = offPattern.exec(xml)) !== null) {
    positions.push({
      x: parseInt(match[1], 10) / 914400 * 96, // EMU to px (assuming 96 DPI)
      y: parseInt(match[2], 10) / 914400 * 96,
    });
  }

  // Extract text content
  const textPattern = /<a:t>([^<]+)<\/a:t>/g;
  const texts: string[] = [];
  while ((match = textPattern.exec(xml)) !== null) {
    texts.push(match[1]);
  }

  return { shapes: positions.map((p, i) => ({ ...p, text: texts[i] })) };
}

async function main() {
  const pptxPath = process.argv[2] ?? "fixtures/poi-test-data/test-data/slideshow/themes.pptx";
  const slideNum = parseInt(process.argv[3] ?? "1", 10);

  if (!fs.existsSync(pptxPath)) {
    console.error(`File not found: ${pptxPath}`);
    process.exit(1);
  }

  const { cache, presentationFile } = await loadPptxFileBundle(pptxPath);

  const presentation = openPresentation(presentationFile);

  console.log("=".repeat(70));
  console.log(`Detailed Slide Analysis: Slide ${slideNum}`);
  console.log("=".repeat(70));

  // Get our SVG output
  const slide = presentation.getSlide(slideNum);
  const svg = slide.renderSVG();

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

    const schemeClrPattern = /<a:schemeClr val="([^"]+)"[^\/]*\/>/g;
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
