/**
 * @file PDF operator parser
 *
 * Parses PDF content stream tokens and extracts graphical elements.
 * Handles path construction, painting, graphics state, and text operators.
 *
 * ## Migration Note
 *
 * This module has been refactored from a class-based design to a functional
 * approach using handler registries. The new implementation provides:
 * - O(1) operator lookup via Map (instead of O(n) switch)
 * - Pure function handlers that are individually testable
 * - Immutable state transitions
 *
 * For new code, prefer importing from "./operator" directly.
 */

// Re-export all types and functions from the new implementation
export type {
  ParsedPath,
  ParsedText,
  ParsedImage,
  ParsedElement,
  TextRun,
} from "./operator";

export {
  parseContentStream,
  createParser,
  getSupportedOperators,
  OPERATOR_HANDLERS,
} from "./operator";

// =============================================================================
// Legacy Class Wrapper (for backwards compatibility during migration)
// =============================================================================

import type { PdfToken } from "../domain/content-stream";
import type { FontMappings } from "../domain";
import { parseContentStream } from "./operator";
import type { ParsedElement } from "./operator";

/**
 * @deprecated Use `parseContentStream` function instead.
 *
 * This class wrapper is provided for backwards compatibility during migration.
 * New code should use the functional API directly.
 *
 * @example
 * // Old usage (deprecated):
 * const parser = new OperatorParser(fontMappings);
 * const elements = parser.parse(tokens);
 *
 * // New usage (recommended):
 * import { parseContentStream } from "./operator";
 * const elements = parseContentStream(tokens, fontMappings);
 */
export class OperatorParser {
  private readonly fontMappings: FontMappings;

  constructor(fontMappings: FontMappings = new Map()) {
    this.fontMappings = fontMappings;
  }

  /**
   * Parse token stream and return extracted elements.
   *
   * @deprecated Use `parseContentStream(tokens, fontMappings)` instead.
   */
  parse(tokens: PdfToken[]): ParsedElement[] {
    return [...parseContentStream(tokens, this.fontMappings)];
  }
}
