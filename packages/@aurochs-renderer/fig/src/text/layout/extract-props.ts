/**
 * @file Text property extraction
 *
 * Extracts text rendering properties from either FigDesignNode (domain)
 * or FigNode (raw parser type). The structural input type `TextNodeInput`
 * is satisfied by both, allowing a single extraction function to serve
 * both the scene-graph path and Direct SVG path.
 */

import type { FigPaint, FigMatrix, FigVector } from "@aurochs/fig/types";
import type {
  ExtractedTextProps,
  FigFontName,
  FigValueWithUnits,
  TextAlignHorizontal,
  TextAlignVertical,
  TextAutoResize,
  TextDecoration,
} from "./types";
import { detectWeight, isItalic, FONT_WEIGHTS } from "../../font";

/**
 * Structured text data fields.
 *
 * These are the text-specific fields that FigDesignNode.textData provides
 * in a typed form. For FigNode, these fields exist directly on the node
 * with the same names (accessed via `_raw` fallback or index signature).
 */
type TextDataFields = {
  readonly characters?: string;
  readonly fontSize?: number;
  readonly fontName?: FigFontName;
  readonly letterSpacing?: unknown;
  readonly lineHeight?: unknown;
  readonly textAlignHorizontal?: unknown;
  readonly textAlignVertical?: unknown;
  readonly textAutoResize?: unknown;
  readonly textDecoration?: unknown;
};

export type TextNodeInput = {
  readonly transform?: FigMatrix;
  readonly opacity?: number;
  readonly size?: FigVector;
  /** Structured text data (FigDesignNode.textData or compatible) */
  readonly textData?: TextDataFields;
  /** Raw parser data for fallback field access (FigDesignNode._raw) */
  readonly _raw?: Record<string, unknown>;
  /** Domain fill paints (FigDesignNode.fills) */
  readonly fills?: readonly FigPaint[];
  /** Raw parser fill paints (FigNode.fillPaints) */
  readonly fillPaints?: readonly FigPaint[];
  /** Index signature for FigNode compatibility (additional Kiwi fields) */
  readonly [key: string]: unknown;
};

/**
 * Get numeric value from value-with-units structure
 *
 * Handles both direct number values and Figma's value-with-units format
 * which specifies values in different units (PIXELS, PERCENT, etc.)
 *
 * @param val - Raw value (number or value-with-units object)
 * @param defaultValue - Default if value is undefined
 * @param fontSize - Font size for percent calculations
 * @returns Resolved numeric value
 */
export function getValueWithUnits(val: unknown, defaultValue: number, fontSize?: number): number {
  if (typeof val === "number") {
    return val;
  }
  if (val && typeof val === "object" && "value" in val) {
    const vwu = val as FigValueWithUnits;
    const units = vwu.units;
    const unitsName = typeof units === "string" ? units : units?.name;

    if (unitsName === "PERCENT" && fontSize) {
      return (vwu.value / 100) * fontSize;
    }
    // RAW = unitless em-relative multiplier (e.g., lineHeight 1.4 = 1.4 × fontSize)
    if (unitsName === "RAW" && fontSize) {
      return vwu.value * fontSize;
    }
    return vwu.value;
  }
  return defaultValue;
}

/**
 * Get enum name from Figma enum object (KiwiEnumValue)
 */
function getEnumName<T extends string>(enumObj: unknown, defaultValue: T): T {
  if (enumObj && typeof enumObj === "object" && "name" in enumObj) {
    return (enumObj as { name: T }).name;
  }
  return defaultValue;
}

/**
 * Extract text properties from a FigDesignNode or FigNode.
 *
 * For FigDesignNode: reads typed `textData` field, falls back to `_raw`.
 * For FigNode: `textData`/`_raw` are undefined, so all fields fall through
 * to direct property access via the index signature.
 *
 * @param node - FigDesignNode or FigNode (structural match via TextNodeInput)
 * @returns Extracted text properties
 */
export function extractTextProps(node: TextNodeInput): ExtractedTextProps {
  const transform = node.transform;
  const opacity = node.opacity ?? 1;
  const td = node.textData;
  // For FigDesignNode, _raw holds the raw parser fields.
  // For FigNode, _raw is undefined so `raw?.xxx` falls through,
  // and the index signature on TextNodeInput allows direct access as fallback.
  const raw = node._raw ?? node as Record<string, unknown>;

  // Characters: prefer textData, fall back to _raw.characters (legacy .fig format)
  const characters =
    td?.characters ??
    (raw?.characters as string | undefined) ??
    "";

  // Font size
  const fontSize =
    td?.fontSize ??
    (raw?.fontSize as number | undefined) ??
    16;

  // Font name
  const fontName = td?.fontName ?? (raw?.fontName as FigFontName | undefined);
  const fontFamily = fontName?.family ?? "sans-serif";
  const fontWeight = detectWeight(fontName?.style) ?? FONT_WEIGHTS.REGULAR;
  const fontStyle = isItalic(fontName?.style) ? "italic" : undefined;

  // Letter spacing
  const letterSpacingRaw = td?.letterSpacing ?? raw?.letterSpacing;
  const letterSpacing = getValueWithUnits(letterSpacingRaw, 0, fontSize);

  // Line height (default: 1.2x font size)
  const lineHeightRaw = td?.lineHeight ?? raw?.lineHeight;
  const lineHeight = getValueWithUnits(lineHeightRaw, fontSize * 1.2, fontSize);

  // Text alignment
  const textAlignHorizontal = getEnumName<TextAlignHorizontal>(
    td?.textAlignHorizontal ?? raw?.textAlignHorizontal,
    "LEFT",
  );
  const textAlignVertical = getEnumName<TextAlignVertical>(
    td?.textAlignVertical ?? raw?.textAlignVertical,
    "TOP",
  );

  // Size of text box
  const size = node.size ? { width: node.size.x ?? 0, height: node.size.y ?? 0 } : undefined;

  // Text auto-resize mode
  const textAutoResize = getEnumName<TextAutoResize>(
    td?.textAutoResize ?? raw?.textAutoResize,
    "WIDTH_AND_HEIGHT",
  );

  // Text decoration (underline, strikethrough)
  const textDecoration = getEnumName<TextDecoration>(
    td?.textDecoration ?? raw?.textDecoration,
    "NONE",
  );

  return {
    transform,
    characters,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    letterSpacing: letterSpacing !== 0 ? letterSpacing : undefined,
    lineHeight,
    fillPaints: node.fills ?? node.fillPaints,
    opacity,
    textAlignHorizontal,
    textAlignVertical,
    textAutoResize,
    textDecoration,
    size,
  };
}
