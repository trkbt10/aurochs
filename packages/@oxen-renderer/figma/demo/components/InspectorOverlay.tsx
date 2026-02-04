/**
 * @file SVG-based visual overlay rendering bounding boxes with type-colored borders
 */

import { useCallback, useMemo, useState } from "react";
import type { FigNode } from "@oxen/fig/types";
import type { FigMatrix } from "@oxen/fig/types";
import { guidToString, getNodeType } from "@oxen/fig/parser";
import { IDENTITY_MATRIX, multiplyMatrices, buildTransformAttr } from "../../src/svg/transform";
import { getCategoryColor } from "./inspector-constants";

type Props = {
  readonly frameNode: FigNode;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly highlightedNodeId: string | null;
  readonly hoveredNodeId: string | null;
  readonly onNodeHover: (nodeId: string | null) => void;
  readonly onNodeClick: (nodeId: string) => void;
  readonly showHiddenNodes: boolean;
};

type BoxInfo = {
  readonly nodeId: string;
  readonly nodeType: string;
  readonly nodeName: string;
  readonly transform: FigMatrix;
  readonly width: number;
  readonly height: number;
};

/**
 * Recursively collect bounding box info for all nodes in the tree
 */
function collectBoxes(
  node: FigNode,
  parentTransform: FigMatrix,
  showHiddenNodes: boolean,
): BoxInfo[] {
  if (!showHiddenNodes && node.visible === false) {
    return [];
  }

  const nodeType = getNodeType(node);
  const nodeData = node as Record<string, unknown>;
  const transform = nodeData.transform
    ? multiplyMatrices(parentTransform, nodeData.transform as FigMatrix)
    : parentTransform;

  const size = nodeData.size as { x?: number; y?: number } | undefined;
  const boxes: BoxInfo[] = [];

  if (size && (size.x ?? 0) > 0 && (size.y ?? 0) > 0) {
    boxes.push({
      nodeId: guidToString(node.guid),
      nodeType,
      nodeName: node.name ?? "(unnamed)",
      transform,
      width: size.x ?? 0,
      height: size.y ?? 0,
    });
  }

  for (const child of node.children ?? []) {
    boxes.push(...collectBoxes(child, transform, showHiddenNodes));
  }

  return boxes;
}

const overlayStyles = {
  container: {
    position: "relative" as const,
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  tooltip: {
    position: "absolute" as const,
    pointerEvents: "none" as const,
    background: "rgba(0, 0, 0, 0.85)",
    color: "#e2e8f0",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    whiteSpace: "nowrap" as const,
    zIndex: 10,
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  tooltipType: {
    fontSize: "10px",
    fontWeight: 600,
    padding: "1px 5px",
    borderRadius: "3px",
    color: "#fff",
  },
};

export function InspectorOverlay({
  frameNode,
  frameWidth,
  frameHeight,
  highlightedNodeId,
  hoveredNodeId,
  onNodeHover,
  onNodeClick,
  showHiddenNodes,
}: Props) {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const boxes = useMemo(
    () => collectBoxes(frameNode, IDENTITY_MATRIX, showHiddenNodes),
    [frameNode, showHiddenNodes],
  );

  const hoveredBox = useMemo(
    () => (hoveredNodeId ? boxes.find((b) => b.nodeId === hoveredNodeId) : null),
    [boxes, hoveredNodeId],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 });
  }, []);

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.target === e.currentTarget) {
        onNodeClick("");
      }
    },
    [onNodeClick],
  );

  return (
    <div style={overlayStyles.container} onMouseMove={handleMouseMove}>
      <svg
        viewBox={`0 0 ${frameWidth} ${frameHeight}`}
        style={{ width: "100%", maxHeight: "100%", background: "#1e1e2e" }}
        onClick={handleBackgroundClick}
      >
        {/* Frame background */}
        <rect
          x={0}
          y={0}
          width={frameWidth}
          height={frameHeight}
          fill="#2a2a3e"
          stroke="#444"
          strokeWidth={1}
        />

        {/* Node bounding boxes */}
        {boxes.map((box) => {
          const color = getCategoryColor(box.nodeType);
          const isHighlighted = box.nodeId === highlightedNodeId;
          const isHovered = box.nodeId === hoveredNodeId;

          return (
            <rect
              key={box.nodeId}
              x={0}
              y={0}
              width={box.width}
              height={box.height}
              transform={buildTransformAttr(box.transform) || undefined}
              fill={isHighlighted ? `${color}33` : isHovered ? `${color}22` : `${color}08`}
              stroke={color}
              strokeWidth={isHighlighted ? 2 : isHovered ? 1.5 : 0.5}
              style={{ cursor: "pointer", pointerEvents: "all" }}
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

      {/* Tooltip */}
      {hoveredBox && tooltipPos && (
        <div style={{ ...overlayStyles.tooltip, left: tooltipPos.x, top: tooltipPos.y }}>
          <span
            style={{
              ...overlayStyles.tooltipType,
              background: getCategoryColor(hoveredBox.nodeType),
            }}
          >
            {hoveredBox.nodeType}
          </span>
          <span>{hoveredBox.nodeName}</span>
          <span style={{ color: "#64748b" }}>
            {Math.round(hoveredBox.width)}x{Math.round(hoveredBox.height)}
          </span>
        </div>
      )}
    </div>
  );
}
