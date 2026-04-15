/**
 * @file SVG overlay rendering bounding boxes with category-colored borders.
 *
 * This is a pure presentation component: it receives pre-collected boxes
 * and a category registry, then renders interactive SVG rects.
 * Format-specific logic (tree traversal, transform resolution) stays
 * in the consuming package (fig-editor, pptx-editor, etc.).
 */

import { useMemo } from "react";
import type { InspectorBoxInfo, NodeCategoryRegistry } from "@aurochs-ui/editor-core/inspector-types";
import { affineToSvgTransform, resolveNodeColor } from "@aurochs-ui/editor-core/inspector-types";

export type BoundingBoxOverlayProps = {
  /** Collected bounding boxes to render */
  readonly boxes: readonly InspectorBoxInfo[];
  /** Category registry for color resolution */
  readonly registry: NodeCategoryRegistry;
  /** Viewport width in content units */
  readonly viewportWidth: number;
  /** Viewport height in content units */
  readonly viewportHeight: number;
  /** Currently highlighted (selected) node ID */
  readonly highlightedNodeId: string | null;
  /** Currently hovered node ID */
  readonly hoveredNodeId: string | null;
  /** Called when a node is hovered (null = hover out) */
  readonly onNodeHover: (nodeId: string | null) => void;
  /** Called when a node is clicked */
  readonly onNodeClick: (nodeId: string) => void;
};

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  pointerEvents: "none",
};

const rectStyle: React.CSSProperties = {
  cursor: "pointer",
  pointerEvents: "all",
};

/**
 * SVG overlay that renders interactive bounding box rectangles for each node.
 *
 * Each rect is colored according to the node's category (resolved via the registry).
 * Highlighted and hovered states affect fill opacity and stroke width.
 */
export function BoundingBoxOverlay({
  boxes,
  registry,
  viewportWidth,
  viewportHeight,
  highlightedNodeId,
  hoveredNodeId,
  onNodeHover,
  onNodeClick,
}: BoundingBoxOverlayProps) {
  // Pre-resolve colors for all boxes to avoid per-render lookups
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const box of boxes) {
      if (!map.has(box.nodeType)) {
        map.set(box.nodeType, resolveNodeColor(registry, box.nodeType));
      }
    }
    return map;
  }, [boxes, registry]);

  return (
    <svg
      viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
      width={viewportWidth}
      height={viewportHeight}
      style={overlayStyle}
    >
      {boxes.map((box) => {
        const color = colorMap.get(box.nodeType) ?? registry.fallback.color;
        const isHighlighted = box.nodeId === highlightedNodeId;
        const isHovered = box.nodeId === hoveredNodeId;

        const fillOpacity = isHighlighted ? 0.2 : isHovered ? 0.13 : 0.03;
        const strokeWidth = isHighlighted ? 2 : isHovered ? 1.5 : 0.5;

        return (
          <rect
            key={box.nodeId}
            x={0}
            y={0}
            width={box.width}
            height={box.height}
            transform={affineToSvgTransform(box.transform)}
            fill={color}
            fillOpacity={fillOpacity}
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
            style={rectStyle}
            onMouseEnter={() => onNodeHover(box.nodeId)}
            onMouseLeave={() => onNodeHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick(box.nodeId);
            }}
          />
        );
      })}
    </svg>
  );
}
