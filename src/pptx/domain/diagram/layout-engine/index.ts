/**
 * @file Diagram layout engine module
 *
 * Exports layout calculation functions for DiagramML rendering.
 * Transforms data model into positioned, sized shapes.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 */

// Tree building
export {
  buildDiagramTree,
  traverseTree,
  countNodes,
  filterNodesByType,
  getContentNodes,
  getNodeText,
  type DiagramTreeNode,
  type DiagramTreeBuildResult,
  type DiagramPointType,
} from "./tree-builder";

// Layout types
export {
  createDefaultContext,
  createEmptyResult,
  getParam,
  mergeBounds,
  type LayoutNode,
  type LayoutBounds,
  type LayoutResult,
  type LayoutContext,
  type LayoutAlgorithmFn,
  type LayoutAlgorithmRegistry,
} from "./types";

// Layout algorithms
export {
  linearLayout,
  spaceLayout,
  hierChildLayout,
  hierRootLayout,
  cycleLayout,
  snakeLayout,
  pyramidLayout,
  compositeLayout,
  connectorLayout,
  textLayout,
  createAlgorithmRegistry,
  getLayoutAlgorithm,
} from "./algorithms";

// Constraints
export {
  resolveConstraint,
  applyConstraints,
  applyConstraintsToLayout,
  evaluateConstraintOperator,
  getSpacingConstraint,
  getWidthConstraint,
  getHeightConstraint,
  type ResolvedConstraint,
  type ConstraintContext,
  type ConstraintResult,
} from "./constraints";

// Iteration (ForEach / Choose)
export {
  processForEach,
  selectNodesByAxis,
  filterNodesByPointType,
  processChoose,
  evaluateIf,
  evaluateFunction,
  evaluateOperator,
  createForEachContext,
  createChildContext,
  type ForEachContext,
  type ForEachResult,
  type ChooseResult,
} from "./iteration";

// Style and Color Resolution
export {
  resolveNodeStyle,
  findStyleLabel,
  findColorStyleLabel,
  resolveColorFromList,
  calculateColorIndex,
  resolveColor,
  resolveSchemeColor,
  applyColorTransforms,
  createDefaultStyleContext,
  type ResolvedDiagramStyle,
  type StyleResolverContext,
  type DefaultColors,
} from "./style-resolver";

// Shape Generation
export {
  generateDiagramShapes,
  flattenShapes,
  shapeToSvgAttributes,
  generateShapeSvg,
  spShapeToGeneratedShape,
  type GeneratedShape,
  type ShapeGenerationResult,
  type ShapeGenerationConfig,
} from "./shape-generator";
