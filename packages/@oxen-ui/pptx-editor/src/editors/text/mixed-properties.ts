/**
 * @file Mixed property types for text editing with multi-selection support
 *
 * Provides types and utilities for handling "Mixed" state when text properties
 * differ across a selection (similar to Adobe Photoshop behavior).
 */

import type {
  RunProperties,
  ParagraphProperties,
  TextAlign,
  TextCaps,
  UnderlineStyle,
  StrikeStyle,
  LineSpacing,
  BulletStyle,
  TextTypeface,
} from "@oxen/pptx/domain/text";
import type { Color } from "@oxen/ooxml/domain/color";
import type { Fill, Line } from "@oxen/pptx/domain/color/types";
import type { Pixels, Points, Percent } from "@oxen/ooxml/domain/units";

// =============================================================================
// Property Extraction Types
// =============================================================================

/**
 * Result of extracting a property from multiple sources.
 * - "same": All sources have the same value
 * - "mixed": Sources have different values
 * - "notApplicable": No sources have this property defined
 */
export type PropertyExtraction<T> =
  | { readonly type: "same"; readonly value: T }
  | { readonly type: "mixed" }
  | { readonly type: "notApplicable" };

// =============================================================================
// Mixed Run Properties
// =============================================================================

/**
 * Run properties with Mixed support for multi-run selection.
 * Each field uses PropertyExtraction to indicate same/mixed/notApplicable state.
 */
export type MixedRunProperties = {
  // Font properties
  readonly fontSize: PropertyExtraction<Points>;
  readonly fontFamily: PropertyExtraction<TextTypeface>;
  readonly fontFamilyEastAsian: PropertyExtraction<TextTypeface>;
  readonly fontFamilyComplexScript: PropertyExtraction<TextTypeface>;
  readonly fontFamilySymbol: PropertyExtraction<TextTypeface>;

  // Style properties
  readonly bold: PropertyExtraction<boolean>;
  readonly italic: PropertyExtraction<boolean>;
  readonly underline: PropertyExtraction<UnderlineStyle>;
  readonly underlineColor: PropertyExtraction<Color>;
  readonly strike: PropertyExtraction<StrikeStyle>;
  readonly caps: PropertyExtraction<TextCaps>;
  readonly baseline: PropertyExtraction<number>;

  // Spacing properties
  readonly spacing: PropertyExtraction<Pixels>;
  readonly kerning: PropertyExtraction<Points>;

  // Color properties
  readonly color: PropertyExtraction<Color>;
  readonly fill: PropertyExtraction<Fill>;
  readonly highlightColor: PropertyExtraction<Color>;

  // Outline properties
  readonly textOutline: PropertyExtraction<Line>;
  readonly outline: PropertyExtraction<boolean>;
  readonly shadow: PropertyExtraction<boolean>;
  readonly emboss: PropertyExtraction<boolean>;

  // Language properties
  readonly language: PropertyExtraction<string>;
  readonly rtl: PropertyExtraction<boolean>;
};

// =============================================================================
// Mixed Paragraph Properties
// =============================================================================

/**
 * Paragraph properties with Mixed support for multi-paragraph selection.
 */
export type MixedParagraphProperties = {
  // Layout properties
  readonly level: PropertyExtraction<number>;
  readonly alignment: PropertyExtraction<TextAlign>;

  // Indentation properties
  readonly marginLeft: PropertyExtraction<Pixels>;
  readonly marginRight: PropertyExtraction<Pixels>;
  readonly indent: PropertyExtraction<Pixels>;
  readonly defaultTabSize: PropertyExtraction<Pixels>;

  // Spacing properties
  readonly lineSpacing: PropertyExtraction<LineSpacing>;
  readonly spaceBefore: PropertyExtraction<LineSpacing>;
  readonly spaceAfter: PropertyExtraction<LineSpacing>;

  // Bullet properties
  readonly bulletStyle: PropertyExtraction<BulletStyle>;

  // Direction properties
  readonly rtl: PropertyExtraction<boolean>;
  readonly fontAlignment: PropertyExtraction<"auto" | "top" | "center" | "base" | "bottom">;

  // Line break properties
  readonly eaLineBreak: PropertyExtraction<boolean>;
  readonly latinLineBreak: PropertyExtraction<boolean>;
  readonly hangingPunctuation: PropertyExtraction<boolean>;
};

// =============================================================================
// Extraction Utilities
// =============================================================================

/**
 * Deep equality check for property values.
 * Handles objects, arrays, and primitives.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  if (typeof a !== "object" || typeof b !== "object") {
    return false;
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // Handle objects
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }

  return keysA.every((key) => {
    const valA = (a as Record<string, unknown>)[key];
    const valB = (b as Record<string, unknown>)[key];
    return deepEqual(valA, valB);
  });
}

/**
 * Extract common value from an array of optional values.
 *
 * @param values - Array of values (may include undefined)
 * @returns PropertyExtraction indicating same/mixed/notApplicable
 */
export function extractCommonProperty<T>(
  values: readonly (T | undefined)[]
): PropertyExtraction<T> {
  // Filter out undefined values
  const definedValues = values.filter((v): v is T => v !== undefined);

  // No values defined
  if (definedValues.length === 0) {
    return { type: "notApplicable" };
  }

  // Check if all defined values are equal
  const first = definedValues[0];
  const allSame = definedValues.every((v) => deepEqual(v, first));

  if (allSame) {
    return { type: "same", value: first };
  }

  return { type: "mixed" };
}

/**
 * Extract MixedRunProperties from an array of RunProperties.
 *
 * @param runProperties - Array of run properties to analyze
 * @returns MixedRunProperties with extraction results for each field
 */
export function extractMixedRunProperties(
  runProperties: readonly (RunProperties | undefined)[]
): MixedRunProperties {
  return {
    // Font properties
    fontSize: extractCommonProperty(runProperties.map((p) => p?.fontSize)),
    fontFamily: extractCommonProperty(runProperties.map((p) => p?.fontFamily)),
    fontFamilyEastAsian: extractCommonProperty(runProperties.map((p) => p?.fontFamilyEastAsian)),
    fontFamilyComplexScript: extractCommonProperty(runProperties.map((p) => p?.fontFamilyComplexScript)),
    fontFamilySymbol: extractCommonProperty(runProperties.map((p) => p?.fontFamilySymbol)),

    // Style properties
    bold: extractCommonProperty(runProperties.map((p) => p?.bold)),
    italic: extractCommonProperty(runProperties.map((p) => p?.italic)),
    underline: extractCommonProperty(runProperties.map((p) => p?.underline)),
    underlineColor: extractCommonProperty(runProperties.map((p) => p?.underlineColor)),
    strike: extractCommonProperty(runProperties.map((p) => p?.strike)),
    caps: extractCommonProperty(runProperties.map((p) => p?.caps)),
    baseline: extractCommonProperty(runProperties.map((p) => p?.baseline)),

    // Spacing properties
    spacing: extractCommonProperty(runProperties.map((p) => p?.spacing)),
    kerning: extractCommonProperty(runProperties.map((p) => p?.kerning)),

    // Color properties
    color: extractCommonProperty(runProperties.map((p) => p?.color)),
    fill: extractCommonProperty(runProperties.map((p) => p?.fill)),
    highlightColor: extractCommonProperty(runProperties.map((p) => p?.highlightColor)),

    // Outline properties
    textOutline: extractCommonProperty(runProperties.map((p) => p?.textOutline)),
    outline: extractCommonProperty(runProperties.map((p) => p?.outline)),
    shadow: extractCommonProperty(runProperties.map((p) => p?.shadow)),
    emboss: extractCommonProperty(runProperties.map((p) => p?.emboss)),

    // Language properties
    language: extractCommonProperty(runProperties.map((p) => p?.language)),
    rtl: extractCommonProperty(runProperties.map((p) => p?.rtl)),
  };
}

/**
 * Extract MixedParagraphProperties from an array of ParagraphProperties.
 *
 * @param paragraphProperties - Array of paragraph properties to analyze
 * @returns MixedParagraphProperties with extraction results for each field
 */
export function extractMixedParagraphProperties(
  paragraphProperties: readonly (ParagraphProperties | undefined)[]
): MixedParagraphProperties {
  return {
    // Layout properties
    level: extractCommonProperty(paragraphProperties.map((p) => p?.level)),
    alignment: extractCommonProperty(paragraphProperties.map((p) => p?.alignment)),

    // Indentation properties
    marginLeft: extractCommonProperty(paragraphProperties.map((p) => p?.marginLeft)),
    marginRight: extractCommonProperty(paragraphProperties.map((p) => p?.marginRight)),
    indent: extractCommonProperty(paragraphProperties.map((p) => p?.indent)),
    defaultTabSize: extractCommonProperty(paragraphProperties.map((p) => p?.defaultTabSize)),

    // Spacing properties
    lineSpacing: extractCommonProperty(paragraphProperties.map((p) => p?.lineSpacing)),
    spaceBefore: extractCommonProperty(paragraphProperties.map((p) => p?.spaceBefore)),
    spaceAfter: extractCommonProperty(paragraphProperties.map((p) => p?.spaceAfter)),

    // Bullet properties
    bulletStyle: extractCommonProperty(paragraphProperties.map((p) => p?.bulletStyle)),

    // Direction properties
    rtl: extractCommonProperty(paragraphProperties.map((p) => p?.rtl)),
    fontAlignment: extractCommonProperty(paragraphProperties.map((p) => p?.fontAlignment)),

    // Line break properties
    eaLineBreak: extractCommonProperty(paragraphProperties.map((p) => p?.eaLineBreak)),
    latinLineBreak: extractCommonProperty(paragraphProperties.map((p) => p?.latinLineBreak)),
    hangingPunctuation: extractCommonProperty(paragraphProperties.map((p) => p?.hangingPunctuation)),
  };
}

// =============================================================================
// Value Extraction Helpers
// =============================================================================

/**
 * Get the value from a PropertyExtraction, or undefined if mixed/notApplicable.
 * Useful for UI components that need a concrete value or placeholder.
 */
export function getExtractionValue<T>(extraction: PropertyExtraction<T>): T | undefined {
  if (extraction.type === "same") {
    return extraction.value;
  }
  return undefined;
}

/**
 * Check if a PropertyExtraction is mixed.
 */
export function isMixed(extraction: PropertyExtraction<unknown>): boolean {
  return extraction.type === "mixed";
}

/**
 * Check if a PropertyExtraction has a value (same).
 */
export function hasValue(extraction: PropertyExtraction<unknown>): boolean {
  return extraction.type === "same";
}

/**
 * Check if a PropertyExtraction is not applicable.
 */
export function isNotApplicable(extraction: PropertyExtraction<unknown>): boolean {
  return extraction.type === "notApplicable";
}

// =============================================================================
// Property Merging
// =============================================================================

/**
 * Merge a partial RunProperties update into existing properties.
 * Handles undefined removal for toggle-off scenarios.
 */
export function mergeRunProperties(
  existing: RunProperties | undefined,
  update: Partial<RunProperties>
): RunProperties {
  const base = existing ?? {};
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(update)) {
    if (value === undefined) {
      // Remove property when explicitly set to undefined
      delete result[key];
    } else {
      // Apply new value
      result[key] = value;
    }
  }

  return result as RunProperties;
}

/**
 * Merge a partial ParagraphProperties update into existing properties.
 */
export function mergeParagraphProperties(
  existing: ParagraphProperties | undefined,
  update: Partial<ParagraphProperties>
): ParagraphProperties {
  const base = existing ?? {};
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(update)) {
    if (value === undefined) {
      delete result[key];
    } else {
      result[key] = value;
    }
  }

  return result as ParagraphProperties;
}

/**
 * Check if two RunProperties are equal.
 */
export function areRunPropertiesEqual(
  a: RunProperties | undefined,
  b: RunProperties | undefined
): boolean {
  return deepEqual(a, b);
}
