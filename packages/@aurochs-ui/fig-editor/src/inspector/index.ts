/**
 * @file Fig-specific inspector utilities.
 *
 * Provides the NodeCategoryRegistry for Figma node types and adapter functions
 * to convert FigNode trees to format-agnostic inspector data structures.
 */

export { FIG_NODE_CATEGORY_REGISTRY, FIG_LEGEND_ORDER } from "./fig-node-categories";
export {
  getRootNormalizationTransform,
  collectFigBoxes,
  figNodeToInspectorTree,
  designNodeToInspectorTree,
} from "./fig-inspector-adapter";
export { FigInspectorView, type FigInspectorViewProps } from "./FigInspectorView";
