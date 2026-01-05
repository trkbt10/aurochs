/**
 * ECMA-376 Compliance Analysis Tool
 *
 * Analyzes PPTX files for ECMA-376 compliance in rendering:
 * - Background image stretch mode (ECMA-376 Part 1, Section 20.1.8.56)
 * - Text baseline calculation (ECMA-376 Part 1, Section 21.1.2.1.12)
 * - Line spacing (ECMA-376 Part 1, Section 21.1.2.2.5)
 *
 * Usage:
 *   bun run scripts/analyze-ecma376-compliance.ts <pptx-path> [slide-number]
 *
 * @see ECMA-376 Part 1, Section 20.1.8.56 (a:stretch)
 * @see ECMA-376 Part 1, Section 21.1.2.1.12 (fontAlgn)
 * @see ECMA-376 Part 1, Section 21.1.2.2.5 (a:lnSpc)
 */

import * as fs from "node:fs";
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS } from "../src/pptx";
import { loadPptxFile } from "./lib/pptx-loader";

type AnalysisResult = {
  file: string;
  slide: number;
  backgroundAnalysis: BackgroundAnalysis;
  textAnalysis: TextAnalysis;
}

type BackgroundAnalysis = {
  hasStretch: boolean;
  hasBlipFill: boolean;
  preserveAspectRatio: string | null;
  isCompliant: boolean;
  details: string;
}

type TextAnalysis = {
  textElements: TextElement[];
  lineSpacing: LineSpacingInfo[];
}

type TextElement = {
  text: string;
  x: number;
  y: number;
  fontSize: number | null;
}

type LineSpacingInfo = {
  type: "percent" | "points" | "default";
  value: number;
}

function analyzeBackground(svg: string, xmlContent: string): BackgroundAnalysis {
  // Check XML for a:stretch element
  const hasStretch = xmlContent.includes("<a:stretch");
  const hasBlipFill = xmlContent.includes("<a:blipFill");

  // Check SVG for preserveAspectRatio
  const imageMatch = svg.match(/<image[^>]*preserveAspectRatio="([^"]+)"/);
  const preserveAspectRatio = imageMatch ? imageMatch[1] : null;

  // ECMA-376 compliance: a:stretch should map to preserveAspectRatio="none"
  const isCompliant = hasStretch ? preserveAspectRatio === "none" : true;

  let details = "";
  if (hasStretch && !isCompliant) {
    details = `Non-compliant: a:stretch requires preserveAspectRatio="none", got "${preserveAspectRatio}"`;
  } else if (hasStretch && isCompliant) {
    details = "Compliant: a:stretch correctly mapped to preserveAspectRatio=\"none\"";
  } else if (hasBlipFill) {
    details = `No a:stretch found, using preserveAspectRatio="${preserveAspectRatio}"`;
  } else {
    details = "No background image found";
  }

  return {
    hasStretch,
    hasBlipFill,
    preserveAspectRatio,
    isCompliant,
    details,
  };
}

function analyzeText(svg: string): TextAnalysis {
  const textElements: TextElement[] = [];

  // Extract text elements
  const textRegex = /<text\s+([^>]*)>([^<]*(?:<tspan[^>]*>[^<]*<\/tspan>[^<]*)*)<\/text>/g;
  let match;

  while ((match = textRegex.exec(svg)) !== null) {
    const attrs = match[1];
    const content = match[2];

    const xMatch = attrs.match(/x="([^"]+)"/);
    const yMatch = attrs.match(/y="([^"]+)"/);

    // Extract text content from tspan
    const tspanTextRegex = /<tspan[^>]*>([^<]*)<\/tspan>/g;
    let tspanMatch;
    let textContent = "";

    while ((tspanMatch = tspanTextRegex.exec(content)) !== null) {
      textContent += tspanMatch[1];
    }

    if (!textContent) {
      textContent = content.replace(/<[^>]+>/g, "").trim();
    }

    // Extract font size
    const fontSizeMatch = content.match(/font-size="(\d+(?:\.\d+)?)/);
    const fontSize = fontSizeMatch ? parseFloat(fontSizeMatch[1]) : null;

    if (xMatch && yMatch && textContent) {
      textElements.push({
        text: textContent.substring(0, 50),
        x: parseFloat(xMatch[1]),
        y: parseFloat(yMatch[1]),
        fontSize,
      });
    }
  }

  return {
    textElements,
    lineSpacing: [], // Would need deeper XML analysis
  };
}

async function analyzeSlide(
  pptxPath: string,
  slideNumber: number,
): Promise<AnalysisResult> {
  const presentationFile = await loadPptxFile(pptxPath);
  const presentation = openPresentation(presentationFile);
  const slide = presentation.getSlide(slideNumber);
  const svg = slide.renderSVG();

  // Get XML content for analysis
  const slideXml = presentationFile.readText(`ppt/slides/slide${slideNumber}.xml`) ?? "";
  const slideMasterXml = presentationFile.readText("ppt/slideMasters/slideMaster1.xml") ?? "";
  const combinedXml = slideXml + slideMasterXml;

  return {
    file: pptxPath,
    slide: slideNumber,
    backgroundAnalysis: analyzeBackground(svg, combinedXml),
    textAnalysis: analyzeText(svg),
  };
}

function printResults(result: AnalysisResult): void {
  console.log("\n" + "=".repeat(60));
  console.log(`File: ${result.file}`);
  console.log(`Slide: ${result.slide}`);
  console.log("=".repeat(60));

  console.log("\n--- Background Analysis (ECMA-376 20.1.8.56) ---");
  console.log(`  Has a:stretch: ${result.backgroundAnalysis.hasStretch}`);
  console.log(`  Has a:blipFill: ${result.backgroundAnalysis.hasBlipFill}`);
  console.log(`  preserveAspectRatio: ${result.backgroundAnalysis.preserveAspectRatio}`);
  console.log(`  ECMA-376 Compliant: ${result.backgroundAnalysis.isCompliant ? "✓ YES" : "✗ NO"}`);
  console.log(`  Details: ${result.backgroundAnalysis.details}`);

  console.log("\n--- Text Analysis (ECMA-376 21.1.2.1.12) ---");
  console.log(`  Text elements found: ${result.textAnalysis.textElements.length}`);

  if (result.textAnalysis.textElements.length > 0) {
    console.log("\n  Text positions:");
    for (const el of result.textAnalysis.textElements.slice(0, 10)) {
      console.log(`    "${el.text}" at (${el.x.toFixed(1)}, ${el.y.toFixed(1)}) fontSize=${el.fontSize}`);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Default: analyze 2411-Performance_Up.pptx
    const defaultPath = "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";

    if (!fs.existsSync(defaultPath)) {
      console.error(`Default file not found: ${defaultPath}`);
      console.log("\nUsage: bun run scripts/analyze-ecma376-compliance.ts <pptx-path> [slide-number]");
      process.exit(1);
    }

    console.log("Analyzing default file: 2411-Performance_Up.pptx");

    const presentationFile = await loadPptxFile(defaultPath);
    const presentation = openPresentation(presentationFile);
    const slideInfos = presentation.list();

    console.log(`Found ${slideInfos.length} slides`);

    for (const info of slideInfos.slice(0, 3)) {
      const result = await analyzeSlide(defaultPath, info.number);
      printResults(result);
    }
  } else {
    const pptxPath = args[0];
    const slideNumber = args[1] ? parseInt(args[1], 10) : 1;

    if (!fs.existsSync(pptxPath)) {
      console.error(`File not found: ${pptxPath}`);
      process.exit(1);
    }

    const result = await analyzeSlide(pptxPath, slideNumber);
    printResults(result);
  }
}

main().catch(console.error);
