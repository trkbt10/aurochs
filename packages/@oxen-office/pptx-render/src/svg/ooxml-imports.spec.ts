import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const svgDir = path.dirname(fileURLToPath(import.meta.url));

type ImportCheck = {
  readonly name: string;
  readonly message: string;
  readonly predicate: (source: string) => boolean;
};

const checks: readonly ImportCheck[] = [
  {
    name: "no-unit-imports-from-pptx-domain-types",
    message:
      'Avoid importing OOXML unit types/constructors from "@oxen-office/pptx/domain/types"; import from "@oxen-office/ooxml/domain/units" instead.',
    predicate: (source) =>
      !/import\s+(?:type\s+)?\{[^}]*\b(px|pt|pct|deg|emu|Pixels|Points|Percent|Degrees|EMU)\b[^}]*\}\s+from\s+["']\.\.\/\.\.\/domain\/types["']\s*;/.test(
        source,
      ),
  },
  {
    name: "no-color-imports-from-pptx-domain",
    message:
      'Avoid importing OOXML Color from "@oxen-office/pptx/domain" or "../../domain/index"; import from "@oxen-office/ooxml/domain/color" instead.',
    predicate: (source) =>
      !/import\s+(?:type\s+)?\{[^}]*\bColor\b[^}]*\}\s+from\s+["']\.\.\/\.\.\/domain(?:\/index)?["']\s*;/.test(
        source,
      ),
  },
  {
    name: "no-color-imports-from-pptx-color-types",
    message:
      'Avoid importing OOXML Color from "@oxen-office/pptx/domain/color/types"; import from "@oxen-office/ooxml/domain/color" instead.',
    predicate: (source) =>
      !/import\s+(?:type\s+)?\{[^}]*\bColor\b[^}]*\}\s+from\s+["']\.\.\/\.\.\/domain\/color\/types["']\s*;/.test(
        source,
      ),
  },
];

describe("svg module import policy (OOXML direct imports)", () => {
  it("does not use PPTX barrel exports for OOXML types", async () => {
    const entries = await readdir(svgDir, { withFileTypes: true });
    const tsFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".md"))
      .map((e) => e.name)
      .sort();

    const failures: string[] = [];
    for (const fileName of tsFiles) {
      const source = await readFile(path.join(svgDir, fileName), "utf-8");
      for (const check of checks) {
        if (!check.predicate(source)) {
          failures.push(`${fileName}: ${check.name} - ${check.message}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
