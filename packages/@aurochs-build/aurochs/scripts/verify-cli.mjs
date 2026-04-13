#!/usr/bin/env node
/* global console, process -- Node.js globals for .mjs script */
/**
 * @file Verify that the built CLI can be loaded and executed without errors.
 *
 * Usage: node scripts/verify-cli.mjs
 *
 * Catches bundler bugs (e.g. undeclared variables from miscompiled CJS modules)
 * that would cause a ReferenceError at module load time.
 *
 * Two checks:
 * 1. The CLI file exists
 * 2. `node cli.js --help` succeeds (exit 0) and prints "Usage:"
 *    — a ReferenceError or SyntaxError at load time would exit non-zero.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { access, constants } from "node:fs/promises";
import { execFile } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, "../../../../publish/aurochs/dist/cli.js");

async function main() {
  // 1. Check file exists
  try {
    await access(cliPath, constants.R_OK);
    console.log(`✓ CLI file exists: ${cliPath}`);
  } catch {
    console.error(`✗ CLI not found: ${cliPath}`);
    console.error("  Run build:cli first.");
    process.exit(1);
  }

  // 2. Run --help — this loads the module and executes commander.
  //    Any ReferenceError / SyntaxError at load time will cause a non-zero exit.
  await new Promise((resolvePromise, reject) => {
    execFile(process.execPath, [cliPath, "--help"], { timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("✗ CLI failed to start");
        console.error(`  exit code: ${error.code}`);
        if (stderr) console.error(`  stderr: ${stderr.slice(0, 500)}`);
        reject(error);
        return;
      }
      if (!stdout.includes("Usage:")) {
        console.error("✗ CLI --help output missing 'Usage:' header");
        console.error(`  stdout: ${stdout.slice(0, 200)}`);
        process.exit(1);
        return;
      }
      console.log("✓ CLI --help executed successfully");
      resolvePromise();
    });
  });

  console.log("\n--- CLI verification passed ---");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
