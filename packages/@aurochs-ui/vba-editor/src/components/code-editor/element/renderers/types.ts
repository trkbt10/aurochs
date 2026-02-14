/**
 * @file Code Renderer Types
 *
 * Shared types and interfaces for code rendering across HTML, SVG, and Canvas.
 */

import type { ReactNode } from "react";
import type { Token } from "../../code/syntax-highlight";
import type { LineTokenCache } from "../../line/use-line-token-cache";

// =============================================================================
// Renderer Types
// =============================================================================

/**
 * Available renderer types.
 */
export type RendererType = "html" | "svg" | "canvas";

/**
 * Common props for all code renderers.
 */
export type CodeRendererProps = {
  /** All lines of code */
  readonly lines: readonly string[];
  /** Range of lines to render (0-based, end is exclusive) */
  readonly visibleRange: { readonly start: number; readonly end: number };
  /** Height of spacer above visible lines */
  readonly topSpacerHeight: number;
  /** Height of spacer below visible lines */
  readonly bottomSpacerHeight: number;
  /** Token cache for efficient tokenization */
  readonly tokenCache: LineTokenCache;
  /** Line height in pixels */
  readonly lineHeight: number;
  /** Padding in pixels */
  readonly padding: number;
  /** Container width (for canvas/svg sizing) */
  readonly width?: number;
  /** Container height (for canvas/svg sizing) */
  readonly height?: number;
};

/**
 * Code renderer component type.
 */
export type CodeRendererComponent = (props: CodeRendererProps) => ReactNode;

// =============================================================================
// Token Color Types
// =============================================================================

/**
 * RGB color tuple.
 */
export type RgbColor = readonly [r: number, g: number, b: number];

/**
 * Token color map for non-CSS contexts (Canvas, SVG).
 */
export type TokenColorMap = {
  readonly [K in Token["type"]]: RgbColor;
};

// =============================================================================
// Cursor and Selection Types
// =============================================================================

/**
 * Cursor position for rendering.
 */
export type CursorRenderInfo = {
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly visible: boolean;
};

/**
 * Selection rectangle for rendering.
 */
export type SelectionRenderRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

