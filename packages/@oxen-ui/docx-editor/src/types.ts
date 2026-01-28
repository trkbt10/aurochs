/**
 * @file Editor-specific types for DOCX Editor
 *
 * Re-exports shared types from office-editor-components
 * and defines DOCX-specific types.
 */

// =============================================================================
// DOCX-specific types
// =============================================================================

/**
 * Mixed value type for properties that may have multiple values across selection.
 */
export type MixedValue<T> = {
  readonly value: T | undefined;
  readonly isMixed: boolean;
};

/**
 * Create a single (non-mixed) value.
 */
export function singleValue<T>(value: T): MixedValue<T> {
  return { value, isMixed: false };
}

/**
 * Create a mixed value marker.
 */
export function mixedValue<T>(): MixedValue<T> {
  return { value: undefined, isMixed: true };
}

/**
 * Check if a value is mixed.
 */
export function isMixed<T>(mv: MixedValue<T>): boolean {
  return mv.isMixed;
}
