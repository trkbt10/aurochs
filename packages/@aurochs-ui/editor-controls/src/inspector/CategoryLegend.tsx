/**
 * @file Legend displaying node category colors and labels.
 */

import type { NodeCategoryRegistry } from "@aurochs-ui/editor-core/inspector-types";
import { colorTokens, fontTokens, spacingTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";

export type CategoryLegendProps = {
  readonly registry: NodeCategoryRegistry;
  readonly order?: readonly string[];
};

const legendStyles = {
  container: {
    display: "flex",
    gap: spacingTokens.md,
    flexWrap: "wrap" as const,
    padding: `${spacingTokens.sm} ${spacingTokens.md}`,
    backgroundColor: colorTokens.background.tertiary,
    borderRadius: radiusTokens.md,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: spacingTokens["xs-plus"],
    fontSize: fontTokens.size.md,
    color: colorTokens.text.secondary,
  },
  swatch: {
    width: "12px",
    height: "12px",
    borderRadius: radiusTokens.xs,
  },
};

export function CategoryLegend({ registry, order }: CategoryLegendProps) {
  const categoryIds = order ?? Object.keys(registry.categories);

  return (
    <div style={legendStyles.container}>
      {categoryIds.map((id) => {
        const config = registry.categories[id];
        if (!config) return null;
        return (
          <div key={id} style={legendStyles.item}>
            <div style={{ ...legendStyles.swatch, background: config.color }} />
            <span>{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
