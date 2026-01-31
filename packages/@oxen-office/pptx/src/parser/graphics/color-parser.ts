/**
 * @file Color parser (shared)
 *
 * Delegates DrawingML color parsing to the shared OOXML implementation.
 */

import {
  findColorElement as findColorElementBase,
  parseColor as parseColorBase,
  parseColorFromParent as parseColorFromParentBase,
} from "@oxen-office/ooxml/parser";


























/** Find color element in parent element */
export function findColorElement(...args: Parameters<typeof findColorElementBase>) {
  return findColorElementBase(...args);
}


























/** Parse color from XML element */
export function parseColor(...args: Parameters<typeof parseColorBase>) {
  return parseColorBase(...args);
}


























/** Parse color from parent element by finding color child */
export function parseColorFromParent(...args: Parameters<typeof parseColorFromParentBase>) {
  return parseColorFromParentBase(...args);
}
