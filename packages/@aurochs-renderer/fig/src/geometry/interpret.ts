/**
 * @file Geometry interpretation — shared SoT
 *
 * Pure functions for corner radius extraction, clip content resolution,
 * and winding rule mapping. Consumed by both SVG and SceneGraph paths.
 */

// =============================================================================
// Winding Rule
// =============================================================================

export type WindingRule = "nonzero" | "evenodd";

/**
 * Map Figma winding rule to SVG/SceneGraph winding rule.
 *
 * Handles string ("NONZERO", "EVENODD") and KiwiEnumValue ({ name: "NONZERO" }).
 */
export function mapWindingRule(rule: unknown): WindingRule {
  const name = typeof rule === "string" ? rule : (rule as { name?: string } | null)?.name;
  if (name === "EVENODD" || name === "ODD") {
    return "evenodd";
  }
  return "nonzero";
}

// =============================================================================
// Corner Radius
// =============================================================================

/**
 * Extract a uniform corner radius from per-corner or uniform radius values.
 *
 * Figma stores either:
 * - `cornerRadius`: single number (uniform)
 * - `rectangleCornerRadii`: [TL, TR, BR, BL] (per-corner)
 *
 * When per-corner radii differ, returns the average as a scene-graph
 * approximation. Returns undefined when there is no radius.
 *
 * Clamping to max(width, height)/2 is the caller's responsibility
 * since it requires element dimensions.
 */
export function extractUniformCornerRadius(
  cornerRadius: number | undefined,
  rectangleCornerRadii: readonly number[] | undefined,
): number | undefined {
  if (rectangleCornerRadii && rectangleCornerRadii.length === 4) {
    const [tl, tr, br, bl] = rectangleCornerRadii;
    const allSame = tl === tr && tr === br && br === bl;
    if (allSame) return tl || undefined;
    const avg = (tl + tr + br + bl) / 4;
    return avg || undefined;
  }
  return cornerRadius;
}

/**
 * Clamp a corner radius to the maximum allowed by the element dimensions.
 *
 * SVG clamps rx/ry independently, but Figma clamps to min(width, height)/2.
 * This function applies the Figma clamping rule.
 */
export function clampCornerRadius(
  radius: number | undefined,
  width: number,
  height: number,
): number | undefined {
  if (!radius || radius <= 0) return undefined;
  return Math.min(radius, Math.min(width, height) / 2);
}

// =============================================================================
// Clip Content
// =============================================================================

/** Node types that clip content by default in Figma. */
const CLIPPING_NODE_TYPES = new Set(["FRAME", "COMPONENT", "COMPONENT_SET"]);

/**
 * Resolve whether a node clips its content.
 *
 * Resolution order:
 * 1. Explicit `clipsContent` field (FigDesignNode domain model)
 * 2. `frameMaskDisabled` in raw data (inverted semantics from Kiwi encoding)
 * 3. Default based on node type (FRAME/COMPONENT/COMPONENT_SET clip by default)
 *
 * @param clipsContent - Domain field value
 * @param frameMaskDisabled - Raw Kiwi field value
 * @param nodeType - Node type name
 */
export function resolveClipsContent(
  clipsContent: boolean | undefined,
  frameMaskDisabled: boolean | undefined,
  nodeType: string,
): boolean {
  if (clipsContent !== undefined) return clipsContent;
  if (frameMaskDisabled !== undefined) return !frameMaskDisabled;
  return CLIPPING_NODE_TYPES.has(nodeType);
}
