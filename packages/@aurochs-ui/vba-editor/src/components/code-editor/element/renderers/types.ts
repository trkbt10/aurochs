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

// =============================================================================
// Highlight Types
// =============================================================================

/**
 * Highlight type for different visual treatments.
 */
export type HighlightType = "selection" | "match" | "currentMatch";

/**
 * Highlight range within code.
 * All positions are 1-based (line and column).
 */
export type HighlightRange = {
  /** Start line (1-based) */
  readonly startLine: number;
  /** Start column (1-based) */
  readonly startColumn: number;
  /** End line (1-based) */
  readonly endLine: number;
  /** End column (1-based) */
  readonly endColumn: number;
  /** Highlight type */
  readonly type: HighlightType;
};

/**
 * Cursor state for rendering.
 */
export type CursorState = {
  /** Cursor line (1-based) */
  readonly line: number;
  /** Cursor column (1-based) */
  readonly column: number;
  /** Whether cursor is visible (not hidden by selection) */
  readonly visible: boolean;
  /** Whether cursor should blink */
  readonly blinking: boolean;
};

// =============================================================================
// Renderer Props
// =============================================================================

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
  /** Function to measure text width (for variable-width character support) */
  readonly measureText?: (text: string) => number;

  // === Unified rendering props ===

  /** Show line numbers */
  readonly showLineNumbers?: boolean;
  /** Line number gutter width in pixels */
  readonly lineNumberWidth?: number;
  /** Highlight ranges (selection, search matches) */
  readonly highlights?: readonly HighlightRange[];
  /** Cursor state */
  readonly cursor?: CursorState;
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

