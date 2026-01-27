import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT_DIR = path.resolve(__dirname, "../../../../..");

export function resolveRepoPath(relativePath: string): string {
  if (!relativePath) {
    throw new Error("relativePath is required");
  }
  const resolved = path.resolve(REPO_ROOT_DIR, relativePath);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${relativePath} (resolved: ${resolved})`);
  }
  return resolved;
}

