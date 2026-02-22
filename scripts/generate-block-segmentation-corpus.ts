/**
 * @file Generate PDF corpus fixtures for block segmentation scenarios.
 *
 * Usage:
 *   bun scripts/generate-block-segmentation-corpus.ts --out-dir fixtures/samples/block-segmentation-corpus --font-path fixtures/poi-test-data/test-data/slideshow/mona.ttf
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  SEGMENTATION_CORPUS_CASES,
  buildSegmentationCorpusPdf,
  type SegmentationCorpusCaseId,
} from "../packages/@aurochs/pdf/src/services/block-segmentation/corpus-pdf-builder";

type CliArgs = {
  readonly outDir: string;
  readonly fontPath: string;
};

function parseCliArgs(argv: readonly string[]): CliArgs {
  const args = new Map<string, string>();

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token;
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    args.set(key, value);
    i += 1;
  }

  const outDir = args.get("--out-dir");
  const fontPath = args.get("--font-path");

  if (!outDir) {
    throw new Error("--out-dir is required");
  }
  if (!fontPath) {
    throw new Error("--font-path is required");
  }

  return {
    outDir,
    fontPath,
  };
}

async function main(): Promise<void> {
  const cli = parseCliArgs(process.argv.slice(2));
  const outDir = path.resolve(cli.outDir);
  const fontPath = path.resolve(cli.fontPath);

  mkdirSync(outDir, { recursive: true });

  for (const scenario of SEGMENTATION_CORPUS_CASES) {
    const bytes = await buildSegmentationCorpusPdf({
      caseId: scenario.id as SegmentationCorpusCaseId,
      fontPath,
    });
    const outPath = path.join(outDir, `${scenario.id}.pdf`);
    writeFileSync(outPath, bytes);
    console.log(`generated: ${outPath}`);
  }
}

await main();
