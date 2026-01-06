/**
 * @file Text effects SVG filter definition
 *
 * Creates SVG filter for text effects (shadow, glow, soft edge, reflection).
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effects)
 */

import type { ReactNode } from "react";
import type { TextEffectsConfig } from "../../../../domain/drawing-ml";

// =============================================================================
// Types
// =============================================================================

/**
 * Filter bounds configuration
 */
type FilterBounds = {
  readonly x: string;
  readonly y: string;
  readonly width: string;
  readonly height: string;
};

// =============================================================================
// Filter Element Renderers
// =============================================================================

/**
 * Render glow effect filter elements.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.32 (glow)
 */
function renderGlowElements(glow: NonNullable<TextEffectsConfig["glow"]>): ReactNode {
  return (
    <>
      <feGaussianBlur
        in="SourceAlpha"
        stdDeviation={glow.radius / 2}
        result="glowBlur"
      />
      <feFlood
        floodColor={glow.color}
        floodOpacity={glow.opacity}
        result="glowColor"
      />
      <feComposite
        in="glowColor"
        in2="glowBlur"
        operator="in"
        result="glow"
      />
    </>
  );
}

/**
 * Render outer shadow effect filter elements.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 */
function renderOuterShadowElements(shadow: NonNullable<TextEffectsConfig["shadow"]>): ReactNode {
  return (
    <feDropShadow
      dx={shadow.dx}
      dy={shadow.dy}
      stdDeviation={shadow.blurRadius / 2}
      floodColor={shadow.color}
      floodOpacity={shadow.opacity}
      result="shadow"
    />
  );
}

/**
 * Render inner shadow effect filter elements.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.40 (innerShdw)
 */
function renderInnerShadowElements(shadow: NonNullable<TextEffectsConfig["shadow"]>): ReactNode {
  return (
    <>
      <feGaussianBlur
        in="SourceAlpha"
        stdDeviation={shadow.blurRadius / 2}
        result="innerBlur"
      />
      <feOffset
        dx={shadow.dx}
        dy={shadow.dy}
        result="innerOffset"
      />
      <feFlood
        floodColor={shadow.color}
        floodOpacity={shadow.opacity}
        result="innerColor"
      />
      <feComposite
        in="innerColor"
        in2="innerOffset"
        operator="in"
        result="innerShadow"
      />
      <feComposite
        in="innerShadow"
        in2="SourceAlpha"
        operator="in"
        result="innerClipped"
      />
    </>
  );
}

/**
 * Render soft edge effect filter elements.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.53 (softEdge)
 */
function renderSoftEdgeElements(softEdge: NonNullable<TextEffectsConfig["softEdge"]>): ReactNode {
  return (
    <>
      <feGaussianBlur
        in="SourceAlpha"
        stdDeviation={softEdge.radius / 2}
        result="softBlur"
      />
      <feComposite
        in="SourceGraphic"
        in2="softBlur"
        operator="in"
        result="softEdge"
      />
    </>
  );
}

/**
 * Render reflection effect filter elements.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.50 (reflection)
 */
function renderReflectionElements(reflection: NonNullable<TextEffectsConfig["reflection"]>): ReactNode {
  return (
    <>
      <feOffset
        in="SourceGraphic"
        dy={reflection.distance}
        result="reflectOffset"
      />
      <feGaussianBlur
        in="reflectOffset"
        stdDeviation={reflection.blurRadius / 2}
        result="reflectBlur"
      />
      <feComponentTransfer in="reflectBlur" result="reflectFade">
        <feFuncA
          type="linear"
          slope={reflection.endOpacity / 100}
          intercept={0}
        />
      </feComponentTransfer>
    </>
  );
}

// =============================================================================
// Merge Node Determination
// =============================================================================

/**
 * Determine the final source for feMerge based on active effects.
 */
function getFinalMergeSource(effects: TextEffectsConfig): string {
  if (effects.softEdge !== undefined) {
    return "softEdge";
  }
  if (effects.shadow?.type === "inner") {
    return "innerClipped";
  }
  return "SourceGraphic";
}

/**
 * Render feMerge element for combining effects.
 */
function renderMergeElements(effects: TextEffectsConfig): ReactNode {
  const hasGlow = effects.glow !== undefined;
  const hasShadow = effects.shadow !== undefined;
  const hasReflection = effects.reflection !== undefined;
  const isInnerShadow = hasShadow && effects.shadow?.type === "inner";
  const hasSoftEdge = effects.softEdge !== undefined;

  const finalSource = getFinalMergeSource(effects);

  return (
    <feMerge>
      {hasGlow && <feMergeNode in="glow" />}
      {hasShadow && !isInnerShadow && <feMergeNode in="shadow" />}
      {hasReflection && <feMergeNode in="reflectFade" />}
      <feMergeNode in={finalSource} />
      {isInnerShadow && !hasSoftEdge && <feMergeNode in="SourceGraphic" />}
    </feMerge>
  );
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Default filter bounds for text effects.
 * Large bounds to accommodate glow and shadow offsets.
 */
const DEFAULT_FILTER_BOUNDS: FilterBounds = {
  x: "-50%",
  y: "-50%",
  width: "200%",
  height: "200%",
};

/**
 * Create SVG filter definition for text effects.
 *
 * Combines multiple effects (shadow, glow, soft edge, reflection) into a single filter.
 *
 * @param effects - Text effects configuration
 * @param id - Unique ID for the filter definition
 * @returns SVG filter element for use in <defs>
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effects)
 */
export function createTextEffectsFilterDef(
  effects: TextEffectsConfig,
  id: string,
): ReactNode {
  const hasGlow = effects.glow !== undefined;
  const hasShadow = effects.shadow !== undefined;
  const hasSoftEdge = effects.softEdge !== undefined;
  const hasReflection = effects.reflection !== undefined;
  const isInnerShadow = hasShadow && effects.shadow?.type === "inner";

  return (
    <filter
      id={id}
      x={DEFAULT_FILTER_BOUNDS.x}
      y={DEFAULT_FILTER_BOUNDS.y}
      width={DEFAULT_FILTER_BOUNDS.width}
      height={DEFAULT_FILTER_BOUNDS.height}
    >
      {/* Glow effect (rendered behind everything) */}
      {hasGlow && effects.glow && renderGlowElements(effects.glow)}

      {/* Shadow effect */}
      {hasShadow && effects.shadow && !isInnerShadow && renderOuterShadowElements(effects.shadow)}

      {/* Inner shadow (more complex) */}
      {isInnerShadow && effects.shadow && renderInnerShadowElements(effects.shadow)}

      {/* Soft edge effect */}
      {hasSoftEdge && effects.softEdge && renderSoftEdgeElements(effects.softEdge)}

      {/* Reflection effect */}
      {hasReflection && effects.reflection && renderReflectionElements(effects.reflection)}

      {/* Merge all effects */}
      {renderMergeElements(effects)}
    </filter>
  );
}
