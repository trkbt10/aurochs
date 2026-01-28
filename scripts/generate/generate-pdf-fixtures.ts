#!/usr/bin/env bun
import * as fs from "node:fs";
import * as path from "node:path";

export const DEFAULT_PDF_FIXTURE_DIR = path.resolve("spec", "fixtures", "pdf");

export type GeneratePdfFixturesOptions = {
  readonly outputDir: string;
  readonly log?: boolean;
};

type FixtureWriter = {
  readonly fileName: string;
  readonly generate: (options: { readonly outputDir: string }) => Promise<void>;
};

function copyFixtureToDir(outputDir: string, fileName: string): void {
  const src = path.join(DEFAULT_PDF_FIXTURE_DIR, fileName);
  const dst = path.join(outputDir, fileName);
  if (!fs.existsSync(src)) {
    throw new Error(`Missing checked-in fixture: ${src}`);
  }
  if (path.resolve(src) === path.resolve(dst)) {
    return;
  }
  fs.copyFileSync(src, dst);
}

const FIXTURES: readonly FixtureWriter[] = [
  { fileName: "simple-rect.pdf", generate: async ({ outputDir }) => copyFixtureToDir(outputDir, "simple-rect.pdf") },
  { fileName: "bezier-curves.pdf", generate: async ({ outputDir }) => copyFixtureToDir(outputDir, "bezier-curves.pdf") },
  { fileName: "colored-shapes.pdf", generate: async ({ outputDir }) => copyFixtureToDir(outputDir, "colored-shapes.pdf") },
  { fileName: "text-content.pdf", generate: async ({ outputDir }) => copyFixtureToDir(outputDir, "text-content.pdf") },
  { fileName: "multi-page.pdf", generate: async ({ outputDir }) => copyFixtureToDir(outputDir, "multi-page.pdf") },
  { fileName: "mixed-content.pdf", generate: async ({ outputDir }) => copyFixtureToDir(outputDir, "mixed-content.pdf") },
];






export async function generatePdfFixtures(
  options: GeneratePdfFixturesOptions,
): Promise<readonly string[]> {
  fs.mkdirSync(options.outputDir, { recursive: true });

  const generated: string[] = [];

  for (const fixture of FIXTURES) {
    await fixture.generate({ outputDir: options.outputDir });
    generated.push(path.join(options.outputDir, fixture.fileName));
    if (options.log ?? true) {
      console.log(`Generated: ${fixture.fileName}`);
    }
  }

  return generated;
}

function parseArgs(argv: readonly string[]): GeneratePdfFixturesOptions {
  const args = [...argv];
  let outputDir: string | null = null;
  let log: boolean | undefined;

  while (args.length > 0) {
    const arg = args.shift();
    if (!arg) {break;}

    if (arg === "--outputDir") {
      const value = args.shift();
      if (!value) {throw new Error("--outputDir requires a value");}
      outputDir = value;
      continue;
    }
    if (arg === "--log") {
      log = true;
      continue;
    }
    if (arg === "--no-log") {
      log = false;
      continue;
    }

    throw new Error(`Unknown arg: ${arg}`);
  }

  if (!outputDir) {
    throw new Error(
      "Missing required --outputDir. Example: bun run scripts/generate/generate-pdf-fixtures.ts --outputDir spec/fixtures/pdf",
    );
  }

  return { outputDir, log };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await generatePdfFixtures(options);
  console.log("All fixtures generated!");
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
