/**
 * @file VBA Program Loader
 *
 * Load VBA program from XLSM package.
 */

import type { ZipPackage } from "@aurochs/zip";
import { parseVbaProject, type VbaProgramIr } from "@aurochs-office/vba";

/**
 * Path to vbaProject.bin in XLSM files.
 */
const VBA_PROJECT_PATH = "xl/vbaProject.bin";

/**
 * Load VBA program from an XLSM package.
 *
 * @param pkg - ZipPackage loaded from XLSM file
 * @returns VbaProgramIr if vbaProject.bin exists, undefined otherwise
 *
 * @example
 * ```typescript
 * const pkg = await loadZipPackage(xlsmBytes);
 * const program = loadVbaProgramFromPackage(pkg);
 * if (program) {
 *   console.log("Modules:", program.modules.map(m => m.name));
 * }
 * ```
 */
export function loadVbaProgramFromPackage(pkg: ZipPackage): VbaProgramIr | undefined {
  // Check if vbaProject.bin exists
  if (!pkg.exists(VBA_PROJECT_PATH)) {
    return undefined;
  }

  // Read the binary content
  const buffer = pkg.readBinary(VBA_PROJECT_PATH);
  if (!buffer) {
    return undefined;
  }

  // Parse the VBA project
  const bytes = new Uint8Array(buffer);
  const result = parseVbaProject(bytes);

  if (!result.ok) {
    // Parse failed - log warning and return undefined
    console.warn("Failed to parse vbaProject.bin:", result.error.message);
    return undefined;
  }

  return result.program;
}

/**
 * Check if a package contains VBA macros.
 *
 * @param pkg - ZipPackage to check
 * @returns true if vbaProject.bin exists
 */
export function hasVbaProject(pkg: ZipPackage): boolean {
  return pkg.exists(VBA_PROJECT_PATH);
}
