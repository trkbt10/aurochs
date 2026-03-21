/**
 * @file Patcher Core Module
 *
 * Core utilities for change detection and XML mutation.
 */

// Generic XML mutations: import from @aurochs/xml (SoT)

// PresentationML shape operations (PPTX-specific)
export {
  findShapeById,
  getShapeIds,
  replaceShapeById,
  removeShapeById,
} from "./shape-ops";

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
