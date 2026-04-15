/**
 * @file Inspector components for node structure visualization.
 *
 * Format-agnostic components that display node bounding boxes, category-colored
 * tree views, and tooltips. Each format (Fig, PPTX, etc.) provides a
 * NodeCategoryRegistry via DI to customize colors and labels.
 *
 * Components can be used independently or composed via InspectorView.
 */

export { BoundingBoxOverlay, type BoundingBoxOverlayProps } from "./BoundingBoxOverlay";
export { InspectorTreePanel, type InspectorTreePanelProps } from "./InspectorTreePanel";
export { CategoryLegend, type CategoryLegendProps } from "./CategoryLegend";
export { NodeTooltip, type NodeTooltipProps } from "./NodeTooltip";
export { InspectorView, type InspectorViewProps } from "./InspectorView";
