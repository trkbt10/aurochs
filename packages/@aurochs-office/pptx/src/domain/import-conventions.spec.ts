/** @file Regression tests for domain type import conventions */

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

describe("PPTX domain import conventions", () => {
  it("does not import OOXML Color via domain/color/types", async () => {
    const domainRoot = path.dirname(fileURLToPath(import.meta.url));
    const packageRoot = path.resolve(domainRoot, "..", "..");

    const excluded = new Set<string>([
      path.join(domainRoot, "types.ts"),
      path.join(domainRoot, "color/types.ts"),
      path.join(domainRoot, "index.ts"),
    ]);

    const tsFiles = (await listTsFilesRecursively(domainRoot)).filter((filePath) => !excluded.has(filePath));

    const importsColorFromDomainColorTypes: string[] = [];
    // eslint-disable-next-line no-restricted-syntax -- mutable counter
    let importsColorFromOoxml = 0;

    const bannedImportPattern =
      /import\s+(?:type\s+)?\{[^}]*\bColor\b[^}]*\}\s+from\s+["'][^"']*color\/types["']\s*;?/g;
    const desiredImportPattern = /from\s+["']@aurochs-office\/drawing-ml\/domain\/color["']\s*;?/g;

    for (const filePath of tsFiles) {
      const source = await fs.readFile(filePath, "utf8");
      if (bannedImportPattern.test(source)) {
        importsColorFromDomainColorTypes.push(path.relative(packageRoot, filePath));
      }
      importsColorFromOoxml += (source.match(desiredImportPattern) ?? []).length;
    }

    expect(importsColorFromDomainColorTypes).toEqual([]);
    expect(importsColorFromOoxml).toBeGreaterThan(0);
  });
});
