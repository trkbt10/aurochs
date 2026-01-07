/**
 * Extract and display raw timing XML from PPTX files
 *
 * Usage:
 *   bun run scripts/extract-timing-xml.ts <pptx-path> [slide-number]
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import * as fs from "node:fs";
import { loadPptxFile } from "./lib/pptx-loader";

async function main(): Promise<void> {
  const pptxPath = process.argv[2];
  const slideNum = process.argv[3] ?? "1";

  if (!pptxPath) {
    console.log("Usage: bun run scripts/extract-timing-xml.ts <pptx-path> [slide-number]");
    console.log("Example: bun run scripts/extract-timing-xml.ts fixtures/poi-test-data/test-data/slideshow/keyframes.pptx 1");
    process.exit(1);
  }

  if (!fs.existsSync(pptxPath)) {
    console.error(`File not found: ${pptxPath}`);
    process.exit(1);
  }

  const { cache } = await loadPptxFile(pptxPath);
  const filePaths = Array.from(cache.keys());

  const slidePath = `ppt/slides/slide${slideNum}.xml`;
  const slideXml = cache.get(slidePath)?.text;

  if (!slideXml) {
    console.error(`Slide not found: ${slidePath}`);
    const slides = filePaths.filter((f) => f.match(/^ppt\/slides\/slide\d+\.xml$/));
    console.log("Available slides:", slides.join(", "));
    process.exit(1);
  }

  // Extract p:timing element
  const timingMatch = slideXml.match(/<p:timing[\s\S]*?<\/p:timing>/);

  if (!timingMatch) {
    console.log("No p:timing element found in this slide.");
    return;
  }

  console.log("=".repeat(70));
  console.log(`p:timing element from ${pptxPath} slide ${slideNum}`);
  console.log("=".repeat(70));

  // Pretty print XML
  const xml = timingMatch[0];
  const prettyXml = formatXml(xml);
  console.log(prettyXml);
}

/**
 * Simple XML formatter for readability
 */
function formatXml(xml: string): string {
  let result = "";
  let indent = 0;
  const parts = xml.replace(/></g, ">\n<").split("\n");

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length === 0) {continue;}

    // Decrease indent for closing tags
    if (trimmed.startsWith("</")) {
      indent = Math.max(0, indent - 1);
    }

    result += "  ".repeat(indent) + trimmed + "\n";

    // Increase indent for opening tags (not self-closing)
    if (
      trimmed.startsWith("<") &&
      !trimmed.startsWith("</") &&
      !trimmed.endsWith("/>") &&
      !trimmed.includes("</")
    ) {
      indent++;
    }
  }

  return result;
}

main().catch(console.error);
