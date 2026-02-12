/**
 * @file Update Google Fonts families list
 *
 * Fetches Google Fonts metadata and writes:
 * - a static families JSON for the pages demo (same-origin; works on GitHub Pages)
 * - an optional small version TS module used for cache key invalidation
 */

import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

type Args = {
  readonly url: string;
  readonly out: string;
  readonly versionOut: string | null;
};

function getArgValue(args: readonly string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }
  const value = args[index + 1];
  if (typeof value !== "string" || value.trim() === "" || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function parseArgs(argv: readonly string[]): Args {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(
      [
        "Usage:",
        "  bun run scripts/update/update-google-fonts-families.ts --url <metadata-url> --out <output-json> [--versionOut <output-ts>]",
        "",
        "Example:",
        "  bun run scripts/update/update-google-fonts-families.ts --url https://fonts.google.com/metadata/fonts --out pages/public/fonts/google-fonts-families.json --versionOut pages/app/fonts/google-fonts-families.version.ts",
      ].join("\n")
    );
    process.exit(0);
  }

  const url = getArgValue(argv, "--url");
  const out = getArgValue(argv, "--out");
  if (!url || !out) {
    throw new Error('Required args: "--url" and "--out"');
  }
  const versionOut = getArgValue(argv, "--versionOut");
  return { url, out, versionOut };
}

function normalizeFamilyName(family: string): string {
  const trimmed = family.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function uniqueSortedFamilies(families: readonly string[]): readonly string[] {
  const set = new Set<string>();
  for (const family of families) {
    const normalized = normalizeFamilyName(family);
    if (normalized) {
      set.add(normalized);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function parseGoogleFontsMetadata(text: string): readonly string[] {
  const sanitized = text.replace(/^\)\]\}'\n/, "");
  const json = JSON.parse(sanitized) as {
    readonly familyMetadataList?: readonly { readonly family?: string; readonly category?: string }[];
  };
  const families = (json.familyMetadataList ?? [])
    .map((item) => item.family)
    .filter((family): family is string => typeof family === "string");
  return uniqueSortedFamilies(families);
}

function extractGoogleFontsCategories(text: string): Readonly<Record<string, string>> {
  const sanitized = text.replace(/^\)\]\}'\n/, "");
  const json = JSON.parse(sanitized) as {
    readonly familyMetadataList?: readonly { readonly family?: string; readonly category?: string }[];
  };

  const categories: Record<string, string> = {};
  for (const item of json.familyMetadataList ?? []) {
    if (typeof item.family !== "string" || item.family.trim() === "") {
      continue;
    }
    if (typeof item.category !== "string" || item.category.trim() === "") {
      continue;
    }
    categories[normalizeFamilyName(item.family)] = item.category.trim();
  }
  return categories;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const response = await fetch(args.url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const families = parseGoogleFontsMetadata(text);
  const categories = extractGoogleFontsCategories(text);

  const payload = {
    source: "google-fonts",
    updatedAt: new Date().toISOString(),
    families,
    categories,
  } as const;

  await mkdir(dirname(args.out), { recursive: true });
  await Bun.write(args.out, `${JSON.stringify(payload, null, 2)}\n`);

  if (args.versionOut) {
    const versionSource = [
      "/**",
      " * @file Build-time version for the bundled Google Fonts families list.",
      " *",
      " * This file is generated/updated by `scripts/update-google-fonts-families.ts`.",
      " */",
      "",
      `export const GOOGLE_FONTS_FAMILIES_UPDATED_AT = ${JSON.stringify(payload.updatedAt)};`,
      `export const GOOGLE_FONTS_FAMILIES_COUNT = ${families.length};`,
      "",
    ].join("\n");

    await mkdir(dirname(args.versionOut), { recursive: true });
    await Bun.write(args.versionOut, versionSource);
  }

  console.log(`Wrote ${families.length} families to ${args.out}`);
}

await main();
