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

describe("PPTX patcher import conventions", () => {
  it("does not import XML helpers or types via patcher/core barrel", async () => {
    const patcherRoot = path.dirname(fileURLToPath(import.meta.url));
    const packageRoot = path.resolve(patcherRoot, "..", "..");

    const tsFiles = await listTsFilesRecursively(patcherRoot);

    const violations: string[] = [];
    let directXmlImports = 0;

    const bannedCoreBarrelImportPattern =
      /import\s+(?:type\s+)?\{[^}]*\b(?:createElement|createText|Xml(?:Element|Document|Node))\b[^}]*\}\s+from\s+["'](?:\.\.\/)+core["']\s*;?/g;
    const desiredDirectXmlImportPattern = /from\s+["']@oxen\/xml["']\s*;?/g;

    for (const filePath of tsFiles) {
      const source = await fs.readFile(filePath, "utf8");
      if (bannedCoreBarrelImportPattern.test(source)) {
        violations.push(path.relative(packageRoot, filePath));
      }
      directXmlImports += (source.match(desiredDirectXmlImportPattern) ?? []).length;
    }

    expect(violations).toEqual([]);
    expect(directXmlImports).toBeGreaterThan(0);
  });
});

