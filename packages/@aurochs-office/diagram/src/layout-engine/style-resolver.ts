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
} from "../domain/types";
import type { BaseFill, SolidFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import type { DiagramTreeNode } from "./tree-builder";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import { px } from "@aurochs-office/drawing-ml/domain/units";

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
  readonly fill?: BaseFill;
  /** Shape line/stroke */
  readonly line?: BaseLine;
  /** Effect fill */
  readonly effectFill?: BaseFill;
  /** Text fill - applied to text runs without their own fill */
  readonly textFill?: BaseFill;
  /** Text line/outline - applied to text runs without their own outline */
  readonly textLine?: BaseLine;
  /** Text effect fill */
  readonly textEffectFill?: BaseFill;
  /** Format-specific shape style reference from style definition */
  readonly shapeStyle?: unknown;
  /** Format-specific text properties from style definition (for text styling merge) */
  readonly textProperties?: unknown;
  /** Style label name used */
  readonly styleLabel?: string;
};

/**
 * Context for style resolution
 *
 * Uses ColorContext from @aurochs-office/drawing-ml/domain/color-context for theme color resolution.
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

export type ResolveNodeStyleOptions = {
  readonly node: DiagramTreeNode;
  readonly nodeIndex: number;
  readonly totalNodes: number;
  readonly context: StyleResolverContext;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get style label from style definition if styleLbl is defined
 */
function getStyleLabelIfPresent(
  styleLbl: string | undefined,
  styleDefinition: DiagramStyleDefinition | undefined,
): DiagramStyleLabel | undefined {
  if (!styleLbl) {
    return undefined;
  }
  return findStyleLabel(styleLbl, styleDefinition);
}

/**
 * Get color style label from color definition if styleLbl is defined
 */
function getColorStyleLabelIfPresent(
  styleLbl: string | undefined,
  colorDefinition: DiagramColorsDefinition | undefined,
): DiagramColorStyleLabel | undefined {
  if (!styleLbl) {
    return undefined;
  }
  return findColorStyleLabel(styleLbl, colorDefinition);
}

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
export function resolveNodeStyle(options: ResolveNodeStyleOptions): ResolvedDiagramStyle {
  const { node, nodeIndex, totalNodes, context } = options;
  const { styleDefinition, colorDefinition } = context;

  // Get style label from node's property set
  const styleLbl = node.propertySet?.presentationStyleLabel;

  // Find matching style label in style definition
  const styleLabel = getStyleLabelIfPresent(styleLbl, styleDefinition);

  // Find matching color style label in color definition
  const colorStyleLabel = getColorStyleLabelIfPresent(styleLbl, colorDefinition);

  // Resolve fills from color lists (undefined if not available)
  const fill = resolveFillFromList(colorStyleLabel?.fillColors, nodeIndex, totalNodes);

  const line = resolveLineFromList(colorStyleLabel?.lineColors, nodeIndex, totalNodes);

  const effectFill = resolveFillFromList(colorStyleLabel?.effectColors, nodeIndex, totalNodes);

  const textFill = resolveFillFromList(colorStyleLabel?.textFillColors, nodeIndex, totalNodes);

  const textLine = resolveLineFromList(colorStyleLabel?.textLineColors, nodeIndex, totalNodes);

  const textEffectFill = resolveFillFromList(colorStyleLabel?.textEffectColors, nodeIndex, totalNodes);

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
export function findStyleLabel(name: string, styleDefinition?: DiagramStyleDefinition): DiagramStyleLabel | undefined {
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
  colorDefinition?: DiagramColorsDefinition,
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
  totalNodes: number,
): BaseFill | undefined {
  if (!colorList || colorList.colors.length === 0) {
    return undefined;
  }

  const { colors, method } = colorList;
  const colorIndex = calculateColorIndex({
    nodeIndex,
    totalNodes,
    colorCount: colors.length,
    method,
  });
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
  totalNodes: number,
): BaseLine | undefined {
  const fill = resolveFillFromList(colorList, nodeIndex, totalNodes);

  if (!fill) {
    return undefined;
  }

  const line: BaseLine = {
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
export function calculateColorIndex(options: {
  readonly nodeIndex: number;
  readonly totalNodes: number;
  readonly colorCount: number;
  readonly method: DiagramClrAppMethod | undefined;
}): number {
  const { nodeIndex, totalNodes, colorCount, method } = options;
  if (colorCount === 0) {
    return 0;
  }

  switch (method) {
    case "cycle":
      // Cycle through colors repeatedly
      return nodeIndex % colorCount;

    case "repeat": {
      // Repeat each color for a segment of nodes
      const segmentSize = Math.ceil(totalNodes / colorCount);
      return Math.min(Math.floor(nodeIndex / segmentSize), colorCount - 1);
    }

    case "span": {
      // Span colors across all nodes (gradient-like)
      if (totalNodes <= 1) {
        return 0;
      }
      const ratio = nodeIndex / (totalNodes - 1);
      return Math.min(Math.floor(ratio * colorCount), colorCount - 1);
    }

    default:
      // Default to cycle per ECMA-376
      return nodeIndex % colorCount;
  }
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
  colorDefinition?: DiagramColorsDefinition,
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
