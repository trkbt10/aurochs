/**
 * @file Legend displaying node category colors and labels.
 *
 * Reads categories from the provided NodeCategoryRegistry and renders
 * color swatches with labels. Categories are displayed in the order
 * specified by the `order` prop, or in registry insertion order by default.
 */

import type { NodeCategoryRegistry } from "@aurochs-ui/editor-core/inspector-types";

export type CategoryLegendProps = {
  /** Category registry providing colors and labels */
  readonly registry: NodeCategoryRegistry;
  /**
   * Category IDs to display, in order.
   * If omitted, all categories from the registry are displayed
   * in Object.keys() order.
   */
  readonly order?: readonly string[];
};

const legendStyles = {
  container: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap" as const,
    padding: "8px 12px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "8px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#94a3b8",
  },
  swatch: {
    width: "12px",
    height: "12px",
    borderRadius: "3px",
  },
};

/** Legend showing node category colors and labels. */
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
