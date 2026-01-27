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
  // Axis traversal functions (ECMA-376 21.4.7.6)
  getAncestors,
  getAncestorsOrSelf,
  getDescendants,
  getDescendantsOrSelf,
  getFollowingSiblings,
  getPrecedingSiblings,
  getSiblings,
  getRoot,
  calculateMaxDepth,
  type DiagramTreeNode,
  type DiagramTreeBuildResult,
  type DiagramPointType,
} from "./tree-builder";

// Layout types
export {
  createDefaultContext,
  createChildContext,
  createEmptyResult,
  getParam,
  getConstraint,
  getVariable,
  mergeBounds,
  type LayoutNode,
  type LayoutBounds,
  type LayoutResult,
  type LayoutContext,
  type LayoutAlgorithmFn,
  type LayoutAlgorithmRegistry,
  type CreateContextOptions,
  type DiagramVariableValue,
} from "./types";

// Layout definition processor (ECMA-376 21.4.2)
export {
  processLayoutDefinition,
  type LayoutProcessResult,
  type LayoutProcessOptions,
} from "./layout-processor";

// Layout algorithms
export {
  linearLayout,
  spaceLayout,
  hierChildLayout,
  cycleLayout,
  snakeLayout,
  pyramidLayout,
  compositeLayout,
  connectorLayout,
  textLayout,
  createAlgorithmRegistry,
  getLayoutAlgorithm,
} from "./algorithms";

// Constraints (ECMA-376 21.4.2.4)
export {
  resolveConstraint,
  applyConstraints,
  applyConstraintsToLayout,
  evaluateConstraintOperator,
  getSpacingConstraint,
  getWidthConstraint,
  getHeightConstraint,
  sortConstraintsByDependency,
  resolveAllConstraints,
  getNodesForRelationship,
  applyRules,
  createConstraintContext,
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
  createForEachChildContext,
  type ForEachContext,
  type ForEachResult,
  type ChooseResult,
} from "./iteration";

// Style and Color Resolution
// Note: resolveColor should be imported directly from domain/color/resolution
export {
  resolveNodeStyle,
  findStyleLabel,
  findColorStyleLabel,
  resolveFillFromList,
  resolveLineFromList,
  calculateColorIndex,
  createStyleContext,
  createEmptyColorContext,
  type ResolvedDiagramStyle,
  type StyleResolverContext,
} from "./style-resolver";

// Shape Generation
export {
  generateDiagramShapes,
  shapeToSvgAttributes,
  generateShapeSvg,
  type ShapeGenerationResult,
  type ShapeGenerationConfig,
} from "./shape-generator";
