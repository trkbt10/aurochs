#!/usr/bin/env bun
/**
 * @file Generate `.xls` fixture files for integration tests.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { buildMinimalCfbWithWorkbookStream } from "./lib/cfb";
import { buildAllFeaturesWorkbookStream } from "./fixtures/all-features";
import { buildMinimalWorkbookStream } from "./fixtures/minimal";

export const DEFAULT_XLS_FIXTURE_DIR = path.resolve("spec", "xls-fixtures");

export type GenerateXlsFixturesOptions = {
  readonly outputDir: string;
  readonly log?: boolean;
};

type FixtureWriter = {
  readonly fileName: string;
  readonly buildWorkbookStream: () => Uint8Array;
};

const FIXTURES: readonly FixtureWriter[] = [
  { fileName: "minimal.xls", buildWorkbookStream: buildMinimalWorkbookStream },
  { fileName: "all-features.xls", buildWorkbookStream: buildAllFeaturesWorkbookStream },
];

/** Generate `.xls` fixtures and return the written file paths. */
export async function generateXlsFixtures(options: GenerateXlsFixturesOptions): Promise<readonly string[]> {
  fs.mkdirSync(options.outputDir, { recursive: true });

  const generated: string[] = [];
  for (const fixture of FIXTURES) {
    const workbookStream = fixture.buildWorkbookStream();
    // Avoid CFB mini-stream complexity by ensuring the Workbook stream is >= 4096 bytes (mini stream cutoff).
    const paddedWorkbookStream = new Uint8Array(Math.max(workbookStream.length, 4096));
    paddedWorkbookStream.set(workbookStream, 0);
    const xlsBytes = buildMinimalCfbWithWorkbookStream(paddedWorkbookStream);
    const outPath = path.join(options.outputDir, fixture.fileName);
    await fs.promises.writeFile(outPath, xlsBytes);
    generated.push(outPath);
    if (options.log ?? true) {
      console.log(`Generated: ${fixture.fileName}`);
    }
  }

  return generated;
}

async function main(): Promise<void> {
  await generateXlsFixtures({ outputDir: DEFAULT_XLS_FIXTURE_DIR });
  console.log("All XLS fixtures generated!");
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
