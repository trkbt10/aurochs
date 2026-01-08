/**
 * @file Style and color resolver for diagrams
 *
 * Resolves styles and colors for diagram nodes based on
 * style labels, color definitions, and theme colors.
 *
 * Uses shared color utilities from src/color and domain/drawing-ml/color.
 *
 * @see ECMA-376 Part 1, Section 21.4.4.6 (styleLbl)
 * @see ECMA-376 Part 1, Section 21.4.4.7 (fillClrLst)
 */

import type {
  DiagramStyleDefinition,
  DiagramStyleLabel,
  DiagramColorsDefinition,
  DiagramColorStyleLabel,
  DiagramColorList,
  DiagramClrAppMethod,
} from "../types";
import type { Color } from "../../color";
import type { ShapeStyle } from "../../shape";
import type { DiagramTreeNode } from "./tree-builder";

// Use shared color utilities
import {
  applyShade,
  applyTint,
  applyLumMod,
  applyLumOff,
  applySatMod,
} from "../../../../color";

// Use existing color resolution
import { resolveColor as resolveDrawingMlColor } from "../../drawing-ml/color";
import type { ColorContext } from "../../resolution";

// =============================================================================
// Types
// =============================================================================

/**
 * Resolved style for a diagram node
 */
export type ResolvedDiagramStyle = {
  /** Fill color (CSS color string) */
  readonly fillColor?: string;
  /** Line/stroke color (CSS color string) */
  readonly lineColor?: string;
  /** Effect color (CSS color string) */
  readonly effectColor?: string;
  /** Text fill color (CSS color string) */
  readonly textFillColor?: string;
  /** Text line color (CSS color string) */
  readonly textLineColor?: string;
  /** Text effect color (CSS color string) */
  readonly textEffectColor?: string;
  /** Line width in pixels */
  readonly lineWidth?: number;
  /** Font size in points */
  readonly fontSize?: number;
  /** Font weight */
  readonly fontWeight?: "normal" | "bold";
  /** Shape style from style definition */
  readonly shapeStyle?: ShapeStyle;
};

/**
 * Context for style resolution
 */
export type StyleResolverContext = {
  /** Style definition */
  readonly styleDefinition?: DiagramStyleDefinition;
  /** Color definition */
  readonly colorDefinition?: DiagramColorsDefinition;
  /** Theme colors (scheme color name -> CSS color) */
  readonly themeColors: ReadonlyMap<string, string>;
  /** Default colors for fallback */
  readonly defaultColors: DefaultColors;
};

/**
 * Default colors for fallback
 */
export type DefaultColors = {
  readonly fill: string;
  readonly line: string;
  readonly text: string;
  readonly background: string;
};

// =============================================================================
// Style Resolution
// =============================================================================

/**
 * Resolve style for a diagram node
 */
export function resolveNodeStyle(
  node: DiagramTreeNode,
  nodeIndex: number,
  totalNodes: number,
  context: StyleResolverContext
): ResolvedDiagramStyle {
  const { styleDefinition, colorDefinition, themeColors, defaultColors } = context;

  // Get style label from node's property set
  const styleLbl = node.propertySet?.presentationStyleLabel;

  // Find matching style label in style definition
  const styleLabel = styleLbl
    ? findStyleLabel(styleLbl, styleDefinition)
    : undefined;

  // Find matching color style label in color definition
  const colorStyleLabel = styleLbl
    ? findColorStyleLabel(styleLbl, colorDefinition)
    : undefined;

  // Build color context for resolution
  const colorContext = buildColorContext(themeColors);

  // Resolve colors
  const fillColor = resolveColorFromList(
    colorStyleLabel?.fillColors,
    nodeIndex,
    totalNodes,
    colorContext,
    defaultColors.fill
  );

  const lineColor = resolveColorFromList(
    colorStyleLabel?.lineColors,
    nodeIndex,
    totalNodes,
    colorContext,
    defaultColors.line
  );

  const effectColor = resolveColorFromList(
    colorStyleLabel?.effectColors,
    nodeIndex,
    totalNodes,
    colorContext,
    undefined
  );

  const textFillColor = resolveColorFromList(
    colorStyleLabel?.textFillColors,
    nodeIndex,
    totalNodes,
    colorContext,
    defaultColors.text
  );

  const textLineColor = resolveColorFromList(
    colorStyleLabel?.textLineColors,
    nodeIndex,
    totalNodes,
    colorContext,
    undefined
  );

  const textEffectColor = resolveColorFromList(
    colorStyleLabel?.textEffectColors,
    nodeIndex,
    totalNodes,
    colorContext,
    undefined
  );

  return {
    fillColor,
    lineColor,
    effectColor,
    textFillColor,
    textLineColor,
    textEffectColor,
    shapeStyle: styleLabel?.style,
  };
}

/**
 * Find style label by name
 */
export function findStyleLabel(
  name: string,
  styleDefinition?: DiagramStyleDefinition
): DiagramStyleLabel | undefined {
  if (!styleDefinition?.styleLabels) {
    return undefined;
  }

  return styleDefinition.styleLabels.find((sl) => sl.name === name);
}

/**
 * Find color style label by name
 */
export function findColorStyleLabel(
  name: string,
  colorDefinition?: DiagramColorsDefinition
): DiagramColorStyleLabel | undefined {
  if (!colorDefinition?.styleLabels) {
    return undefined;
  }

  return colorDefinition.styleLabels.find((sl) => sl.name === name);
}

// =============================================================================
// Color Resolution
// =============================================================================

/**
 * Build color context from theme colors map
 */
function buildColorContext(themeColors: ReadonlyMap<string, string>): ColorContext {
  const colorScheme: Record<string, string> = {};
  for (const [key, value] of themeColors) {
    // Remove # prefix if present for consistency
    colorScheme[key] = value.replace(/^#/, "");
  }

  return {
    colorScheme,
    colorMap: {},
  };
}

/**
 * Resolve color from a color list
 */
export function resolveColorFromList(
  colorList: DiagramColorList | undefined,
  nodeIndex: number,
  totalNodes: number,
  colorContext: ColorContext,
  defaultColor: string | undefined
): string | undefined {
  if (!colorList || colorList.colors.length === 0) {
    return defaultColor;
  }

  const { colors, method } = colorList;
  const colorIndex = calculateColorIndex(nodeIndex, totalNodes, colors.length, method);
  const color = colors[colorIndex];

  if (!color) {
    return defaultColor;
  }

  const resolved = resolveColor(color, colorContext);
  return resolved ? `#${resolved}` : defaultColor;
}

/**
 * Calculate color index based on application method
 */
export function calculateColorIndex(
  nodeIndex: number,
  totalNodes: number,
  colorCount: number,
  method: DiagramClrAppMethod | undefined
): number {
  if (colorCount === 0) {
    return 0;
  }

  switch (method) {
    case "cycle":
      // Cycle through colors repeatedly
      return nodeIndex % colorCount;

    case "repeat":
      // Repeat each color for a segment of nodes
      const segmentSize = Math.ceil(totalNodes / colorCount);
      return Math.min(Math.floor(nodeIndex / segmentSize), colorCount - 1);

    case "span":
      // Span colors across all nodes (gradient-like)
      if (totalNodes <= 1) {
        return 0;
      }
      const ratio = nodeIndex / (totalNodes - 1);
      return Math.min(Math.floor(ratio * colorCount), colorCount - 1);

    default:
      // Default to cycle
      return nodeIndex % colorCount;
  }
}

/**
 * Resolve a Color to hex string (without #)
 * Wrapper around drawing-ml resolveColor for diagram-specific handling
 */
export function resolveColor(
  color: Color,
  colorContext: ColorContext
): string | undefined {
  // Use the shared drawing-ml color resolver
  return resolveDrawingMlColor(color, colorContext);
}

/**
 * Resolve scheme color using theme colors
 * For backward compatibility and direct scheme color resolution
 */
export function resolveSchemeColor(
  schemeColor: { val: string; lumMod?: number; lumOff?: number; satMod?: number; tint?: number; shade?: number },
  themeColors: ReadonlyMap<string, string>
): string | undefined {
  const { val, lumMod, lumOff, satMod, tint, shade } = schemeColor;

  // Get base color from theme
  let baseColor = themeColors.get(val);
  if (!baseColor) {
    // Try common mappings
    baseColor = getDefaultSchemeColor(val);
  }

  if (!baseColor) {
    return undefined;
  }

  // Normalize to hex without #
  const hexColor = baseColor.replace(/^#/, "");

  // Apply color transforms using shared utilities
  return applyColorTransforms(hexColor, { lumMod, lumOff, satMod, tint, shade });
}

/**
 * Get default scheme color for common values
 */
function getDefaultSchemeColor(val: string): string | undefined {
  const defaults: Record<string, string> = {
    accent1: "#4472C4",
    accent2: "#ED7D31",
    accent3: "#A5A5A5",
    accent4: "#FFC000",
    accent5: "#5B9BD5",
    accent6: "#70AD47",
    dk1: "#000000",
    dk2: "#44546A",
    lt1: "#FFFFFF",
    lt2: "#E7E6E6",
    tx1: "#000000",
    tx2: "#44546A",
    bg1: "#FFFFFF",
    bg2: "#E7E6E6",
    hlink: "#0563C1",
    folHlink: "#954F72",
  };

  return defaults[val];
}

// =============================================================================
// Color Transforms (using shared utilities)
// =============================================================================

type ColorTransforms = {
  lumMod?: number;
  lumOff?: number;
  satMod?: number;
  tint?: number;
  shade?: number;
};

/**
 * Apply color transforms to a hex color
 * Uses shared utilities from src/color
 */
export function applyColorTransforms(
  hexColor: string,
  transforms: ColorTransforms
): string {
  let result = hexColor.replace(/^#/, "");

  // Apply luminance modifier (percentage, where 100000 = 100%)
  if (transforms.lumMod !== undefined) {
    const multiplier = transforms.lumMod / 100000;
    result = applyLumMod(result, multiplier);
  }

  // Apply luminance offset (percentage)
  if (transforms.lumOff !== undefined) {
    const offset = transforms.lumOff / 100000;
    result = applyLumOff(result, offset);
  }

  // Apply saturation modifier
  if (transforms.satMod !== undefined) {
    const multiplier = transforms.satMod / 100000;
    result = applySatMod(result, multiplier);
  }

  // Apply tint (mix with white)
  // ECMA-376: tint value is percentage where 100000 = 100%
  if (transforms.tint !== undefined) {
    const tintAmount = transforms.tint / 100000;
    result = applyTint(result, tintAmount);
  }

  // Apply shade (mix with black)
  // ECMA-376: shade value is percentage where 100000 = 100%
  if (transforms.shade !== undefined) {
    const shadeAmount = transforms.shade / 100000;
    result = applyShade(result, shadeAmount);
  }

  return `#${result}`;
}

// =============================================================================
// Default Context Creation
// =============================================================================

/**
 * Create default style resolver context
 */
export function createDefaultStyleContext(
  styleDefinition?: DiagramStyleDefinition,
  colorDefinition?: DiagramColorsDefinition,
  themeColors?: Map<string, string>
): StyleResolverContext {
  return {
    styleDefinition,
    colorDefinition,
    themeColors: themeColors ?? new Map(),
    defaultColors: {
      fill: "#4472C4",
      line: "#2F528F",
      text: "#000000",
      background: "#FFFFFF",
    },
  };
}
