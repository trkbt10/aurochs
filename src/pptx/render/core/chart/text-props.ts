/**
 * @file Chart text properties utilities
 *
 * Type-safe extraction of text properties from c:txPr following ECMA-376.
 *
 * ECMA-376 Text Property Resolution Order:
 * 1. a:defRPr (default run properties) on a:pPr
 * 2. First a:r run properties (if no defRPr)
 * 3. Implementation default
 *
 * @see ECMA-376 Part 1, Section 21.2.2.217 (txPr)
 * @see ECMA-376 Part 1, Section 21.1.2.2.7 (a:pPr)
 * @see ECMA-376 Part 1, Section 21.1.2.3.2 (a:defRPr)
 */

import type { TextBody, RunProperties, Paragraph } from "../../../domain/text";
import type { Points } from "../../../domain/types";
import { pt } from "../../../domain/types";

// =============================================================================
// ECMA-376 Default Values
// =============================================================================

/**
 * Default font size for chart elements (in pt) when not specified
 *
 * Per ECMA-376, the default font size is implementation-defined.
 * We use 9pt as a reasonable default for chart labels.
 */
export const DEFAULT_CHART_FONT_SIZE: Points = pt(9);

/**
 * Default font family when not specified
 */
export const DEFAULT_CHART_FONT_FAMILY = "Calibri";

// =============================================================================
// Type Guards for ECMA-376 Structure
// =============================================================================

/**
 * Check if TextBody has valid paragraph structure for text property extraction
 *
 * @see ECMA-376 Part 1, Section 21.2.2.217 (txPr) - requires at least one a:p
 */
function hasValidParagraph(textBody: TextBody): textBody is TextBody & {
  readonly paragraphs: readonly [Paragraph, ...Paragraph[]];
} {
  return textBody.paragraphs.length > 0;
}

/**
 * Get the first paragraph from TextBody (guaranteed to exist after guard)
 */
function getFirstParagraph(textBody: TextBody): Paragraph | undefined {
  return textBody.paragraphs[0];
}

// =============================================================================
// Run Properties Resolution
// =============================================================================

/**
 * Resolved text style properties
 *
 * Contains all resolved text styling properties from ECMA-376 c:txPr
 */
export type ResolvedTextStyle = {
  readonly fontSize: Points;
  readonly fontFamily: string;
  readonly bold: boolean;
  readonly italic: boolean;
};

/**
 * Get default run properties from paragraph
 *
 * Per ECMA-376, a:defRPr on a:pPr defines default styling for all runs
 * in the paragraph.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.2 (a:defRPr)
 */
function getDefaultRunProperties(paragraph: Paragraph): RunProperties | undefined {
  return paragraph.properties.defaultRunProperties;
}

/**
 * Get first run properties from paragraph
 *
 * Fallback when a:defRPr is not specified.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.8 (a:r)
 */
function getFirstRunProperties(paragraph: Paragraph): RunProperties | undefined {
  const firstRun = paragraph.runs[0];
  if (!firstRun) {return undefined;}

  // TextRun has properties field (RegularRun, LineBreakRun, FieldRun all have it)
  return firstRun.properties;
}

// =============================================================================
// Text Property Extraction (ECMA-376 Compliant)
// =============================================================================

/**
 * Extract font size from TextBody following ECMA-376 resolution order
 *
 * Resolution order:
 * 1. a:pPr/a:defRPr/@sz (default run properties)
 * 2. a:r/a:rPr/@sz (first run properties)
 * 3. DEFAULT_CHART_FONT_SIZE
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:rPr sz attribute)
 * @see ECMA-376 Part 1, Section 20.1.10.72 (ST_TextFontSize - in 1/100 pt)
 */
export function extractFontSize(textProperties: TextBody | undefined): Points {
  if (!textProperties || !hasValidParagraph(textProperties)) {
    return DEFAULT_CHART_FONT_SIZE;
  }

  const paragraph = getFirstParagraph(textProperties);
  if (!paragraph) {return DEFAULT_CHART_FONT_SIZE;}

  // Priority 1: defRPr (default run properties)
  const defRPr = getDefaultRunProperties(paragraph);
  if (defRPr?.fontSize !== undefined) {
    return defRPr.fontSize;
  }

  // Priority 2: First run properties
  const firstRunProps = getFirstRunProperties(paragraph);
  if (firstRunProps?.fontSize !== undefined) {
    return firstRunProps.fontSize;
  }

  // Priority 3: Default
  return DEFAULT_CHART_FONT_SIZE;
}

/**
 * Extract bold flag from TextBody following ECMA-376 resolution order
 *
 * Resolution order:
 * 1. a:pPr/a:defRPr/@b (default run properties)
 * 2. a:r/a:rPr/@b (first run properties)
 * 3. false (ECMA-376 default)
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:rPr b attribute)
 */
export function extractBold(textProperties: TextBody | undefined): boolean {
  if (!textProperties || !hasValidParagraph(textProperties)) {
    return false;
  }

  const paragraph = getFirstParagraph(textProperties);
  if (!paragraph) {return false;}

  // Priority 1: defRPr
  const defRPr = getDefaultRunProperties(paragraph);
  if (defRPr?.bold !== undefined) {
    return defRPr.bold;
  }

  // Priority 2: First run properties
  const firstRunProps = getFirstRunProperties(paragraph);
  if (firstRunProps?.bold !== undefined) {
    return firstRunProps.bold;
  }

  // Priority 3: Default (false per ECMA-376)
  return false;
}

/**
 * Extract italic flag from TextBody following ECMA-376 resolution order
 *
 * Resolution order:
 * 1. a:pPr/a:defRPr/@i (default run properties)
 * 2. a:r/a:rPr/@i (first run properties)
 * 3. false (ECMA-376 default)
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:rPr i attribute)
 */
export function extractItalic(textProperties: TextBody | undefined): boolean {
  if (!textProperties || !hasValidParagraph(textProperties)) {
    return false;
  }

  const paragraph = getFirstParagraph(textProperties);
  if (!paragraph) {return false;}

  // Priority 1: defRPr
  const defRPr = getDefaultRunProperties(paragraph);
  if (defRPr?.italic !== undefined) {
    return defRPr.italic;
  }

  // Priority 2: First run properties
  const firstRunProps = getFirstRunProperties(paragraph);
  if (firstRunProps?.italic !== undefined) {
    return firstRunProps.italic;
  }

  // Priority 3: Default (false per ECMA-376)
  return false;
}

/**
 * Extract font family from TextBody following ECMA-376 resolution order
 *
 * Resolution order:
 * 1. a:pPr/a:defRPr/a:latin/@typeface
 * 2. a:r/a:rPr/a:latin/@typeface
 * 3. DEFAULT_CHART_FONT_FAMILY
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.7 (a:latin)
 */
export function extractFontFamily(textProperties: TextBody | undefined): string {
  if (!textProperties || !hasValidParagraph(textProperties)) {
    return DEFAULT_CHART_FONT_FAMILY;
  }

  const paragraph = getFirstParagraph(textProperties);
  if (!paragraph) {return DEFAULT_CHART_FONT_FAMILY;}

  // Priority 1: defRPr
  const defRPr = getDefaultRunProperties(paragraph);
  if (defRPr?.fontFamily) {
    return defRPr.fontFamily;
  }

  // Priority 2: First run properties
  const firstRunProps = getFirstRunProperties(paragraph);
  if (firstRunProps?.fontFamily) {
    return firstRunProps.fontFamily;
  }

  // Priority 3: Default
  return DEFAULT_CHART_FONT_FAMILY;
}

/**
 * Resolve all text style properties from TextBody
 *
 * Convenience function that extracts all common text styling properties
 * following ECMA-376 resolution order.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.217 (txPr)
 */
export function resolveTextStyle(textProperties: TextBody | undefined): ResolvedTextStyle {
  return {
    fontSize: extractFontSize(textProperties),
    fontFamily: extractFontFamily(textProperties),
    bold: extractBold(textProperties),
    italic: extractItalic(textProperties),
  };
}

// =============================================================================
// SVG Style Generation
// =============================================================================

/**
 * Generate SVG text style attributes from resolved text style
 *
 * Returns SVG attribute string for text elements.
 */
export function toSvgTextAttributes(style: ResolvedTextStyle): string {
  const parts: string[] = [];

  parts.push(`font-size="${style.fontSize}"`);
  parts.push(`font-family="${style.fontFamily}"`);

  if (style.bold) {
    parts.push('font-weight="bold"');
  }

  if (style.italic) {
    parts.push('font-style="italic"');
  }

  return parts.join(" ");
}
