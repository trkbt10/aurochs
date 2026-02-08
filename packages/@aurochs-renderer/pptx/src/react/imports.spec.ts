/**
 * @file Import policy tests for @aurochs-renderer/pptx/react
 *
 * Ensures OOXML-shared types are imported from src/ooxml/domain/* instead of
 * re-export-like paths under src/pptx/domain/*.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type ImportViolation = {
  readonly file: string;
  readonly statement: string;
};

const DOMAIN_TYPES_IMPORT_RE = /(^|\n)\s*import[\s\S]*?from\s+["'][^"']*domain\/types["'][\s\S]*?;\s*/g;
const DOMAIN_COLOR_TYPES_IMPORT_RE = /(^|\n)\s*import[\s\S]*?from\s+["'][^"']*domain\/color\/types["'][\s\S]*?;\s*/g;

const DISALLOWED_UNIT_NAMES_RE = /\b(px|deg|pct|pt|emu|Pixels|Degrees|Percent|Points|EMU|Brand)\b/;
const DISALLOWED_OOXML_COLOR_FILL_NAMES_RE =
  /\b(Color|ColorSpec|ColorTransform|SrgbColor|SchemeColor|SystemColor|PresetColor|HslColor|ScrgbColor|NoFill|SolidFill|GradientFill|PatternFill|PatternType|GroupFill|PATTERN_PRESETS)\b/;

async function collectTsFiles(dir: string): Promise<readonly string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectTsFiles(entryPath);
      }
      if (!entry.isFile()) {
        return [];
      }
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
        return [];
      }
      return [entryPath];
    }),
  );
  return files.flat();
}

function findImportViolations(source: string, file: string): readonly ImportViolation[] {
  const violations: ImportViolation[] = [];

  for (const match of source.matchAll(DOMAIN_TYPES_IMPORT_RE)) {
    const statement = match[0].trim();
    if (DISALLOWED_UNIT_NAMES_RE.test(statement)) {
      violations.push({ file, statement });
    }
  }

  for (const match of source.matchAll(DOMAIN_COLOR_TYPES_IMPORT_RE)) {
    const statement = match[0].trim();
    if (DISALLOWED_OOXML_COLOR_FILL_NAMES_RE.test(statement)) {
      violations.push({ file, statement });
    }
  }

  return violations;
}

describe("@aurochs-renderer/pptx/react import policy", () => {
  it("does not import OOXML unit types from src/pptx/domain/types", async () => {
    const files = await collectTsFiles(__dirname);
    const violations: ImportViolation[] = [];

    for (const file of files) {
      const source = await readFile(file, "utf8");
      violations.push(...findImportViolations(source, path.relative(__dirname, file)));
    }

    if (violations.length > 0) {
      throw new Error(
        [
          "Found disallowed imports in packages/@aurochs-renderer/pptx/src/react:",
          ...violations.map((v) => `- ${v.file}: ${v.statement.replaceAll(/\s+/g, " ")}`),
        ].join("\n"),
      );
    }
  });
});
