/** @file Utilities for locating PDF test fixture files */
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function findRepoRootDir(startDir: string): string {
  const REPO_PACKAGE_NAMES = new Set(["aurochs", "aurochs-workspace"]);

  const findRoot = (dir: string, depth: number): string | null => {
    if (depth >= 15) {return null;}
    const pkgPath = path.join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { readonly name?: unknown };
        if (typeof pkg.name === "string" && REPO_PACKAGE_NAMES.has(pkg.name)) {
          return dir;
        }
      } catch (error) {
        console.debug("[PDF fixtures] package.json parse error:", error);
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {return null;}
    return findRoot(parent, depth + 1);
  };

  const result = findRoot(startDir, 0);
  if (result === null) {
    throw new Error("Failed to locate repo root (package.json name in {aurochs, aurochs-workspace}).");
  }
  return result;
}

const repoRootDir = findRepoRootDir(path.dirname(fileURLToPath(import.meta.url)));

/** Get the absolute path to a PDF fixture file by its basename. */
export function getPdfFixturePath(basename: string): string {
  if (basename.includes("/") || basename.includes("\\") || basename.includes("..")) {
    throw new Error(`basename must be a file name only: ${basename}`);
  }
  return path.join(repoRootDir, "packages", "@aurochs-converters", "pdf-to-pptx", "spec", "fixtures", "pdf", basename);
}

/** Get the absolute path to a sample fixture file by its basename. */
export function getSampleFixturePath(basename: string): string {
  if (basename.includes("/") || basename.includes("\\") || basename.includes("..")) {
    throw new Error(`basename must be a file name only: ${basename}`);
  }
  return path.join(repoRootDir, "fixtures", "samples", basename);
}
