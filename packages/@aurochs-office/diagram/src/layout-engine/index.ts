/**
 * @file Diagram layout engine (format-agnostic)
 *
 * Exposes tree building, layout definition processing, algorithms, constraints,
 * and generation of format-agnostic `LayoutShapeResult` outputs.
 */

// Tree building
export {
  buildDiagramTree,
  traverseTree,
  countNodes,
  filterNodesByType,
  getContentNodes,
  // Axis traversal functions
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

// Layout definition processor
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

// Constraints
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

// Shape Generation (format-agnostic)
export {
  generateDiagramLayoutResults,
  type ShapeGenerationResult,
  type ShapeGenerationConfig,
} from "./shape-generator";

