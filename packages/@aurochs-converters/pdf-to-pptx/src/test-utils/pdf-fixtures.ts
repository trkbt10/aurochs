/**
 * @file PDF fixture path utilities for tests
 */

import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function findRepoRootDir(startDir: string): string {
  // eslint-disable-next-line no-restricted-syntax -- mutable accumulator for directory traversal
  let dir = startDir;
  for (let i = 0; i < 15; i++) {
    const pkgPath = path.join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { readonly name?: unknown };
        if (pkg.name === "web-pptx") {
          return dir;
        }
      } catch (_error: unknown) { // eslint-disable-line @typescript-eslint/no-unused-vars -- catch requires error param
        // ignore parse failures
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error("Failed to locate repo root (package.json name=web-pptx).");
}

const repoRootDir = findRepoRootDir(path.dirname(fileURLToPath(import.meta.url)));

/**
 * Get the absolute path to a PDF fixture file in the test fixtures directory.
 */
export function getPdfFixturePath(basename: string): string {
  if (basename.includes("/") || basename.includes("\\") || basename.includes("..")) {
    throw new Error(`basename must be a file name only: ${basename}`);
  }
  return path.join(repoRootDir, "packages", "@aurochs-converters", "pdf-to-pptx", "spec", "fixtures", "pdf", basename);
}

/**
 * Get the absolute path to a sample fixture file.
 */
export function getSampleFixturePath(basename: string): string {
  if (basename.includes("/") || basename.includes("\\") || basename.includes("..")) {
    throw new Error(`basename must be a file name only: ${basename}`);
  }
  return path.join(repoRootDir, "fixtures", "samples", basename);
}
