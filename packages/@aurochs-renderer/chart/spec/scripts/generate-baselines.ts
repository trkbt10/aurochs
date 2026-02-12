/**
 * @file Generate baseline PNG images for chart visual regression tests
 *
 * Usage: bun run spec/scripts/generate-baselines.ts
 *
 * This script:
 * 1. Scans for fixture files (*.fixture.ts) in spec/{chartType}/fixtures/
 * 2. Renders each Chart to SVG
 * 3. Converts SVG to PNG using resvg
 * 4. Saves PNG as baseline alongside the fixture
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { glob } from "glob";
import { renderChartFixture } from "./test-helper";
import { svgToPng } from "./compare";

const SPEC_DIR = path.join(import.meta.dir, "..");

async function main() {
  const fixturePattern = path.join(SPEC_DIR, "**/fixtures/*.fixture.ts");
  const fixtureFiles = await glob(fixturePattern);

  console.log(`Found ${fixtureFiles.length} fixture file(s)`);

  for (const fixturePath of fixtureFiles) {
    const fixtureModule = await import(fixturePath);
    const chart = fixtureModule.default ?? fixtureModule.chart;

    if (!chart) {
      console.warn(`No chart export found in ${fixturePath}`);
      continue;
    }

    const baseName = path.basename(fixturePath, ".fixture.ts");
    const pngPath = path.join(path.dirname(fixturePath), `${baseName}.png`);

    console.log(`Generating: ${baseName}.png`);

    const { svg, width } = renderChartFixture(chart);
    const pngBuffer = svgToPng(svg, width);

    fs.writeFileSync(pngPath, pngBuffer);
    console.log(`  -> ${pngPath}`);
  }

  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
