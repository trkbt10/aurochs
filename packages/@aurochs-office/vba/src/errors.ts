/**
 * @file VBA error types
 *
 * Structured error types for VBA parsing and runtime.
 */

// =============================================================================
// Parse Errors
// =============================================================================

/**
 * Error during vbaProject.bin parsing.
 */
export class VbaParseError extends Error {
  override readonly name = "VbaParseError";

  constructor(
    message: string,
    /** Stream or section where error occurred */
    readonly location?: string,
    /** Byte offset within stream (if applicable) */
    readonly offset?: number
  ) {
    super(message);
  }
}

// =============================================================================
// Not Implemented Errors
// =============================================================================

/**
 * Error for features not yet implemented.
 *
 * Used when parser or runtime encounters a valid but unsupported feature.
 * This is distinct from VbaParseError which indicates malformed data.
 */
export class VbaNotImplementedError extends Error {
  override readonly name = "VbaNotImplementedError";

  constructor(
    /** Feature that is not implemented */
    readonly feature: string
  ) {
    super(`VBA feature not implemented: ${feature}`);
  }
}
