import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function findRepoRootDir(startDir: string): string {
  // eslint-disable-next-line no-restricted-syntax
  let dir = startDir;
  for (let i = 0; i < 15; i++) {
    const pkgPath = path.join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { readonly name?: unknown };
        if (pkg.name === "web-pptx") {
          return dir;
        }
      } catch {
        // ignore
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {break;}
    dir = parent;
  }
  throw new Error("Failed to locate repo root (package.json name=web-pptx).");
}

const repoRootDir = findRepoRootDir(path.dirname(fileURLToPath(import.meta.url)));































export function getPdfFixturePath(basename: string): string {
  if (basename.includes("/") || basename.includes("\\") || basename.includes("..")) {
    throw new Error(`basename must be a file name only: ${basename}`);
  }
  return path.join(repoRootDir, "packages", "@oxen-converters", "pdf-to-pptx", "spec", "fixtures", "pdf", basename);
}































export function getSampleFixturePath(basename: string): string {
  if (basename.includes("/") || basename.includes("\\") || basename.includes("..")) {
    throw new Error(`basename must be a file name only: ${basename}`);
  }
  return path.join(repoRootDir, "fixtures", "samples", basename);
}
