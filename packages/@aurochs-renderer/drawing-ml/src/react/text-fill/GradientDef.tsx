/**
 * @file Text gradient fill SVG definition
 *
 * Creates SVG linearGradient/radialGradient for text fill.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */

import type { ReactNode } from "react";
import type { TextGradientFillConfig } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for createTextGradientDef
 */
export type TextGradientDefProps = {
  readonly fill: TextGradientFillConfig;
  readonly id: string;
};

// =============================================================================
// Gradient Definition
// =============================================================================

/**
 * Create SVG gradient definition for text gradient fill.
 *
 * Converts TextGradientFillConfig to SVG linearGradient or radialGradient element.
 *
 * @param fill - Gradient fill configuration
 * @param id - Unique ID for the gradient definition
 * @returns SVG gradient element for use in <defs>
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */
export function createTextGradientDef(fill: TextGradientFillConfig, id: string): ReactNode {
  const stops = fill.stops.map((stop, index) => (
    <stop
      key={index}
      offset={`${stop.position}%`}
      stopColor={stop.color}
      stopOpacity={stop.alpha < 1 ? stop.alpha : undefined}
    />
  ));

  if (fill.isRadial) {
    const cx = fill.radialCenter?.cx ?? 50;
    const cy = fill.radialCenter?.cy ?? 50;

    return (
      <radialGradient
        id={id}
        cx={`${cx}%`}
        cy={`${cy}%`}
        r="50%"
      >
        {stops}
      </radialGradient>
    );
  }

  // Linear gradient - convert angle to SVG coordinates
  const rad = ((fill.angle - 90) * Math.PI) / 180;
  const x1 = 50 - 50 * Math.cos(rad);
  const y1 = 50 - 50 * Math.sin(rad);
  const x2 = 50 + 50 * Math.cos(rad);
  const y2 = 50 + 50 * Math.sin(rad);

  return (
    <linearGradient
      id={id}
      x1={`${x1}%`}
      y1={`${y1}%`}
      x2={`${x2}%`}
      y2={`${y2}%`}
    >
      {stops}
    </linearGradient>
  );
}
