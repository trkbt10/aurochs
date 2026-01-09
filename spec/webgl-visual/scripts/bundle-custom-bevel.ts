#!/usr/bin/env bun
/**
 * Bundle Custom Bevel for Browser Testing
 *
 * Creates a self-contained bundle of the custom bevel implementation
 * that can be loaded in Puppeteer for visual testing.
 */

import * as path from "node:path";
import * as fs from "node:fs";

type BunBuildConfig = {
  readonly entrypoints: readonly string[];
  readonly outdir: string;
  readonly target: "browser" | "node";
  readonly format: "esm" | "cjs";
  readonly minify: boolean;
  readonly sourcemap: "none" | "inline" | "external";
  readonly external?: readonly string[];
  readonly naming?: {
    readonly entry?: string;
  };
};

type BunBuildResult = {
  readonly success: boolean;
  readonly logs?: readonly unknown[];
};

declare const Bun: {
  readonly build: (config: BunBuildConfig) => Promise<BunBuildResult>;
};

const ROOT_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../..",
);

const OUTPUT_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "dist",
);

async function bundle(): Promise<void> {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const bevelDir = path.join(ROOT_DIR, "src/pptx/render/webgl/text3d/geometry/bevel");
  const customBevelPath = path.join(ROOT_DIR, "src/pptx/render/webgl/text3d/geometry/custom-bevel");

  // Create entry point that exports the custom bevel functions
  const entryContent = `
export {
  createExtrudedGeometryWithBevel,
  threeShapeToShapeInput,
  bevelGeometryDataToThreeGeometry,
  shapeInputToThreeShape,
} from "${bevelDir}/three-adapter";

export {
  createCustomBevelGeometry,
  getBevelProfile,
  BEVEL_PROFILES,
} from "${customBevelPath}";

export {
  extractBevelPathsFromShape,
} from "${bevelDir}/path-extraction";

export {
  generateBevelMesh,
  mergeBevelGeometries,
} from "${bevelDir}/mesh-generation";

export {
  generateExtrusion,
} from "${bevelDir}/extrusion";

export {
  expandShape,
  shrinkShape,
} from "${bevelDir}/shape-expansion";

export type {
  BevelSpec,
  AsymmetricBevelSpec,
} from "${bevelDir}/three-adapter";

export type {
  BevelProfile,
  BevelMeshConfig,
  BevelGeometryData,
  ShapeInput,
  Vector2,
} from "${bevelDir}/types";
`;

  const entryPath = path.join(OUTPUT_DIR, "_entry.ts");
  fs.writeFileSync(entryPath, entryContent);

  // Bundle using Bun
  const result = await Bun.build({
    entrypoints: [entryPath],
    outdir: OUTPUT_DIR,
    target: "browser",
    format: "esm",
    minify: false,
    sourcemap: "none",
    external: ["three"],
    naming: {
      entry: "custom-bevel.js",
    },
  });

  if (result.success) {
    // Post-process: Replace THREE import with global reference
    const bundlePath = path.join(OUTPUT_DIR, "custom-bevel.js");
    let bundleContent = fs.readFileSync(bundlePath, "utf-8");

    // Replace ES module import with global reference
    bundleContent = bundleContent.replace(
      /import \* as THREE from ["']three["'];?/g,
      "const THREE = window.THREE;",
    );

    // Also replace any other THREE imports
    bundleContent = bundleContent.replace(
      /import \* as THREE\d* from ["']three["'];?/g,
      "",
    );

    // Replace ShapeUtils import with global reference
    bundleContent = bundleContent.replace(
      /import \{ ShapeUtils \} from ["']three["'];?/g,
      "const ShapeUtils = THREE.ShapeUtils;",
    );

    fs.writeFileSync(bundlePath, bundleContent);
  }

  if (!result.success) {
    console.error("Bundle failed:");
    for (const log of result.logs ?? []) {
      console.error(log);
    }
    process.exit(1);
  }

  // Clean up entry file
  fs.unlinkSync(entryPath);

  console.log(`Bundle created: ${path.join(OUTPUT_DIR, "custom-bevel.js")}`);
}

bundle().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
