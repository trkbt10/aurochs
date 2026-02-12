/**
 * PPTX Structure Analysis Tool
 *
 * Analyzes PPTX file structure including slides, layouts, masters, and themes.
 *
 * Usage:
 *   bun run scripts/analyze/analyze-pptx-structure.ts <pptx-path> [options]
 *
 * Options:
 *   --slide=N        Analyze specific slide (1-indexed)
 *   --layouts        List all layouts and their shapes
 *   --masters        List all masters and their shapes
 *   --relationships  Show relationship mappings
 *   --shapes         Count shapes at each level
 *
 * Examples:
 *   bun run scripts/analyze-pptx-structure.ts themes.pptx
 *   bun run scripts/analyze-pptx-structure.ts themes.pptx --slide=6
 *   bun run scripts/analyze-pptx-structure.ts themes.pptx --shapes
 */
import * as fs from "node:fs";
import { requireFileExists, usageError } from "../lib/cli";
import { loadPptxFile } from "../lib/pptx-loader";

type AnalysisOptions = {
  slideNum?: number;
  showLayouts?: boolean;
  showMasters?: boolean;
  showRelationships?: boolean;
  showShapes?: boolean;
};

type ShapeInfo = {
  id: string;
  name: string;
  type: string;
  hasGeometry: boolean;
  isPlaceholder: boolean;
};

function parseArgs(): { pptxPath: string; options: AnalysisOptions } {
  const usage = "bun run scripts/analyze/analyze-pptx-structure.ts <pptx-path> [options]";
  const args = process.argv.slice(2);
  const pptxPath = args.find((a) => !a.startsWith("--"));
  if (!pptxPath) {
    throw usageError("Missing required argument: pptx-path", usage);
  }
  requireFileExists(pptxPath, usage);

  const slideArg = args.find((a) => a.startsWith("--slide="));
  const slideNum = slideArg ? Number.parseInt(slideArg.split("=")[1] ?? "", 10) : undefined;

  const options: AnalysisOptions = {
    slideNum,
    showLayouts: args.includes("--layouts"),
    showMasters: args.includes("--masters"),
    showRelationships: args.includes("--relationships"),
    showShapes: args.includes("--shapes"),
  };

  // Default to showing shapes if no specific option
  if (!options.showLayouts && !options.showMasters && !options.showRelationships) {
    options.showShapes = true;
  }

  return { pptxPath, options };
}

function countShapes(xml: string): number {
  const spMatches = xml.match(/<p:sp\b/g) ?? [];
  const picMatches = xml.match(/<p:pic\b/g) ?? [];
  const grpMatches = xml.match(/<p:grpSp\b/g) ?? [];
  const cxnMatches = xml.match(/<p:cxnSp\b/g) ?? [];
  return spMatches.length + picMatches.length + grpMatches.length + cxnMatches.length;
}

function extractShapeInfo(xml: string): ShapeInfo[] {
  const shapes: ShapeInfo[] = [];

  // Match p:sp elements (simplified regex)
  const spPattern = /<p:sp[^>]*>([\s\S]*?)<\/p:sp>/g;
  let match;
  while ((match = spPattern.exec(xml)) !== null) {
    const content = match[1];
    const idMatch = content.match(/id="(\d+)"/);
    const nameMatch = content.match(/name="([^"]+)"/);
    const hasGeometry = content.includes("<a:prstGeom") || content.includes("<a:custGeom");
    const isPlaceholder = content.includes("<p:ph ");

    shapes.push({
      id: idMatch?.[1] ?? "?",
      name: nameMatch?.[1] ?? "Unknown",
      type: "sp",
      hasGeometry,
      isPlaceholder,
    });
  }

  return shapes;
}

function getShowMasterSp(xml: string): boolean | undefined {
  const match = xml.match(/showMasterSp="(\d)"/);
  if (match === null) {return undefined;}
  return match[1] === "1";
}

async function main() {
  const { pptxPath, options } = parseArgs();

  if (!fs.existsSync(pptxPath)) {
    console.error(`File not found: ${pptxPath}`);
    process.exit(1);
  }

  const { cache } = await loadPptxFile(pptxPath);
  const filePaths = Array.from(cache.keys());

  // Read file content helper
  const readFile = async (path: string): Promise<string | null> => {
    return cache.get(path)?.text ?? null;
  };

  // Get list of slides
  const slideFiles = filePaths
    .filter((f) => f.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)![1], 10);
      const numB = parseInt(b.match(/slide(\d+)/)![1], 10);
      return numA - numB;
    });

  console.log("=".repeat(70));
  console.log(`PPTX Structure Analysis: ${pptxPath}`);
  console.log(`Total slides: ${slideFiles.length}`);
  console.log("=".repeat(70));

  // Process each slide
  for (let i = 0; i < slideFiles.length; i++) {
    const slideNum = i + 1;

    // Skip if specific slide requested and this isn't it
    if (options.slideNum !== undefined && slideNum !== options.slideNum) {continue;}

    const slideFile = slideFiles[i];
    const slideXml = await readFile(slideFile);
    if (slideXml === null) {continue;}

    // Get relationships
    const relsPath = slideFile.replace("slides/", "slides/_rels/") + ".rels";
    const relsXml = await readFile(relsPath);
    const layoutMatch = relsXml?.match(/Target="\.\.\/slideLayouts\/([^"]+)"/);
    const layoutName = layoutMatch?.[1] ?? "unknown";

    // Get layout content
    const layoutPath = `ppt/slideLayouts/${layoutName}`;
    const layoutXml = await readFile(layoutPath);

    // Get master from layout
    const layoutRelsPath = `ppt/slideLayouts/_rels/${layoutName}.rels`;
    const layoutRelsXml = await readFile(layoutRelsPath);
    const masterMatch = layoutRelsXml?.match(/Target="\.\.\/slideMasters\/([^"]+)"/);
    const masterName = masterMatch?.[1] ?? "unknown";

    // Get master content
    const masterPath = `ppt/slideMasters/${masterName}`;
    const masterXml = await readFile(masterPath);

    console.log();
    console.log(`Slide ${slideNum}`);
    console.log("-".repeat(40));

    if (options.showRelationships) {
      console.log(`  Layout: ${layoutName}`);
      console.log(`  Master: ${masterName}`);
    }

    if (options.showShapes) {
      const slideShapes = countShapes(slideXml);
      const layoutShapes = layoutXml ? countShapes(layoutXml) : 0;
      const masterShapes = masterXml ? countShapes(masterXml) : 0;

      const layoutShowMaster = layoutXml ? getShowMasterSp(layoutXml) : undefined;
      const slideShowMaster = getShowMasterSp(slideXml);

      console.log(`  Slide shapes:  ${slideShapes}`);
      console.log(`  Layout shapes: ${layoutShapes} (layout=${layoutName})`);
      console.log(`  Master shapes: ${masterShapes} (master=${masterName})`);
      console.log(`  showMasterSp:  slide=${slideShowMaster ?? "default"}, layout=${layoutShowMaster ?? "default"}`);

      // Total renderable shapes
      const effectiveShowMaster = slideShowMaster ?? layoutShowMaster ?? true;
      const totalShapes = slideShapes + layoutShapes + (effectiveShowMaster ? masterShapes : 0);
      console.log(`  Total renderable: ${totalShapes} (currently rendering: ${slideShapes})`);
    }

    if (options.showLayouts && layoutXml) {
      console.log("\n  Layout shapes:");
      const shapes = extractShapeInfo(layoutXml);
      for (const shape of shapes) {
        const phTag = shape.isPlaceholder ? " [placeholder]" : "";
        const geoTag = shape.hasGeometry ? " [geometry]" : "";
        console.log(`    - ${shape.name} (id=${shape.id})${phTag}${geoTag}`);
      }
    }

    if (options.showMasters && masterXml) {
      console.log("\n  Master shapes:");
      const shapes = extractShapeInfo(masterXml);
      for (const shape of shapes) {
        const phTag = shape.isPlaceholder ? " [placeholder]" : "";
        const geoTag = shape.hasGeometry ? " [geometry]" : "";
        console.log(`    - ${shape.name} (id=${shape.id})${phTag}${geoTag}`);
      }
    }
  }

  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
