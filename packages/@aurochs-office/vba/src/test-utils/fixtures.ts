/**
 * @file Test fixture utilities
 *
 * Provides CWD-independent fixture path resolution for tests.
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Get the directory containing the fixtures folder.
 * Works regardless of current working directory.
 */
function getPackageRoot(): string {
  // This file is at: src/test-utils/fixtures.ts
  // Package root is: ../../
  const thisFile = fileURLToPath(import.meta.url);
  const thisDir = dirname(thisFile);
  return resolve(thisDir, "../..");
}

/**
 * Resolve a fixture path relative to the package fixtures directory.
 *
 * @param relativePath - Path relative to fixtures/ (e.g., "SimpleMacro.xlsm")
 * @returns Absolute path to the fixture file
 *
 * @example
 * ```typescript
 * const xlsmPath = resolveFixture("SimpleMacro.xlsm");
 * const bytes = readFileSync(xlsmPath);
 * ```
 */
export function resolveFixture(relativePath: string): string {
  return resolve(getPackageRoot(), "fixtures", relativePath);
}

/**
 * Common fixture paths for convenience.
 */
export const FIXTURES = {
  SIMPLE_MACRO_XLSM: resolveFixture("SimpleMacro.xlsm"),
  SIMPLE_MACRO_DOCM: resolveFixture("SimpleMacro.docm"),
  SIMPLE_MACRO_PPTM: resolveFixture("SimpleMacro.pptm"),
} as const;
