/**
 * @file Color resolution utilities
 */

import type { PptRecord } from "../records/types";
import { RT } from "../records/record-types";
import { findChildByType, findChildrenByType } from "../records/record-iterator";
import { parseColorSchemeAtom, DEFAULT_COLOR_SCHEME, type ColorScheme } from "../records/atoms/color";

/**
 * Extract color scheme from a slide or master record.
 * Falls back to default if not found.
 */
export function extractColorScheme(record: PptRecord): ColorScheme {
  const children = record.children ?? [];

  // Color scheme can be directly in the slide or in a nested container
  const colorSchemeAtom = findColorSchemeInTree(children);
  if (colorSchemeAtom) {
    return parseColorSchemeAtom(colorSchemeAtom);
  }

  return DEFAULT_COLOR_SCHEME;
}

function findColorSchemeInTree(records: readonly PptRecord[]): PptRecord | undefined {
  // Direct child
  const direct = findChildByType(records, RT.ColorSchemeAtom);
  if (direct) return direct;

  // Search in nested containers (depth 1)
  for (const rec of records) {
    if (rec.children) {
      const nested = findChildByType(rec.children, RT.ColorSchemeAtom);
      if (nested) return nested;
    }
  }

  return undefined;
}
