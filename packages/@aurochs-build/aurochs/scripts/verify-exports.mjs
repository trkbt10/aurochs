#!/usr/bin/env node
/**
 * Verify that all package exports can be imported successfully.
 *
 * Usage: node scripts/verify-exports.mjs
 *
 * This script tests that each export path in package.json:
 * 1. Can be dynamically imported
 * 2. Has at least one export
 */

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publishDir = resolve(__dirname, "../../../../publish/aurochs");

async function main() {
  // Read package.json exports
  const pkgPath = resolve(publishDir, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  const exports = pkg.exports;

  if (!exports) {
    console.error("No exports found in package.json");
    process.exit(1);
  }

  const results = [];

  for (const [exportPath, exportConfig] of Object.entries(exports)) {
    // Skip non-module exports (like package.json itself)
    if (typeof exportConfig !== "object" || !exportConfig.import) {
      continue;
    }

    const importPath = resolve(publishDir, exportConfig.import);

    try {
      const module = await import(importPath);
      const exportNames = Object.keys(module);

      if (exportNames.length === 0) {
        console.log(`⚠ ${exportPath}`);
        console.log(`  warning: no exports found`);
        results.push({ path: exportPath, status: "warn", exports: 0 });
      } else {
        console.log(`✓ ${exportPath}`);
        const preview = exportNames.slice(0, 5).join(", ");
        const suffix = exportNames.length > 5 ? ` ... (${exportNames.length} total)` : "";
        console.log(`  exports: ${preview}${suffix}`);
        results.push({ path: exportPath, status: "ok", exports: exportNames.length });
      }
    } catch (e) {
      console.log(`✗ ${exportPath}`);
      console.log(`  error: ${e.message}`);
      results.push({ path: exportPath, status: "error", error: e.message });
    }
  }

  // Summary
  console.log("\n--- Summary ---");
  const ok = results.filter((r) => r.status === "ok").length;
  const warn = results.filter((r) => r.status === "warn").length;
  const err = results.filter((r) => r.status === "error").length;
  console.log(`Total: ${results.length}`);
  console.log(`  Passed: ${ok}`);
  if (warn > 0) console.log(`  Warnings: ${warn}`);
  if (err > 0) console.log(`  Failed: ${err}`);

  if (err > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
