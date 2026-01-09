/**
 * @file Style and color resolver for diagrams
 *
 * Resolves styles and colors for diagram nodes based on
 * style labels, color definitions, and theme context.
 *
 * Uses shared color resolution from domain/drawing-ml/.
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
import type { Color, Fill, SolidFill, Line } from "../../color/types";
import type { ShapeStyle } from "../../shape";
import type { TextBody } from "../../text";
import type { DiagramTreeNode } from "./tree-builder";
import type { ColorContext } from "../../resolution";
import { px } from "../../types";

// Use existing color resolution utilities
import { resolveColor as resolveDrawingMlColor } from "../../color/resolution";

// =============================================================================
// Types
// =============================================================================

/**
 * Resolved style for a diagram node
 *
 * Uses proper Fill/Line types from domain/color.ts to support
 * solid fills, gradients, patterns, etc.
 *
 * All fill/line properties are optional - undefined means no style was resolved.
 * The consumer must handle undefined appropriately (e.g., use theme defaults).
 *
 * Note: Text styling (font size, bold, etc.) is NOT included here.
 * Text styling comes from:
 * 1. DiagramStyleLabel.textProperties (TextBody)
 * 2. DiagramTreeNode.textBody (from the data model)
 * These should be merged at render time following TextBody merge rules.
 *
 * @see ECMA-376 Part 1, Section 21.4.4.6 (styleLbl)
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */
export type ResolvedDiagramStyle = {
  /** Shape fill (solid, gradient, pattern, etc.) */
  readonly fill?: Fill;
  /** Shape line/stroke */
  readonly line?: Line;
  /** Effect fill */
  readonly effectFill?: Fill;
  /** Text fill - applied to text runs without their own fill */
  readonly textFill?: Fill;
  /** Text line/outline - applied to text runs without their own outline */
  readonly textLine?: Line;
  /** Text effect fill */
  readonly textEffectFill?: Fill;
  /** Shape style reference from style definition */
  readonly shapeStyle?: ShapeStyle;
  /** Text properties from style definition (for text styling merge) */
  readonly textProperties?: TextBody;
  /** Style label name used */
  readonly styleLabel?: string;
};

/**
 * Context for style resolution
 *
 * Uses ColorContext from domain/resolution.ts for theme color resolution.
 * No hardcoded defaults - if colors are not available, they remain undefined.
 */
export type StyleResolverContext = {
  /** Style definition from diagram */
  readonly styleDefinition?: DiagramStyleDefinition;
  /** Color definition from diagram */
  readonly colorDefinition?: DiagramColorsDefinition;
  /** Color context for theme/scheme color resolution */
  readonly colorContext: ColorContext;
};

// =============================================================================
// Style Resolution
// =============================================================================

/**
 * Resolve style for a diagram node
 *
 * @param node - The diagram tree node
 * @param nodeIndex - Index of this node (for color cycling)
 * @param totalNodes - Total number of nodes (for color cycling)
 * @param context - Style resolver context with definitions and theme
 * @returns Resolved style with Fill/Line types (undefined if not resolved)
 */
export function resolveNodeStyle(
  node: DiagramTreeNode,
  nodeIndex: number,
  totalNodes: number,
  context: StyleResolverContext
): ResolvedDiagramStyle {
  const { styleDefinition, colorDefinition } = context;

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

  // Resolve fills from color lists (undefined if not available)
  const fill = resolveFillFromList(
    colorStyleLabel?.fillColors,
    nodeIndex,
    totalNodes
  );

  const line = resolveLineFromList(
    colorStyleLabel?.lineColors,
    nodeIndex,
    totalNodes
  );

  const effectFill = resolveFillFromList(
    colorStyleLabel?.effectColors,
    nodeIndex,
    totalNodes
  );

  const textFill = resolveFillFromList(
    colorStyleLabel?.textFillColors,
    nodeIndex,
    totalNodes
  );

  const textLine = resolveLineFromList(
    colorStyleLabel?.textLineColors,
    nodeIndex,
    totalNodes
  );

  const textEffectFill = resolveFillFromList(
    colorStyleLabel?.textEffectColors,
    nodeIndex,
    totalNodes
  );

  return {
    fill,
    line,
    effectFill,
    textFill,
    textLine,
    textEffectFill,
    shapeStyle: styleLabel?.style,
    textProperties: styleLabel?.textProperties,
    styleLabel: styleLbl,
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
// Fill Resolution
// =============================================================================

/**
 * Resolve Fill from a color list
 *
 * Creates a SolidFill from the color in the list. The original Color
 * with its transform is preserved in the Fill structure.
 *
 * @param colorList - Color list from diagram color definition
 * @param nodeIndex - Index of this node (for color cycling)
 * @param totalNodes - Total number of nodes (for color cycling)
 * @returns SolidFill if color available, undefined otherwise
 */
export function resolveFillFromList(
  colorList: DiagramColorList | undefined,
  nodeIndex: number,
  totalNodes: number
): Fill | undefined {
  if (!colorList || colorList.colors.length === 0) {
    return undefined;
  }

  const { colors, method } = colorList;
  const colorIndex = calculateColorIndex(nodeIndex, totalNodes, colors.length, method);
  const color = colors[colorIndex];

  if (!color) {
    return undefined;
  }

  // Create a SolidFill that preserves the original Color structure
  const fill: SolidFill = {
    type: "solidFill",
    color,
  };

  return fill;
}

/**
 * Resolve Line from a color list
 *
 * Creates a Line with a SolidFill from the color in the list.
 *
 * @param colorList - Color list from diagram color definition
 * @param nodeIndex - Index of this node (for color cycling)
 * @param totalNodes - Total number of nodes (for color cycling)
 * @returns Line if color available, undefined otherwise
 */
export function resolveLineFromList(
  colorList: DiagramColorList | undefined,
  nodeIndex: number,
  totalNodes: number
): Line | undefined {
  const fill = resolveFillFromList(colorList, nodeIndex, totalNodes);

  if (!fill) {
    return undefined;
  }

  const line: Line = {
    width: px(1), // Default 1px line width per ECMA-376
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    fill,
    dash: "solid",
    join: "round",
  };

  return line;
}

/**
 * Calculate color index based on application method
 *
 * @see ECMA-376 Part 1, Section 21.4.4.7 (fillClrLst)
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
      // Default to cycle per ECMA-376
      return nodeIndex % colorCount;
  }
}

// =============================================================================
// Color Resolution (delegated to domain/drawing-ml)
// =============================================================================

/**
 * Resolve a Color to hex string (without #)
 *
 * Delegates to domain/drawing-ml/color.ts for actual resolution.
 *
 * @param color - Color domain object
 * @param colorContext - Color context with theme colors
 * @returns Hex color string (without #) or undefined
 */
export function resolveColor(
  color: Color,
  colorContext: ColorContext
): string | undefined {
  return resolveDrawingMlColor(color, colorContext);
}

/**
 * @deprecated Use resolveFillFromList instead
 * Resolve color from a color list (returns CSS string for backward compatibility)
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

// =============================================================================
// Context Creation
// =============================================================================

/**
 * Create style resolver context
 *
 * @param colorContext - Color context with theme colors (required)
 * @param styleDefinition - Style definition from diagram (optional)
 * @param colorDefinition - Color definition from diagram (optional)
 */
export function createStyleContext(
  colorContext: ColorContext,
  styleDefinition?: DiagramStyleDefinition,
  colorDefinition?: DiagramColorsDefinition
): StyleResolverContext {
  return {
    styleDefinition,
    colorDefinition,
    colorContext,
  };
}

/**
 * Create an empty color context (for testing or when no theme is available)
 *
 * Note: Using this means scheme colors will not resolve.
 * In production, always use a proper ColorContext from the theme.
 */
export function createEmptyColorContext(): ColorContext {
  return {
    colorScheme: {},
    colorMap: {},
  };
}

/**
 * @deprecated Use createStyleContext instead
 * Create default style resolver context (for backward compatibility)
 */
export function createDefaultStyleContext(
  styleDefinition?: DiagramStyleDefinition,
  colorDefinition?: DiagramColorsDefinition,
  themeColors?: Map<string, string>
): StyleResolverContext & { themeColors: ReadonlyMap<string, string>; defaultFills: DefaultFills } {
  // Convert themeColors map to ColorContext
  const colorScheme: Record<string, string> = {};
  if (themeColors) {
    for (const [key, value] of themeColors) {
      colorScheme[key] = value.replace(/^#/, "");
    }
  }

  const colorContext: ColorContext = {
    colorScheme,
    colorMap: {},
  };

  // Create placeholder defaults for backward compatibility
  // These should NOT be used in new code - handle undefined properly instead
  const defaultFills: DefaultFills = {
    fill: createSolidFillFromHex("4472C4"), // Office default accent1 (for legacy compatibility only)
    line: createLineFromHex("2F528F"),
    text: createSolidFillFromHex("000000"),
    background: createSolidFillFromHex("FFFFFF"),
  };

  return {
    styleDefinition,
    colorDefinition,
    colorContext,
    themeColors: themeColors ?? new Map(),
    defaultFills,
  };
}

/**
 * @deprecated For backward compatibility only
 */
export type DefaultFills = {
  readonly fill: Fill;
  readonly line: Line;
  readonly text: Fill;
  readonly background: Fill;
};

/**
 * @deprecated Use DefaultFills instead
 */
export type DefaultColors = DefaultFills;

// =============================================================================
// Internal Helpers (for backward compatibility)
// =============================================================================

function createSolidFillFromHex(hexValue: string): SolidFill {
  return {
    type: "solidFill",
    color: {
      spec: {
        type: "srgb",
        value: hexValue,
      },
    },
  };
}

function createLineFromHex(hexValue: string): Line {
  return {
    width: px(1),
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    fill: createSolidFillFromHex(hexValue),
    dash: "solid",
    join: "round",
  };
}
