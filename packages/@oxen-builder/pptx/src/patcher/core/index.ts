/**
 * @file Patcher Core Module
 *
 * Core utilities for change detection and XML mutation.
 */

// XML Mutator
export {
  // Attribute operations
  setAttribute,
  setAttributes,
  removeAttribute,
  // Child operations
  appendChild,
  prependChild,
  insertChildAt,
  removeChildAt,
  removeChildren,
  replaceChildAt,
  replaceChild,
  replaceChildByName,
  setChildren,
  updateChildByName,
  // Search operations
  findElement,
  findElements,
  findShapeById,
  getShapeIds,
  // Deep update operations
  updateAtPath,
  replaceShapeById,
  removeShapeById,
  // Document operations
  updateDocumentRoot,
  getDocumentRoot,
} from "./xml-mutator";

// XML element creation: import directly from "@/xml"

// Shape Differ
export type {
  ShapeChange,
  ShapeModified,
  ShapeAdded,
  ShapeRemoved,
  PropertyChange,
  TransformChange,
  FillChange,
  LineChange,
  TextBodyChange,
  EffectsChange,
  GeometryChange,
  BlipFillChange,
} from "./shape-differ";

export {
  detectSlideChanges,
  detectShapePropertyChanges,
  getShapeId,
  isTransformEqual,
  isFillEqual,
  isLineEqual,
  isTextBodyEqual,
  isEffectsEqual,
  isGeometryEqual,
  deepEqual,
  hasChanges,
  getChangesByType,
  getModifiedByProperty,
} from "./shape-differ";
