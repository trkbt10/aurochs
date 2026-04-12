/**
 * @file Text property extraction from Figma nodes
 */

import type { FigNode, FigPaint } from "@aurochs/fig/types";
import { extractBaseProps } from "../../svg/nodes/extract-props";
import type {
  ExtractedTextProps,
  FigFontName,
  FigTextData,
  FigValueWithUnits,
  TextAlignHorizontal,
  TextAlignVertical,
  TextAutoResize,
  TextDecoration,
} from "./types";
import { detectWeight, isItalic, FONT_WEIGHTS } from "../../font";

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
 * Get characters from node data
 *
 * Characters can be stored in either:
 * - node.characters (direct)
 * - node.textData.characters (nested)
 */
function getCharacters(nodeData: Record<string, unknown>): string | undefined {
  const characters = nodeData.characters as string | undefined;
  if (characters) {
    return characters;
  }
  const textData = nodeData.textData as FigTextData | undefined;
  return textData?.characters;
}

/**
 * Get enum name from Figma enum object
 *
 * Figma enums are stored as { value: number, name: string }
 */
function getEnumName<T extends string>(enumObj: unknown, defaultValue: T): T {
  if (enumObj && typeof enumObj === "object" && "name" in enumObj) {
    return (enumObj as { name: T }).name;
  }
  return defaultValue;
}

/**
 * Extract text properties from a Figma node
 *
 * Parses a TEXT node and extracts all relevant properties
 * for SVG rendering.
 *
 * @param node - Figma TEXT node
 * @returns Extracted text properties
 */
export function extractTextProps(node: FigNode): ExtractedTextProps {
  const { transform, opacity } = extractBaseProps(node);
  const nodeData = node as Record<string, unknown>;
  const characters = getCharacters(nodeData);

  // Font size - directly on node in .fig files
  const fontSize = (nodeData.fontSize as number) ?? 16;

  // Font name - has family/style in .fig files
  const fontName = nodeData.fontName as FigFontName | undefined;
  const fontFamily = fontName?.family ?? "sans-serif";
  const fontWeight = detectWeight(fontName?.style) ?? FONT_WEIGHTS.REGULAR;
  const fontStyle = isItalic(fontName?.style) ? "italic" : undefined;

  // Letter spacing
  const letterSpacing = getValueWithUnits(nodeData.letterSpacing, 0, fontSize);

  // Line height (default: 1.2x font size)
  const lineHeight = getValueWithUnits(nodeData.lineHeight, fontSize * 1.2, fontSize);

  // Text alignment
  const textAlignHorizontal = getEnumName<TextAlignHorizontal>(nodeData.textAlignHorizontal, "LEFT");
  const textAlignVertical = getEnumName<TextAlignVertical>(nodeData.textAlignVertical, "TOP");

  // Size of text box
  const sizeObj = nodeData.size as { x?: number; y?: number } | undefined;
  const size = sizeObj ? { width: sizeObj.x ?? 0, height: sizeObj.y ?? 0 } : undefined;

  // Text auto-resize mode
  const textAutoResize = getEnumName<TextAutoResize>(nodeData.textAutoResize, "WIDTH_AND_HEIGHT");

  // Text decoration (underline, strikethrough)
  const textDecoration = getEnumName<TextDecoration>(nodeData.textDecoration, "NONE");

  return {
    transform,
    characters: characters ?? "",
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    letterSpacing: letterSpacing !== 0 ? letterSpacing : undefined,
    lineHeight,
    fillPaints: nodeData.fillPaints as readonly FigPaint[] | undefined,
    opacity,
    textAlignHorizontal,
    textAlignVertical,
    textAutoResize,
    textDecoration,
    size,
  };
}
