/**
 * @file Common measurement types for OOXML processing (PPTX/XLSX)
 *
 * These types represent ECMA-376 concepts in a renderer-agnostic way.
 * All measurements are converted to CSS-friendly units (px, degrees).
 *
 * Uses branded types for type safety - prevents mixing Pixels with Degrees, etc.
 *
 * @see ECMA-376 Part 1, DrawingML
 */

// =============================================================================
// Branded Type Utilities
// =============================================================================

/**
 * Brand a primitive type to create a nominal type.
 * This prevents accidental mixing of semantically different values.
 *
 * @example
 * type Pixels = Brand<number, 'Pixels'>;
 * type Degrees = Brand<number, 'Degrees'>;
 * const px: Pixels = 100 as Pixels;
 * const deg: Degrees = 45 as Degrees;
 * // px = deg; // Error: Type 'Degrees' is not assignable to type 'Pixels'
 */
declare const __brand: unique symbol;

/**
 * Brand a primitive type to create a nominal type.
 * Exported for use in other domain type definitions.
 */
export type Brand<K, T> = K & { readonly [__brand]: T };

// =============================================================================
// Measurement Types (Branded)
// =============================================================================

/**
 * Length in pixels (branded)
 * Original EMU values are converted during parsing
 *
 * @example
 * const width = parseEmu("914400") as Pixels; // 1 inch = 96px
 */
export type Pixels = Brand<number, 'Pixels'>;

/**
 * Angle in degrees 0-360 (branded)
 * Original 60000ths values are converted during parsing
 *
 * ECMA-376 Angle Units:
 * - 60000 units = 1 degree (5400000 = 90 degrees)
 *
 * @example
 * const rotation = parseAngle("5400000") as Degrees; // 90 degrees
 */
export type Degrees = Brand<number, 'Degrees'>;

/**
 * Percentage 0-100 (branded)
 * Original 1000ths or 100000ths values are converted during parsing
 *
 * ECMA-376 Percentage Units:
 * - 1000 units = 1% (1000ths notation)
 * - 100000 units = 100% (100000ths notation)
 *
 * @example
 * const opacity = parsePercentage100k("50000") as Percent; // 50%
 */
export type Percent = Brand<number, 'Percent'>;

/**
 * Points for font sizes (branded)
 * Original 100ths values are converted during parsing
 *
 * ECMA-376 Points:
 * - 100 units = 1 point (1800 = 18pt)
 *
 * @example
 * const fontSize = parseFontSize("1800") as Points; // 18pt
 */
export type Points = Brand<number, 'Points'>;

// =============================================================================
// OOXML Base Types (Branded)
// =============================================================================

/**
 * EMU (English Metric Units) - the base unit in Office Open XML
 * 914400 EMU = 1 inch = 96 CSS pixels
 *
 * @see ECMA-376 Part 1, Section 20.1.10.16 (ST_Coordinate)
 */
export type EMU = Brand<number, 'EMU'>;

// =============================================================================
// Branded Type Constructors
// =============================================================================

/**
 * Create a Pixels value from a number.
 * Use this instead of `as Pixels` for runtime conversion.
 */
export const px = (value: number): Pixels => value as Pixels;

/**
 * Create a Degrees value from a number.
 */
export const deg = (value: number): Degrees => value as Degrees;

/**
 * Create a Percent value from a number.
 */
export const pct = (value: number): Percent => value as Percent;

/**
 * Create a Points value from a number.
 */
export const pt = (value: number): Points => value as Points;

/**
 * Create an EMU value from a number.
 */
export const emu = (value: number): EMU => value as EMU;
