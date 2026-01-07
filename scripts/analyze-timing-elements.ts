/**
 * ECMA-376 Animation/Timing Element Analysis Tool
 *
 * Analyzes PPTX files for ECMA-376 Section 19.5 animation elements:
 * - p:timing (root timing element)
 * - p:tnLst (Time Node List)
 * - p:bldLst (Build List)
 * - Animation elements: par, seq, excl, anim, animClr, animEffect, animMotion, animRot, animScale, set, audio, video, cmd
 * - p:cTn (Common Time Node)
 * - p:cBhvr (Common Behavior)
 *
 * Usage:
 *   bun run scripts/analyze-timing-elements.ts [pptx-path] [--all] [--find <element>]
 *
 * Options:
 *   --all              Scan all fixtures for timing elements
 *   --find <element>   Find files containing specific element (e.g., --find p:tavLst)
 *   [pptx-path]        Analyze specific PPTX file
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadPptxFile } from "./lib/pptx-loader";

/**
 * ECMA-376 Section 19.5 Animation Elements
 * @see ECMA-376 Part 1, Section 19.5
 */
const TIMING_ELEMENTS = {
  // Root timing elements
  "p:timing": "Root timing element for slide animations",
  "p:tnLst": "Time Node List - container for time nodes",
  "p:bldLst": "Build List - incremental animation builds",

  // Time node containers
  "p:par": "Parallel Time Node - simultaneous animations",
  "p:seq": "Sequence Time Node - sequential animations",
  "p:excl": "Exclusive - mutually exclusive timing branches",

  // Animation behavior elements
  "p:anim": "Animate - generic property animation",
  "p:animClr": "Animate Color - color property animation",
  "p:animEffect": "Animate Effect - visual effect animation",
  "p:animMotion": "Animate Motion - path-based movement",
  "p:animRot": "Animate Rotation - rotation animation",
  "p:animScale": "Animate Scale - size animation",
  "p:set": "Set - instant property change",

  // Media elements
  "p:audio": "Audio - sound playback",
  "p:video": "Video - video playback",

  // Command/Control
  "p:cmd": "Command - programmatic action",

  // Common elements
  "p:cTn": "Common Time Node - shared time node properties",
  "p:cBhvr": "Common Behavior - shared animation behavior",
  "p:tgtEl": "Target Element - animation target",
  "p:attrNameLst": "Attribute Name List - animated properties",
  "p:tavLst": "Time Animate Value List - keyframe values",
  "p:tav": "Time Animate Value - single keyframe",

  // Conditions
  "p:stCondLst": "Start Condition List",
  "p:endCondLst": "End Condition List",
  "p:cond": "Condition - trigger condition",

  // Iteration
  "p:iterate": "Iterate - animation iteration settings",
  "p:childTnLst": "Child Time Node List",
  "p:subTnLst": "Sub Time Node List",
} as const;

type TimingElement = keyof typeof TIMING_ELEMENTS;

type ElementOccurrence = {
  element: string;
  file: string;
  slide: string;
  count: number;
  attributes: string[];
}

type AnalysisResult = {
  file: string;
  hasTimingElements: boolean;
  occurrences: ElementOccurrence[];
  summary: Record<string, number>;
}

/**
 * Extract all timing element occurrences from XML content
 */
function extractTimingElements(
  xmlContent: string,
  file: string,
  slide: string,
): ElementOccurrence[] {
  const occurrences: ElementOccurrence[] = [];

  for (const element of Object.keys(TIMING_ELEMENTS) as TimingElement[]) {
    // Match element with attributes
    const regex = new RegExp(`<${element}([^>]*)`, "g");
    const matches = [...xmlContent.matchAll(regex)];

    if (matches.length > 0) {
      const attributes: string[] = [];
      for (const match of matches) {
        if (match[1]) {
          // Extract attribute names
          const attrMatches = [...match[1].matchAll(/\s+(\w+)=/g)];
          for (const attr of attrMatches) {
            if (!attributes.includes(attr[1])) {
              attributes.push(attr[1]);
            }
          }
        }
      }

      occurrences.push({
        element,
        file,
        slide,
        count: matches.length,
        attributes,
      });
    }
  }

  return occurrences;
}

/**
 * Analyze a single PPTX file
 */
async function analyzePptxFile(pptxPath: string): Promise<AnalysisResult> {
  const { cache } = await loadPptxFile(pptxPath);
  const filePaths = Array.from(cache.keys());

  const allOccurrences: ElementOccurrence[] = [];
  const summary: Record<string, number> = {};

  // Analyze all slides
  const slideFiles = filePaths.filter((f) =>
    f.match(/^ppt\/slides\/slide\d+\.xml$/),
  );

  for (const slideFile of slideFiles) {
    const content = cache.get(slideFile)?.text;
    if (!content) {continue;}
    const slideNum = slideFile.match(/slide(\d+)\.xml/)?.[1] ?? "?";
    const occurrences = extractTimingElements(content, pptxPath, `slide${slideNum}`);

    for (const occ of occurrences) {
      allOccurrences.push(occ);
      summary[occ.element] = (summary[occ.element] ?? 0) + occ.count;
    }
  }

  // Also check slide layouts and masters
  const layoutFiles = filePaths.filter((f) =>
    f.match(/^ppt\/slideLayouts\/slideLayout\d+\.xml$/) ||
    f.match(/^ppt\/slideMasters\/slideMaster\d+\.xml$/),
  );

  for (const layoutFile of layoutFiles) {
    const content = cache.get(layoutFile)?.text;
    if (!content) {continue;}
    const typeName = layoutFile.includes("slideLayout") ? "layout" : "master";
    const num = layoutFile.match(/(\d+)\.xml/)?.[1] ?? "?";
    const occurrences = extractTimingElements(content, pptxPath, `${typeName}${num}`);

    for (const occ of occurrences) {
      allOccurrences.push(occ);
      summary[occ.element] = (summary[occ.element] ?? 0) + occ.count;
    }
  }

  return {
    file: pptxPath,
    hasTimingElements: allOccurrences.length > 0,
    occurrences: allOccurrences,
    summary,
  };
}

/**
 * Find all PPTX files in fixtures
 */
async function findAllPptxFiles(baseDir: string): Promise<string[]> {
  const files: string[] = [];

  function scanDir(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith(".pptx")) {
        files.push(fullPath);
      }
    }
  }

  scanDir(baseDir);
  return files;
}

/**
 * Print analysis results
 */
function printResults(results: AnalysisResult[]): void {
  console.log("\n" + "=".repeat(70));
  console.log("ECMA-376 Section 19.5 Animation/Timing Element Analysis");
  console.log("=".repeat(70));

  // Aggregate summary
  const globalSummary: Record<string, number> = {};
  const filesWithTiming: string[] = [];

  for (const result of results) {
    if (result.hasTimingElements) {
      filesWithTiming.push(result.file);
      for (const [element, count] of Object.entries(result.summary)) {
        globalSummary[element] = (globalSummary[element] ?? 0) + count;
      }
    }
  }

  console.log(`\nFiles analyzed: ${results.length}`);
  console.log(`Files with timing elements: ${filesWithTiming.length}`);

  if (filesWithTiming.length > 0) {
    console.log("\n--- Files containing timing elements ---");
    for (const file of filesWithTiming.slice(0, 20)) {
      console.log(`  ${file}`);
    }
    if (filesWithTiming.length > 20) {
      console.log(`  ... and ${filesWithTiming.length - 20} more`);
    }
  }

  if (Object.keys(globalSummary).length > 0) {
    console.log("\n--- Element occurrence summary ---");
    const sorted = Object.entries(globalSummary).sort((a, b) => b[1] - a[1]);
    for (const [element, count] of sorted) {
      const desc = TIMING_ELEMENTS[element as TimingElement] ?? "";
      console.log(`  ${element.padEnd(20)} ${String(count).padStart(5)}  ${desc}`);
    }
  }

  // Coverage checklist
  console.log("\n--- ECMA-376 Section 19.5 Coverage Checklist ---");
  console.log("Element             | Found | Description");
  console.log("-".repeat(70));

  for (const [element, desc] of Object.entries(TIMING_ELEMENTS)) {
    const count = globalSummary[element] ?? 0;
    const status = count > 0 ? "✓" : "✗";
    console.log(`${element.padEnd(20)} | ${status.padEnd(5)} | ${desc}`);
  }

  // Print elements not found
  const notFound = Object.keys(TIMING_ELEMENTS).filter((e) => !(e in globalSummary));
  console.log(`\n--- Elements NOT found in fixtures (${notFound.length}/${Object.keys(TIMING_ELEMENTS).length}) ---`);
  for (const element of notFound) {
    console.log(`  ${element}: ${TIMING_ELEMENTS[element as TimingElement]}`);
  }
}

/**
 * Print detailed analysis for a single file
 */
function printDetailedResults(result: AnalysisResult): void {
  console.log("\n" + "=".repeat(70));
  console.log(`File: ${result.file}`);
  console.log("=".repeat(70));

  if (!result.hasTimingElements) {
    console.log("\nNo timing elements found in this file.");
    return;
  }

  console.log("\n--- Timing elements found ---");
  for (const occ of result.occurrences) {
    console.log(`\n  ${occ.element} (${occ.slide}): ${occ.count} occurrence(s)`);
    if (occ.attributes.length > 0) {
      console.log(`    Attributes: ${occ.attributes.join(", ")}`);
    }
  }

  console.log("\n--- Summary ---");
  for (const [element, count] of Object.entries(result.summary)) {
    const desc = TIMING_ELEMENTS[element as TimingElement] ?? "";
    console.log(`  ${element}: ${count} (${desc})`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle --find option
  const findIndex = args.indexOf("--find");
  if (findIndex !== -1) {
    const elementToFind = args[findIndex + 1];
    if (!elementToFind) {
      console.error("Usage: --find <element>");
      console.error("Example: --find p:tavLst");
      process.exit(1);
    }

    console.log(`Searching for files containing: ${elementToFind}\n`);

    const fixturesDir = "fixtures";
    if (!fs.existsSync(fixturesDir)) {
      console.error("fixtures directory not found");
      process.exit(1);
    }

    const pptxFiles = await findAllPptxFiles(fixturesDir);
    const filesFound: string[] = [];

    for (const pptxPath of pptxFiles) {
      try {
        const result = await analyzePptxFile(pptxPath);
        if (elementToFind in result.summary) {
          filesFound.push(pptxPath);
          console.log(`Found in: ${pptxPath} (${result.summary[elementToFind]} occurrences)`);
        }
      } catch {
        // Ignore errors
      }
    }

    console.log(`\nTotal files with ${elementToFind}: ${filesFound.length}`);
    return;
  }

  if (args.includes("--all")) {
    // Scan all fixtures
    console.log("Scanning all fixtures for timing elements...\n");

    const fixturesDir = "fixtures";
    if (!fs.existsSync(fixturesDir)) {
      console.error("fixtures directory not found");
      process.exit(1);
    }

    const pptxFiles = await findAllPptxFiles(fixturesDir);
    console.log(`Found ${pptxFiles.length} PPTX files`);

    const results: AnalysisResult[] = [];
    for (const pptxPath of pptxFiles) {
      try {
        const result = await analyzePptxFile(pptxPath);
        results.push(result);
        if (result.hasTimingElements) {
          process.stdout.write("T");
        } else {
          process.stdout.write(".");
        }
      } catch {
        process.stdout.write("E");
      }
    }
    console.log("\n");

    printResults(results);
  } else if (args.length > 0 && !args[0].startsWith("--")) {
    // Analyze specific file
    const pptxPath = args[0];
    if (!fs.existsSync(pptxPath)) {
      console.error(`File not found: ${pptxPath}`);
      process.exit(1);
    }

    const result = await analyzePptxFile(pptxPath);
    printDetailedResults(result);
  } else {
    // Default: show usage and run quick scan
    console.log("ECMA-376 Animation/Timing Element Analysis Tool\n");
    console.log("Usage:");
    console.log("  bun run scripts/analyze-timing-elements.ts [pptx-path]  Analyze specific file");
    console.log("  bun run scripts/analyze-timing-elements.ts --all        Scan all fixtures\n");

    // Quick scan of a few sample files
    const sampleFiles = [
      "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx",
      "fixtures/poi-test-data/test-data/slideshow/animation.pptx",
    ];

    console.log("Running quick scan on sample files...\n");
    for (const file of sampleFiles) {
      if (fs.existsSync(file)) {
        try {
          const result = await analyzePptxFile(file);
          console.log(`${file}:`);
          console.log(`  Has timing: ${result.hasTimingElements}`);
          if (result.hasTimingElements) {
            console.log(`  Elements: ${Object.keys(result.summary).join(", ")}`);
          }
        } catch (e) {
          console.log(`  Error: ${e}`);
        }
      }
    }
  }
}

main().catch(console.error);
