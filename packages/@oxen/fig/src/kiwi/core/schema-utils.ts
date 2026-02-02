/**
 * @file Schema utilities
 */

import type { KiwiSchema, KiwiDefinition } from "../../types";
import { FigParseError } from "../../errors";

/**
 * Find definition by name. Throws if not found.
 */
export function findDefinitionByName(
  schema: KiwiSchema,
  name: string
): KiwiDefinition {
  const def = schema.definitions.find((d) => d.name === name);
  if (!def) {
    throw new FigParseError(`Unknown type: ${name}`);
  }
  return def;
}

/**
 * Get definition by index. Throws if not found.
 */
export function getDefinitionByIndex(
  schema: KiwiSchema,
  index: number
): KiwiDefinition {
  const def = schema.definitions[index];
  if (!def) {
    throw new FigParseError(`Unknown type index: ${index}`);
  }
  return def;
}
