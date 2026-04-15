/**
 * @file Tooltip showing node metadata on hover.
 *
 * Positioned absolutely within its parent container (the viewport).
 * Displays node type (colored badge), name, and dimensions.
 */

import type { InspectorBoxInfo, NodeCategoryRegistry } from "@aurochs-ui/editor-core/inspector-types";
import { resolveNodeColor } from "@aurochs-ui/editor-core/inspector-types";

export type NodeTooltipProps = {
  /** The box info of the hovered node */
  readonly box: InspectorBoxInfo;
  /** Category registry for color resolution */
  readonly registry: NodeCategoryRegistry;
  /** Position relative to the viewport container (CSS pixels) */
  readonly x: number;
  /** Position relative to the viewport container (CSS pixels) */
  readonly y: number;
};

const tooltipStyles = {
  container: {
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
  typeBadge: {
    fontSize: "10px",
    fontWeight: 600,
    padding: "1px 5px",
    borderRadius: "3px",
    color: "#fff",
  },
  dims: {
    color: "#64748b",
  },
};

/** Tooltip displaying node type, name, and dimensions. */
export function NodeTooltip({ box, registry, x, y }: NodeTooltipProps) {
  const color = resolveNodeColor(registry, box.nodeType);

  return (
    <div style={{ ...tooltipStyles.container, left: x, top: y }}>
      <span style={{ ...tooltipStyles.typeBadge, background: color }}>
        {box.nodeType}
      </span>
      <span>{box.nodeName}</span>
      <span style={tooltipStyles.dims}>
        {Math.round(box.width)}x{Math.round(box.height)}
      </span>
    </div>
  );
}
