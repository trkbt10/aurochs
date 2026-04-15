/**
 * @file Tooltip showing node metadata on hover.
 */

import type { InspectorBoxInfo, NodeCategoryRegistry } from "@aurochs-ui/editor-core/inspector-types";
import { resolveNodeColor } from "@aurochs-ui/editor-core/inspector-types";
import { colorTokens, fontTokens, spacingTokens, radiusTokens, shadowTokens } from "@aurochs-ui/ui-components/design-tokens";

export type NodeTooltipProps = {
  readonly box: InspectorBoxInfo;
  readonly registry: NodeCategoryRegistry;
  readonly x: number;
  readonly y: number;
};

const tooltipStyles = {
  container: {
    position: "absolute" as const,
    pointerEvents: "none" as const,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    color: colorTokens.text.inverse,
    padding: `${spacingTokens["xs-plus"]} ${spacingTokens.sm}`,
    borderRadius: radiusTokens.md,
    fontSize: fontTokens.size.md,
    whiteSpace: "nowrap" as const,
    zIndex: 10,
    display: "flex",
    gap: spacingTokens.sm,
    alignItems: "center",
    boxShadow: shadowTokens.md,
  },
  typeBadge: {
    fontSize: fontTokens.size.xs,
    fontWeight: fontTokens.weight.semibold,
    padding: `1px ${spacingTokens.xs}`,
    borderRadius: radiusTokens.xs,
    color: colorTokens.text.inverse,
  },
  dims: {
    opacity: 0.6,
  },
};

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
