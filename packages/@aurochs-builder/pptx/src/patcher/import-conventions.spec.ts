/** @file Regression tests for PPTX patcher import conventions */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

async function listTsFilesRecursively(dir: string): Promise<readonly string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTsFilesRecursively(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  files.sort();
  return files;
}

type ImportPatternCheckArgs = {
  readonly tsFiles: readonly string[];
  readonly packageRoot: string;
  readonly bannedPattern: RegExp;
  readonly desiredPattern: RegExp;
};

async function countImportPatterns({
  tsFiles,
  packageRoot,
  bannedPattern,
  desiredPattern,
}: ImportPatternCheckArgs): Promise<{ violations: string[]; directXmlImports: number }> {
  const violations: string[] = [];
  const directXmlImports = (
    await Promise.all(
      tsFiles.map(async (filePath) => {
        const source = await fs.readFile(filePath, "utf8");
        if (bannedPattern.test(source)) {
          violations.push(path.relative(packageRoot, filePath));
        }
        return (source.match(desiredPattern) ?? []).length;
      }),
    )
  ).reduce((sum, n) => sum + n, 0);

  return { violations, directXmlImports };
}

describe("PPTX patcher import conventions", () => {
  it("does not import XML helpers or types via patcher/core barrel", async () => {
    const patcherRoot = path.dirname(fileURLToPath(import.meta.url));
    const packageRoot = path.resolve(patcherRoot, "..", "..");

    const tsFiles = await listTsFilesRecursively(patcherRoot);

    const bannedPattern =
      /import\s+(?:type\s+)?\{[^}]*\b(?:createElement|createText|Xml(?:Element|Document|Node))\b[^}]*\}\s+from\s+["'](?:\.\.\/)+core["']\s*;?/g;
    const desiredPattern = /from\s+["']@aurochs\/xml["']\s*;?/g;

    const { violations, directXmlImports } = await countImportPatterns({
      tsFiles,
      packageRoot,
      bannedPattern,
      desiredPattern,
    });

    expect(violations).toEqual([]);
    expect(directXmlImports).toBeGreaterThan(0);
  });
});
