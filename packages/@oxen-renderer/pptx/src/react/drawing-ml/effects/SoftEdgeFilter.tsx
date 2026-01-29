/**
 * @file Soft edge filter SVG definition
 *
 * Creates SVG filter for soft edge effects.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.53 (softEdge)
 */

import { memo, type ReactNode } from "react";
import type { SoftEdgeEffect } from "@oxen-office/pptx/domain/effects";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for SoftEdgeFilterDef component
 */
export type SoftEdgeFilterDefProps = {
  /** Unique ID for the filter */
  readonly id: string;
  /** Soft edge effect data */
  readonly softEdge: SoftEdgeEffect;
};

// =============================================================================
// Component
// =============================================================================

/**
 * SVG filter definition for soft edge effects.
 *
 * Creates a feathered/soft edge by blurring the alpha channel
 * and using it as a mask for the source graphic.
 *
 * @example
 * ```tsx
 * <defs>
 *   <SoftEdgeFilterDef id="soft-1" softEdge={softEdgeEffect} />
 * </defs>
 * <rect filter="url(#soft-1)" />
 * ```
 */
export const SoftEdgeFilterDef = memo(function SoftEdgeFilterDef({
  id,
  softEdge,
}: SoftEdgeFilterDefProps): ReactNode {
  const radius = softEdge.radius as number;

  return (
    <filter
      id={id}
      x="-10%"
      y="-10%"
      width="120%"
      height="120%"
    >
      {/* Blur the alpha channel to create soft edges */}
      <feGaussianBlur in="SourceAlpha" stdDeviation={radius / 2} result="blur" />
      {/* Use blurred alpha as mask for source graphic */}
      <feComposite in="SourceGraphic" in2="blur" operator="in" />
    </filter>
  );
});
