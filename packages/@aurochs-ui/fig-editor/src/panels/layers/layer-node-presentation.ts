/**
 * @file Layer panel node presentation rules.
 */

import type { CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";

export type LayerNodeBadge = {
  readonly label: string;
  readonly color: string;
};

export type LayerNodePresentation = {
  readonly iconColor: string | undefined;
  readonly rowStyle: CSSProperties | undefined;
  readonly badge: LayerNodeBadge | undefined;
};

const INSTANCE_COLOR = "#9747FF";
const FRAME_COLOR = "#248EFF";
const SYMBOL_COLOR = "#10B981";

const INSTANCE_ROW_STYLE: CSSProperties = {
  backgroundColor: "rgba(151, 71, 255, 0.06)",
};

const FRAME_ROW_STYLE: CSSProperties = {
  backgroundColor: "rgba(36, 142, 255, 0.05)",
};

const COMPONENT_ROW_STYLE: CSSProperties = {
  backgroundColor: "rgba(151, 71, 255, 0.08)",
};

const SYMBOL_ROW_STYLE: CSSProperties = {
  backgroundColor: "rgba(16, 185, 129, 0.07)",
};

function createBadge(label: string, color: string): LayerNodeBadge {
  return { label, color };
}

function getStandaloneBadge(nodeType: FigDesignNode["type"]): LayerNodeBadge | undefined {
  switch (nodeType) {
    case "FRAME":
      return createBadge("Frame", FRAME_COLOR);
    case "COMPONENT":
      return createBadge("Component", INSTANCE_COLOR);
    case "COMPONENT_SET":
      return createBadge("Set", INSTANCE_COLOR);
    case "SYMBOL":
      return createBadge("Symbol", SYMBOL_COLOR);
    case "INSTANCE":
      return createBadge("Instance", INSTANCE_COLOR);
    default:
      return undefined;
  }
}

function getStandaloneRowStyle(nodeType: FigDesignNode["type"]): CSSProperties | undefined {
  switch (nodeType) {
    case "FRAME":
      return FRAME_ROW_STYLE;
    case "COMPONENT":
    case "COMPONENT_SET":
      return COMPONENT_ROW_STYLE;
    case "SYMBOL":
      return SYMBOL_ROW_STYLE;
    case "INSTANCE":
      return INSTANCE_ROW_STYLE;
    default:
      return undefined;
  }
}

/** Resolves icon tint, row background, and badge data for a layer tree row. */
export function resolveLayerNodePresentation(
  nodeType: FigDesignNode["type"],
  isInstanceContext: boolean,
): LayerNodePresentation {
  if (isInstanceContext) {
    return {
      iconColor: INSTANCE_COLOR,
      rowStyle: INSTANCE_ROW_STYLE,
      badge: createBadge("Inherited", INSTANCE_COLOR),
    };
  }
  return {
    iconColor: getStandaloneBadge(nodeType)?.color,
    rowStyle: getStandaloneRowStyle(nodeType),
    badge: getStandaloneBadge(nodeType),
  };
}
