/**
 * @file SVG pattern definition generator for ECMA-376 pattern fills
 *
 * Converts PPTX pattern presets to SVG patterns.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetPatternVal)
 */

import { memo, type ReactNode } from "react";
import type { PatternType } from "@oxen-office/ooxml/domain/fill";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for PatternDef component
 */
export type PatternDefProps = {
  /** Unique ID for the pattern */
  readonly id: string;
  /** Pattern preset type */
  readonly preset: PatternType;
  /** Foreground color (hex without #) */
  readonly fgColor: string;
  /** Background color (hex without #) */
  readonly bgColor: string;
};

/**
 * Pattern geometry configuration
 */
type PatternGeometry = {
  readonly width: number;
  readonly height: number;
  readonly render: (fg: string, bg: string) => ReactNode;
};

// =============================================================================
// Pattern Renderers
// =============================================================================

/**
 * Render grid pattern with specified spacing
 */
function renderGrid(spacing: number, lineWidth: number): PatternGeometry["render"] {
  return (fg) => (
    <>
      <line x1="0" y1="0" x2={spacing} y2="0" stroke={`#${fg}`} strokeWidth={lineWidth} />
      <line x1="0" y1="0" x2="0" y2={spacing} stroke={`#${fg}`} strokeWidth={lineWidth} />
    </>
  );
}

/**
 * Render diagonal lines pattern
 */
function renderDiagonal(
  direction: "up" | "down",
  spacing: number,
  lineWidth: number
): PatternGeometry["render"] {
  return (fg) => (
    <line
      x1="0"
      y1={direction === "up" ? spacing : 0}
      x2={spacing}
      y2={direction === "up" ? 0 : spacing}
      stroke={`#${fg}`}
      strokeWidth={lineWidth}
    />
  );
}

/**
 * Render horizontal lines pattern
 */
function renderHorizontal(spacing: number, lineWidth: number): PatternGeometry["render"] {
  return (fg) => (
    <line x1="0" y1="0" x2={spacing} y2="0" stroke={`#${fg}`} strokeWidth={lineWidth} />
  );
}

/**
 * Render vertical lines pattern
 */
function renderVertical(spacing: number, lineWidth: number): PatternGeometry["render"] {
  return (fg) => (
    <line x1="0" y1="0" x2="0" y2={spacing} stroke={`#${fg}`} strokeWidth={lineWidth} />
  );
}

/**
 * Render cross pattern
 */
function renderCross(spacing: number, lineWidth: number): PatternGeometry["render"] {
  return (fg) => (
    <>
      <line x1="0" y1={spacing / 2} x2={spacing} y2={spacing / 2} stroke={`#${fg}`} strokeWidth={lineWidth} />
      <line x1={spacing / 2} y1="0" x2={spacing / 2} y2={spacing} stroke={`#${fg}`} strokeWidth={lineWidth} />
    </>
  );
}

/**
 * Render diagonal cross pattern
 */
function renderDiagCross(spacing: number, lineWidth: number): PatternGeometry["render"] {
  return (fg) => (
    <>
      <line x1="0" y1="0" x2={spacing} y2={spacing} stroke={`#${fg}`} strokeWidth={lineWidth} />
      <line x1={spacing} y1="0" x2="0" y2={spacing} stroke={`#${fg}`} strokeWidth={lineWidth} />
    </>
  );
}

/**
 * Render checkerboard pattern
 */
function renderCheck(cellSize: number): PatternGeometry["render"] {
  return (fg, bg) => (
    <>
      <rect x="0" y="0" width={cellSize} height={cellSize} fill={`#${fg}`} />
      <rect x={cellSize} y="0" width={cellSize} height={cellSize} fill={`#${bg}`} />
      <rect x="0" y={cellSize} width={cellSize} height={cellSize} fill={`#${bg}`} />
      <rect x={cellSize} y={cellSize} width={cellSize} height={cellSize} fill={`#${fg}`} />
    </>
  );
}

/**
 * Render percentage dot pattern
 */
function renderPercentDots(
  dotRadius: number,
  spacing: number
): PatternGeometry["render"] {
  return (fg) => (
    <circle cx={spacing / 2} cy={spacing / 2} r={dotRadius} fill={`#${fg}`} />
  );
}

// =============================================================================
// Pattern Definitions
// =============================================================================

/**
 * Pattern geometry definitions for each ECMA-376 preset.
 */
const PATTERN_GEOMETRIES: Partial<Record<PatternType, PatternGeometry>> = {
  // Grid patterns
  smGrid: { width: 4, height: 4, render: renderGrid(4, 0.5) },
  lgGrid: { width: 8, height: 8, render: renderGrid(8, 1) },
  dotGrid: { width: 8, height: 8, render: renderGrid(8, 0.5) },

  // Horizontal patterns
  horz: { width: 8, height: 4, render: renderHorizontal(8, 1) },
  ltHorz: { width: 8, height: 6, render: renderHorizontal(8, 0.5) },
  dkHorz: { width: 8, height: 4, render: renderHorizontal(8, 2) },
  narHorz: { width: 8, height: 2, render: renderHorizontal(8, 0.5) },
  dashHorz: { width: 8, height: 4, render: renderHorizontal(8, 1) },

  // Vertical patterns
  vert: { width: 4, height: 8, render: renderVertical(4, 1) },
  ltVert: { width: 6, height: 8, render: renderVertical(6, 0.5) },
  dkVert: { width: 4, height: 8, render: renderVertical(4, 2) },
  narVert: { width: 2, height: 8, render: renderVertical(2, 0.5) },
  dashVert: { width: 4, height: 8, render: renderVertical(4, 1) },

  // Diagonal up patterns
  upDiag: { width: 6, height: 6, render: renderDiagonal("up", 6, 1) },
  ltUpDiag: { width: 6, height: 6, render: renderDiagonal("up", 6, 0.5) },
  dkUpDiag: { width: 6, height: 6, render: renderDiagonal("up", 6, 2) },
  wdUpDiag: { width: 8, height: 8, render: renderDiagonal("up", 8, 3) },
  dashUpDiag: { width: 6, height: 6, render: renderDiagonal("up", 6, 1) },

  // Diagonal down patterns
  dnDiag: { width: 6, height: 6, render: renderDiagonal("down", 6, 1) },
  ltDnDiag: { width: 6, height: 6, render: renderDiagonal("down", 6, 0.5) },
  dkDnDiag: { width: 6, height: 6, render: renderDiagonal("down", 6, 2) },
  wdDnDiag: { width: 8, height: 8, render: renderDiagonal("down", 8, 3) },
  dashDnDiag: { width: 6, height: 6, render: renderDiagonal("down", 6, 1) },

  // Cross patterns
  cross: { width: 8, height: 8, render: renderCross(8, 1) },
  diagCross: { width: 8, height: 8, render: renderDiagCross(8, 1) },

  // Check patterns
  smCheck: { width: 4, height: 4, render: renderCheck(2) },
  lgCheck: { width: 8, height: 8, render: renderCheck(4) },

  // Percentage patterns (dots)
  pct5: { width: 8, height: 8, render: renderPercentDots(0.3, 8) },
  pct10: { width: 6, height: 6, render: renderPercentDots(0.4, 6) },
  pct20: { width: 5, height: 5, render: renderPercentDots(0.5, 5) },
  pct25: { width: 4, height: 4, render: renderPercentDots(0.5, 4) },
  pct30: { width: 4, height: 4, render: renderPercentDots(0.6, 4) },
  pct40: { width: 4, height: 4, render: renderPercentDots(0.8, 4) },
  pct50: { width: 3, height: 3, render: renderPercentDots(0.75, 3) },
  pct60: { width: 3, height: 3, render: renderPercentDots(0.9, 3) },
  pct70: { width: 3, height: 3, render: renderPercentDots(1.0, 3) },
  pct75: { width: 2, height: 2, render: renderPercentDots(0.75, 2) },
  pct80: { width: 2, height: 2, render: renderPercentDots(0.85, 2) },
  pct90: { width: 2, height: 2, render: renderPercentDots(0.95, 2) },
};

/**
 * Get pattern geometry for a preset.
 * Returns undefined for unsupported patterns.
 */
export function getPatternGeometry(preset: PatternType): PatternGeometry | undefined {
  return PATTERN_GEOMETRIES[preset];
}

/**
 * Check if a pattern preset is supported.
 */
export function isPatternSupported(preset: PatternType): boolean {
  return preset in PATTERN_GEOMETRIES;
}

// =============================================================================
// Component
// =============================================================================

/**
 * SVG pattern definition for ECMA-376 pattern fills.
 *
 * This component renders a `<pattern>` element to be placed in `<defs>`.
 * Use the returned `id` as `fill="url(#id)"` on shapes.
 *
 * @example
 * ```tsx
 * <defs>
 *   <PatternDef id="pattern-1" preset="smGrid" fgColor="000000" bgColor="FFFFFF" />
 * </defs>
 * <rect fill="url(#pattern-1)" />
 * ```
 */
export const PatternDef = memo(function PatternDef({
  id,
  preset,
  fgColor,
  bgColor,
}: PatternDefProps) {
  const geometry = PATTERN_GEOMETRIES[preset];

  // Unsupported pattern - render solid background
  if (!geometry) {
    return (
      <pattern id={id} width="1" height="1" patternUnits="objectBoundingBox">
        <rect width="1" height="1" fill={`#${bgColor}`} />
      </pattern>
    );
  }

  const { width, height, render } = geometry;

  return (
    <pattern
      id={id}
      width={width}
      height={height}
      patternUnits="userSpaceOnUse"
    >
      {/* Background */}
      <rect width={width} height={height} fill={`#${bgColor}`} />
      {/* Pattern content */}
      {render(fgColor, bgColor)}
    </pattern>
  );
});

/**
 * Get the list of supported pattern presets.
 */
export function getSupportedPatterns(): PatternType[] {
  return Object.keys(PATTERN_GEOMETRIES) as PatternType[];
}
