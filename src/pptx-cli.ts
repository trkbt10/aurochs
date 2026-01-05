#!/usr/bin/env node
/**
 * @file PPTX to JSON CLI
 * Converts PowerPoint files to structured JSON
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { openPresentation } from "./pptx";
import { loadPptxBundleFromBuffer } from "./pptx/app/pptx-loader";

type CliArgs = {
  input: string;
  output: string;
};

function parseArgs(args: string[]): CliArgs {
  const result: Partial<CliArgs> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--input" || arg === "-i") {
      result.input = args[++i];
    } else if (arg === "--output" || arg === "-o") {
      result.output = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  if (result.input === undefined) {
    console.error("Error: --input is required");
    printUsage();
    process.exit(1);
  }

  if (result.output === undefined) {
    console.error("Error: --output is required");
    printUsage();
    process.exit(1);
  }

  return result as CliArgs;
}

function printUsage(): void {
  console.log(`
Usage: pptx-cli --input <pptx-file> --output <html-file>

Options:
  -i, --input   Input PPTX file path (required)
  -o, --output  Output HTML file path (required)
  -h, --help    Show this help message
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output);

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`Reading: ${inputPath}`);
  const pptxBuffer = fs.readFileSync(inputPath);

  console.log("Parsing PPTX...");
  const startTime = performance.now();
  const { presentationFile } = await loadPptxBundleFromBuffer(pptxBuffer);

  console.log("Opening presentation...");
  const presentation = openPresentation(presentationFile);

  console.log("Extracting slides...");
  const slides = [];
  for (const slide of presentation.slides()) {
    slides.push({
      number: slide.number,
      filename: slide.filename,
      hasLayout: slide.layout !== null,
      hasMaster: slide.master !== null,
      hasTheme: slide.theme !== null,
      hasDiagram: slide.diagram !== null,
    });
  }

  const endTime = performance.now();
  console.log(`Processing time: ${Math.round(endTime - startTime)}ms`);
  console.log(`Extracted ${slides.length} slides`);

  const output = {
    size: presentation.size,
    count: presentation.count,
    appVersion: presentation.appVersion,
    hasThumbnail: presentation.thumbnail !== null,
    slides,
  };

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Output written to: ${outputPath}`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
