/**
 * @file Fig-specific inspector view component.
 *
 * Wraps the generic InspectorView from editor-controls with Fig-specific
 * data collection (FigNode → InspectorBoxInfo/InspectorTreeNode) and
 * the Fig category registry.
 *
 * Usage:
 * ```tsx
 * <FigInspectorView
 *   frameNode={frame}
 *   frameWidth={800}
 *   frameHeight={600}
 *   showHiddenNodes={false}
 *   svgHtml={renderedSvg}
 *   isRendering={false}
 * />
 * ```
 */

import { useMemo } from "react";
import type { FigNode } from "@aurochs/fig/types";
import { InspectorView } from "@aurochs-ui/editor-controls/inspector";
import { FIG_NODE_CATEGORY_REGISTRY, FIG_LEGEND_ORDER } from "./fig-node-categories";
import { collectFigBoxes, figNodeToInspectorTree, getRootNormalizationTransform } from "./fig-inspector-adapter";

export type FigInspectorViewProps = {
  /** The root frame node to inspect */
  readonly frameNode: FigNode;
  /** Frame width in logical units */
  readonly frameWidth: number;
  /** Frame height in logical units */
  readonly frameHeight: number;
  /** Whether to show hidden (invisible) nodes */
  readonly showHiddenNodes: boolean;
  /** Rendered SVG HTML string */
  readonly svgHtml: string;
  /** Whether the SVG is currently rendering */
  readonly isRendering?: boolean;
  /** Width of the tree panel in CSS pixels. Default: 380 */
  readonly treePanelWidth?: number;
};

const svgContainerStyle: React.CSSProperties = {
  display: "block",
};

/**
 * Fig-specific inspector view.
 *
 * Converts a FigNode tree to format-agnostic inspector data and renders
 * the generic InspectorView with the Fig category registry.
 */
export function FigInspectorView({
  frameNode,
  frameWidth,
  frameHeight,
  showHiddenNodes,
  svgHtml,
  isRendering = false,
  treePanelWidth,
}: FigInspectorViewProps) {
  // Convert FigNode tree to inspector data structures
  const initialTransform = useMemo(
    () => getRootNormalizationTransform(frameNode),
    [frameNode],
  );

  const boxes = useMemo(
    () => collectFigBoxes(frameNode, initialTransform, showHiddenNodes),
    [frameNode, initialTransform, showHiddenNodes],
  );

  const treeRoot = useMemo(
    () => figNodeToInspectorTree(frameNode),
    [frameNode],
  );

  return (
    <InspectorView
      registry={FIG_NODE_CATEGORY_REGISTRY}
      boxes={boxes}
      treeRoot={treeRoot}
      contentWidth={frameWidth}
      contentHeight={frameHeight}
      showHiddenNodes={showHiddenNodes}
      isRendering={isRendering}
      legendOrder={FIG_LEGEND_ORDER}
      treePanelWidth={treePanelWidth}
    >
      <div
        style={svgContainerStyle}
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />
    </InspectorView>
  );
}
