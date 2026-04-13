#!/usr/bin/env node
/* global console, process -- Node.js globals for .mjs script */
/**
 * @file Verify that the built CLI can be loaded and executed without errors.
 *
 * Usage: node scripts/verify-cli.mjs
 *
 * Catches bundler bugs (e.g. undeclared variables from miscompiled CJS modules,
 * unresolved native addons) that would cause errors at module load time.
 *
 * Steps:
 * 1. Check CLI file exists
 * 2. Install external dependencies in publish directory (simulates npx environment)
 * 3. `node cli.js --help` succeeds (exit 0) and prints "Usage:"
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { access, constants, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const publishDir = resolve(__dirname, "../../../../publish/aurochs");
const cliPath = resolve(publishDir, "dist/cli.js");

async function main() {
  // 1. Check file exists
  try {
    await access(cliPath, constants.R_OK);
    console.log(`✓ CLI file exists`);
  } catch {
    console.error(`✗ CLI not found: ${cliPath}`);
    console.error("  Run build:cli first.");
    process.exit(1);
  }

  // 2. Install external dependencies so node can resolve them
  console.log("  Installing external dependencies...");
  try {
    await execFileAsync("npm", ["install", "--ignore-scripts=false"], {
      cwd: publishDir,
      timeout: 120_000,
    });
    console.log("✓ Dependencies installed");
  } catch (e) {
    console.error("✗ Failed to install dependencies");
    console.error(`  ${e.stderr || e.message}`);
    process.exit(1);
  }

  // 3. Run --help — this loads the module and executes commander.
  //    Any ReferenceError / SyntaxError at load time will cause a non-zero exit.
  try {
    const { stdout } = await execFileAsync(process.execPath, [cliPath, "--help"], {
      timeout: 30_000,
      cwd: publishDir,
    });
    if (!stdout.includes("Usage:")) {
      console.error("✗ CLI --help output missing 'Usage:' header");
      console.error(`  stdout: ${stdout.slice(0, 200)}`);
      process.exit(1);
    }
    console.log("✓ CLI --help executed successfully");
  } catch (e) {
    console.error("✗ CLI failed to start");
    if (e.stderr) console.error(`  ${e.stderr.slice(0, 500)}`);
    else console.error(`  ${e.message}`);
    process.exit(1);
  }

  // 4. Clean up installed node_modules (not part of publish artifacts)
  try {
    await rm(resolve(publishDir, "node_modules"), { recursive: true, force: true });
    await rm(resolve(publishDir, "package-lock.json"), { force: true });
  } catch {
    // best-effort cleanup
  }

  console.log("\n--- CLI verification passed ---");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
