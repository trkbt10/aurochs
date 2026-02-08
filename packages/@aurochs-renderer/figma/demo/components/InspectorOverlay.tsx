/**
 * @file Pure SVG overlay rendering bounding boxes with type-colored borders.
 * Rendered as a transparent layer to be stacked on top of the SVG preview.
 */

import { useMemo } from "react";
import type { FigNode } from "@aurochs/fig/types";
import type { FigMatrix } from "@aurochs/fig/types";
import { guidToString, getNodeType } from "@aurochs/fig/parser";
import { IDENTITY_MATRIX, multiplyMatrices, createTranslationMatrix } from "../../src/core/transform";
import { buildTransformAttr } from "../../src/svg/transform";
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

export type BoxInfo = {
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
function collectBoxes(node: FigNode, parentTransform: FigMatrix, showHiddenNodes: boolean): BoxInfo[] {
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
  const initialTransform = useMemo(() => getRootNormalizationTransform(frameNode), [frameNode]);
  const boxes = useMemo(
    () => collectBoxes(frameNode, initialTransform, showHiddenNodes),
    [frameNode, initialTransform, showHiddenNodes],
  );

  return (
    <svg
      viewBox={`0 0 ${frameWidth} ${frameHeight}`}
      width={frameWidth}
      height={frameHeight}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
      }}
    >
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
            vectorEffect="non-scaling-stroke"
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
  );
}

/**
 * Compute a transform that normalizes the root frame's canvas position to (0,0),
 * matching the normalizeRootTransform behavior in the SVG renderer.
 */
export function getRootNormalizationTransform(frameNode: FigNode): FigMatrix {
  const nodeData = frameNode as Record<string, unknown>;
  const transform = nodeData.transform as FigMatrix | undefined;
  if (!transform) return IDENTITY_MATRIX;
  const offsetX = transform.m02 ?? 0;
  const offsetY = transform.m12 ?? 0;
  if (offsetX === 0 && offsetY === 0) return IDENTITY_MATRIX;
  return createTranslationMatrix(-offsetX, -offsetY);
}

/** Re-export collectBoxes for use by InspectorView tooltip */
export { collectBoxes };
