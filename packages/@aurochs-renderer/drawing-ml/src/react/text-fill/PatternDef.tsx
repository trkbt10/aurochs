/**
 * @file Text pattern fill SVG definition
 *
 * Creates SVG pattern for text pattern fill.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.47 (a:pattFill)
 */

import type { ReactNode } from "react";
import type { TextPatternFillConfig } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Pattern geometry configuration
 */
type PatternGeometry = {
  readonly size: number;
  readonly render: (fgColor: string, size: number) => ReactNode;
};

// =============================================================================
// Pattern Renderers
// =============================================================================

/**
 * Render horizontal line pattern
 */
function renderHorizontalLine(strokeWidth: number): PatternGeometry["render"] {
  return (fgColor, size) => (
    <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke={fgColor} strokeWidth={strokeWidth} />
  );
}

/**
 * Render vertical line pattern
 */
function renderVerticalLine(strokeWidth: number): PatternGeometry["render"] {
  return (fgColor, size) => (
    <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke={fgColor} strokeWidth={strokeWidth} />
  );
}

/**
 * Render grid pattern
 */
function renderGrid(): PatternGeometry["render"] {
  return (fgColor, size) => (
    <>
      <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke={fgColor} strokeWidth={0.5} />
      <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke={fgColor} strokeWidth={0.5} />
    </>
  );
}

/**
 * Render diagonal up line pattern
 */
function renderDiagonalUp(strokeWidth: number): PatternGeometry["render"] {
  return (fgColor, size) => (
    <line x1={0} y1={size} x2={size} y2={0} stroke={fgColor} strokeWidth={strokeWidth} />
  );
}

/**
 * Render diagonal down line pattern
 */
function renderDiagonalDown(strokeWidth: number): PatternGeometry["render"] {
  return (fgColor, size) => (
    <line x1={0} y1={0} x2={size} y2={size} stroke={fgColor} strokeWidth={strokeWidth} />
  );
}

/**
 * Render diagonal cross pattern
 */
function renderDiagonalCross(): PatternGeometry["render"] {
  return (fgColor, size) => (
    <>
      <line x1={0} y1={0} x2={size} y2={size} stroke={fgColor} strokeWidth={0.5} />
      <line x1={0} y1={size} x2={size} y2={0} stroke={fgColor} strokeWidth={0.5} />
    </>
  );
}

/**
 * Render dot pattern
 */
function renderDot(radius: number): PatternGeometry["render"] {
  return (fgColor, size) => (
    <circle cx={size / 2} cy={size / 2} r={radius} fill={fgColor} />
  );
}

/**
 * Render checkerboard pattern
 */
function renderCheck(): PatternGeometry["render"] {
  return (fgColor, size) => {
    const half = size / 2;
    return (
      <>
        <rect x={0} y={0} width={half} height={half} fill={fgColor} />
        <rect x={half} y={half} width={half} height={half} fill={fgColor} />
      </>
    );
  };
}

/**
 * Render solid fill (fallback)
 */
function renderSolid(): PatternGeometry["render"] {
  return (fgColor, size) => (
    <rect width={size} height={size} fill={fgColor} />
  );
}

// =============================================================================
// Pattern Lookup
// =============================================================================

/**
 * Pattern geometry lookup by preset name.
 *
 * Uses handler pattern (Rule 1.1) for O(1) lookup.
 */
const PATTERN_HANDLERS: Record<string, PatternGeometry> = {
  // Horizontal patterns
  horz: { size: 8, render: renderHorizontalLine(1) },
  ltHorz: { size: 8, render: renderHorizontalLine(0.5) },
  dkHorz: { size: 8, render: renderHorizontalLine(2) },
  narHorz: { size: 4, render: renderHorizontalLine(0.5) },

  // Vertical patterns
  vert: { size: 8, render: renderVerticalLine(1) },
  ltVert: { size: 8, render: renderVerticalLine(0.5) },
  dkVert: { size: 8, render: renderVerticalLine(2) },
  narVert: { size: 4, render: renderVerticalLine(0.5) },

  // Grid patterns
  smGrid: { size: 4, render: renderGrid() },
  lgGrid: { size: 8, render: renderGrid() },
  cross: { size: 8, render: renderGrid() },
  dotGrid: { size: 8, render: renderDot(1) },

  // Diagonal up patterns
  upDiag: { size: 6, render: renderDiagonalUp(1) },
  ltUpDiag: { size: 6, render: renderDiagonalUp(0.5) },
  dkUpDiag: { size: 6, render: renderDiagonalUp(2) },
  wdUpDiag: { size: 8, render: renderDiagonalUp(3) },

  // Diagonal down patterns
  dnDiag: { size: 6, render: renderDiagonalDown(1) },
  ltDnDiag: { size: 6, render: renderDiagonalDown(0.5) },
  dkDnDiag: { size: 6, render: renderDiagonalDown(2) },
  wdDnDiag: { size: 8, render: renderDiagonalDown(3) },

  // Diagonal cross
  diagCross: { size: 8, render: renderDiagonalCross() },

  // Check patterns
  smCheck: { size: 4, render: renderCheck() },
  lgCheck: { size: 8, render: renderCheck() },
};

/**
 * Get pattern size based on preset type.
 *
 * @param preset - Pattern preset name
 * @returns Pattern tile size in pixels
 */
export function getTextPatternSize(preset: string): number {
  const handler = PATTERN_HANDLERS[preset];
  if (handler) {
    return handler.size;
  }

  // Percentage patterns use smaller tiles
  if (preset.startsWith("pct")) {
    return 4;
  }

  // Default size
  return 8;
}

/**
 * Render pattern content based on preset type.
 *
 * @param preset - Pattern preset name
 * @param fgColor - Foreground color
 * @param size - Pattern tile size
 * @returns SVG elements for pattern content
 */
export function renderTextPatternContent(
  preset: string,
  fgColor: string,
  size: number,
): ReactNode {
  const handler = PATTERN_HANDLERS[preset];
  if (handler) {
    return handler.render(fgColor, size);
  }

  // Percentage patterns (dots)
  if (preset.startsWith("pct")) {
    const pct = parseInt(preset.replace("pct", ""), 10);
    const dotSize = Math.max(0.5, (pct / 100) * 2);
    return <circle cx={size / 2} cy={size / 2} r={dotSize} fill={fgColor} />;
  }

  // Fallback: solid fill
  return renderSolid()(fgColor, size);
}

// =============================================================================
// Pattern Definition
// =============================================================================

/**
 * Create SVG pattern definition for text pattern fill.
 *
 * @param fill - Pattern fill configuration
 * @param id - Unique ID for the pattern definition
 * @returns SVG pattern element for use in <defs>
 *
 * @see ECMA-376 Part 1, Section 20.1.8.47 (a:pattFill)
 */
export function createTextPatternDef(
  fill: TextPatternFillConfig,
  id: string,
): ReactNode {
  const { preset, fgColor, bgColor } = fill;
  const size = getTextPatternSize(preset);

  return (
    <pattern
      id={id}
      width={size}
      height={size}
      patternUnits="userSpaceOnUse"
    >
      {/* Background */}
      <rect width={size} height={size} fill={bgColor} />
      {/* Pattern content */}
      {renderTextPatternContent(preset, fgColor, size)}
    </pattern>
  );
}
