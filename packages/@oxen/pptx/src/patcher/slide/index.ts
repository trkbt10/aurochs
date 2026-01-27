/**
 * @file Slide Patcher Module
 *
 * Slide-level XML patching functionality.
 */

export { patchSlideXml, getSpTree, hasShapes } from "./slide-patcher";
export {
  addShapeToTree,
  removeShapeFromTree,
  batchUpdateShapeTree,
  type ShapeOperation,
} from "./shape-tree-patcher";
