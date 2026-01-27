import path from "node:path";
import { existsSync } from "node:fs";

const repoRootDir = path.resolve(process.cwd(), "../../..");
if (!existsSync(path.join(repoRootDir, "package.json"))) {
  throw new Error(`Expected repo root at ${repoRootDir} (run tests from packages/@oxen/pdf)`);
}

export function getPdfFixturePath(basename: string): string {
  if (basename.includes("/") || basename.includes("\\") || basename.includes("..")) {
    throw new Error(`basename must be a file name only: ${basename}`);
  }
  return path.join(repoRootDir, "spec", "fixtures", "pdf", basename);
}

export function getSampleFixturePath(basename: string): string {
  if (basename.includes("/") || basename.includes("\\") || basename.includes("..")) {
    throw new Error(`basename must be a file name only: ${basename}`);
  }
  return path.join(repoRootDir, "fixtures", "samples", basename);
}
