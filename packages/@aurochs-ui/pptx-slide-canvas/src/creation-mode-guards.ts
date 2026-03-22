/**
 * @file Guards for CreationMode type checks.
 * Extracted from presentation editor context to avoid circular dependency.
 */

import type { CreationMode } from "@aurochs-ui/ooxml-components";

/**
 * Check if the creation mode is pen drawing mode.
 */
export function isPenMode(mode: CreationMode): mode is { type: "pen" } {
  return mode.type === "pen";
}

/**
 * Check if the creation mode is a path-based drawing mode (pen, pencil, or path-edit).
 */
export function isPathMode(mode: CreationMode): boolean {
  return mode.type === "pen" || mode.type === "pencil" || mode.type === "path-edit";
}
