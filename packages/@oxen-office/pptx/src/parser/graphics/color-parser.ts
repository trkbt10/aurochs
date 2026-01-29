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






export function findColorElement(...args: Parameters<typeof findColorElementBase>) {
  return findColorElementBase(...args);
}






export function parseColor(...args: Parameters<typeof parseColorBase>) {
  return parseColorBase(...args);
}






export function parseColorFromParent(...args: Parameters<typeof parseColorFromParentBase>) {
  return parseColorFromParentBase(...args);
}
