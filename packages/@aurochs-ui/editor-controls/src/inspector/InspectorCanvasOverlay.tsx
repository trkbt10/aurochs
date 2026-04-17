/**
 * @file Inspector overlay designed to be composed INSIDE an EditorCanvas.
 *
 * Unlike InspectorView — which carries its own pan/zoom viewport — this
 * component renders raw SVG in the host canvas's page coordinate system
 * and delegates all viewport concerns (pan, zoom, rulers) to the host.
 *
 * Intended placement: directly inside EditorCanvas children, so the
 * overlay shares the same transform as the rendered document. Interaction
 * (hover / click) is reported via callbacks so the host editor can thread
 * it into its own selection or inspection state.
 */
import { useMemo } from "react";
import type {
  InspectorBoxInfo,
  NodeCategoryRegistry,
} from "@aurochs-ui/editor-core/inspector-types";
import {
  affineToSvgTransform,
  resolveNodeColor,
} from "@aurochs-ui/editor-core/inspector-types";

export type InspectorCanvasOverlayProps = {
  readonly boxes: readonly InspectorBoxInfo[];
  readonly registry: NodeCategoryRegistry;
  readonly highlightedNodeId?: string | null;
  readonly hoveredNodeId?: string | null;
  readonly onNodeHover?: (nodeId: string | null) => void;
  readonly onNodeClick?: (nodeId: string) => void;
  /**
   * Whether the overlay intercepts pointer events.
   *
   * When false (default), rects are non-interactive so the host editor's
   * own hit areas handle clicks. Set to true when the overlay is the
   * intended click target (e.g. a pure "inspect" mode with editing
   * suspended).
   */
  readonly interactive?: boolean;
};

const nonInteractiveRectStyle: React.CSSProperties = {
  pointerEvents: "none",
};

const interactiveRectStyle: React.CSSProperties = {
  cursor: "pointer",
  pointerEvents: "all",
};

/**
 * Pure SVG bounding-box overlay for the host EditorCanvas page space.
 *
 * Emits one `<g>` containing one `<rect>` per node. Stroke is drawn with
 * `vectorEffect="non-scaling-stroke"` so zoom does not thicken outlines.
 */
export function InspectorCanvasOverlay({
  boxes,
  registry,
  highlightedNodeId = null,
  hoveredNodeId = null,
  onNodeHover,
  onNodeClick,
  interactive = false,
}: InspectorCanvasOverlayProps) {
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const box of boxes) {
      if (!map.has(box.nodeType)) {
        map.set(box.nodeType, resolveNodeColor(registry, box.nodeType));
      }
    }
    return map;
  }, [boxes, registry]);

  const rectStyle = interactive ? interactiveRectStyle : nonInteractiveRectStyle;

  return (
    <g data-inspector-overlay="true">
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
            onPointerEnter={interactive ? () => onNodeHover?.(box.nodeId) : undefined}
            onPointerLeave={interactive ? () => onNodeHover?.(null) : undefined}
            onClick={
              interactive
                ? (e) => {
                    e.stopPropagation();
                    onNodeClick?.(box.nodeId);
                  }
                : undefined
            }
          />
        );
      })}
    </g>
  );
}
