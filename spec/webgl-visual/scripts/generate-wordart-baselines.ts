#!/usr/bin/env bun
/**
 * Generate Screenshots for WordArt Visual Tests
 *
 * Usage:
 *   bun run spec/webgl-visual/scripts/generate-wordart-baselines.ts [options]
 *
 * Options:
 *   --all           Generate all screenshots
 *   --name=<name>   Generate screenshot for specific test
 *   --list          List all available tests
 *   --preview       Generate preview without saving to snapshots (saves to __output__)
 *   --category=<cat> Generate for specific category
 *   --debug         Enable debug mode
 *
 * Categories:
 *   preset    All 12 ECMA-376 bevel presets
 *   glyph     Different glyph types (O, A, B, S, W, 8, star, heart)
 *   size      Bevel size variations
 *   depth     Extrusion depth variations
 *   dual      Dual bevel (top + bottom)
 *   contour   Contour width tests
 *   edge      Edge cases
 *   camera    Camera angle variations
 */

import * as path from "node:path";
import * as fs from "node:fs";
import {
  captureCustomBevelScreenshot,
  saveBaseline,
  closeBrowser,
} from "../webgl-compare";
import {
  ALL_WORDART_CONFIGS,
  WORDART_CATEGORY_MAP,
  getWordArtConfigByName,
  type WordArtTestConfig,
} from "../fixtures/wordart-test-configs";

const SNAPSHOT_NAME = "wordart";

// =============================================================================
// CLI Argument Parsing
// =============================================================================

type CliArgs = {
  all: boolean;
  name: string | null;
  list: boolean;
  preview: boolean;
  category: string | null;
  debug: boolean;
};

function parseArgs(): CliArgs {
  const args: CliArgs = {
    all: false,
    name: null,
    list: false,
    preview: false,
    category: null,
    debug: false,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === "--all") {
      args.all = true;
    } else if (arg === "--list") {
      args.list = true;
    } else if (arg === "--preview") {
      args.preview = true;
    } else if (arg === "--debug") {
      args.debug = true;
    } else if (arg.startsWith("--name=")) {
      args.name = arg.slice(7);
    } else if (arg.startsWith("--category=")) {
      args.category = arg.slice(11);
    }
  }

  return args;
}

// =============================================================================
// Main Functions
// =============================================================================

function listTests(): void {
  console.log("\nWordArt Test Configurations:\n");

  const categories = [
    { name: "Bevel Presets (12)", key: "preset" },
    { name: "Glyph Types", key: "glyph" },
    { name: "Bevel Sizes", key: "size" },
    { name: "Extrusion Depths", key: "depth" },
    { name: "Dual Bevel", key: "dual" },
    { name: "Contour", key: "contour" },
    { name: "Edge Cases", key: "edge" },
    { name: "Camera Angles", key: "camera" },
  ];

  for (const cat of categories) {
    const configs = WORDART_CATEGORY_MAP[cat.key];
    console.log(`=== ${cat.name} (${configs.length}) ===`);
    for (const config of configs) {
      console.log(`  ${config.name}`);
      console.log(`    ${config.description}\n`);
    }
  }

  console.log(`\nTotal: ${ALL_WORDART_CONFIGS.length} configurations`);
  console.log("\nCategories: preset, glyph, size, depth, dual, contour, edge, camera");
}

async function generateScreenshot(
  config: WordArtTestConfig,
  preview: boolean,
  debug: boolean,
): Promise<void> {
  console.log(`\nGenerating: ${config.name}`);
  console.log(`  Description: ${config.description}`);

  try {
    const buffer = await captureCustomBevelScreenshot(config.renderConfig, debug);

    if (preview) {
      // Save to __output__ for preview
      const outputDir = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        "..",
        "__output__",
      );
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputPath = path.join(outputDir, `${config.name}.png`);
      fs.writeFileSync(outputPath, buffer);
      console.log(`  Preview saved: ${outputPath}`);
    } else {
      const savedPath = saveBaseline(buffer, SNAPSHOT_NAME, config.name);
      console.log(`  Baseline saved: ${savedPath}`);
    }
  } catch (error) {
    console.error(`  Error: ${(error as Error).message}`);
    if ((error as Error).stack) {
      console.error(`  Stack: ${(error as Error).stack}`);
    }
  }
}

async function generateAll(
  configs: WordArtTestConfig[],
  preview: boolean,
  debug: boolean,
): Promise<void> {
  console.log(`\nGenerating ${configs.length} screenshots...`);

  for (const config of configs) {
    await generateScreenshot(config, preview, debug);
  }
}

async function generateByName(name: string, preview: boolean, debug: boolean): Promise<void> {
  const config = getWordArtConfigByName(name);

  if (!config) {
    console.error(`\nError: Test "${name}" not found.`);
    console.log('\nUse --list to see available tests.');
    process.exit(1);
  }

  await generateScreenshot(config, preview, debug);
}

// =============================================================================
// Entry Point
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.list) {
    listTests();
    return;
  }

  if (!args.all && !args.name && !args.category) {
    console.log(`
WordArt Visual Test Screenshot Generator

Usage:
  bun run spec/webgl-visual/scripts/generate-wordart-baselines.ts [options]

Options:
  --all              Generate all screenshots (${ALL_WORDART_CONFIGS.length} total)
  --name=<name>      Generate screenshot for specific test
  --list             List all available tests
  --preview          Generate preview without saving to snapshots
  --category=<cat>   Generate for specific category
  --debug            Enable debug mode

Categories:
  preset     All 12 ECMA-376 bevel presets (${WORDART_CATEGORY_MAP.preset.length})
  glyph      Different glyph types (${WORDART_CATEGORY_MAP.glyph.length})
  size       Bevel size variations (${WORDART_CATEGORY_MAP.size.length})
  depth      Extrusion depth variations (${WORDART_CATEGORY_MAP.depth.length})
  dual       Dual bevel tests (${WORDART_CATEGORY_MAP.dual.length})
  contour    Contour width tests (${WORDART_CATEGORY_MAP.contour.length})
  edge       Edge cases (${WORDART_CATEGORY_MAP.edge.length})
  camera     Camera angle variations (${WORDART_CATEGORY_MAP.camera.length})

Examples:
  bun run spec/webgl-visual/scripts/generate-wordart-baselines.ts --list
  bun run spec/webgl-visual/scripts/generate-wordart-baselines.ts --all --preview
  bun run spec/webgl-visual/scripts/generate-wordart-baselines.ts --category=preset --preview
  bun run spec/webgl-visual/scripts/generate-wordart-baselines.ts --name=wordart-preset-circle --preview
`);
    return;
  }

  try {
    if (args.all) {
      await generateAll(ALL_WORDART_CONFIGS, args.preview, args.debug);
    } else if (args.category) {
      const configs = WORDART_CATEGORY_MAP[args.category];
      if (!configs) {
        console.error(`\nError: Unknown category "${args.category}"`);
        console.log("\nAvailable categories: preset, glyph, size, depth, dual, contour, edge, camera");
        process.exit(1);
      }
      await generateAll(configs, args.preview, args.debug);
    } else if (args.name) {
      await generateByName(args.name, args.preview, args.debug);
    }

    console.log("\nDone!");
  } finally {
    await closeBrowser();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
