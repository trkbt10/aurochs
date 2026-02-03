/**
 * @file Text node type definitions
 */

import type { FigMatrix, FigPaint } from "@oxen/fig/types";

/**
 * Font name structure from .fig files
 */
export type FigFontName = {
  readonly family?: string;
  readonly style?: string;
  readonly postscript?: string;
};

/**
 * Value with units structure
 */
export type FigValueWithUnits = {
  readonly value: number;
  readonly units?: { value: number; name: string } | string;
};

/**
 * Text data structure from .fig files
 */
export type FigTextData = {
  readonly characters?: string;
  readonly lines?: readonly unknown[];
};

/**
 * Horizontal text alignment
 */
export type TextAlignHorizontal = "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";

/**
 * Vertical text alignment
 */
export type TextAlignVertical = "TOP" | "CENTER" | "BOTTOM";

/**
 * Text auto-resize mode
 *
 * - WIDTH_AND_HEIGHT: Text box expands to fit content (no wrapping)
 * - HEIGHT: Fixed width, height expands (wrapping enabled)
 * - NONE: Fixed width and height (wrapping enabled, may clip)
 * - TRUNCATE: Fixed width and height with truncation
 */
export type TextAutoResize = "WIDTH_AND_HEIGHT" | "HEIGHT" | "NONE" | "TRUNCATE";

/**
 * Text decoration
 */
export type TextDecoration = "NONE" | "UNDERLINE" | "STRIKETHROUGH";

/**
 * Size of text box
 */
export type TextBoxSize = {
  readonly width: number;
  readonly height: number;
};

/**
 * Extracted text properties from a Figma node
 */
export type ExtractedTextProps = {
  readonly transform: FigMatrix | undefined;
  readonly characters: string;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly fontWeight: number | undefined;
  readonly fontStyle: string | undefined;
  readonly letterSpacing: number | undefined;
  readonly lineHeight: number;
  readonly fillPaints: readonly FigPaint[] | undefined;
  readonly opacity: number;
  readonly textAlignHorizontal: TextAlignHorizontal;
  readonly textAlignVertical: TextAlignVertical;
  readonly textAutoResize: TextAutoResize;
  readonly textDecoration: TextDecoration;
  readonly size: TextBoxSize | undefined;
};

/**
 * Fill color and opacity result
 */
export type FillColorResult = {
  readonly color: string;
  readonly opacity: number;
};
