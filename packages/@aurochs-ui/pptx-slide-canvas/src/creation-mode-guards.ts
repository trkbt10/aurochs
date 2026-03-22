/**
 * Guards for CreationMode type checks.
 * Extracted from presentation editor context to avoid circular dependency.
 */

import type { CreationMode } from "@aurochs-ui/ooxml-components";

export function isPenMode(mode: CreationMode): mode is { type: "pen" } {
  return mode.type === "pen";
}

export function isPathMode(mode: CreationMode): boolean {
  return mode.type === "pen" || mode.type === "pencil" || mode.type === "path-edit";
}
