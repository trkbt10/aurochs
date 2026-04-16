/**
 * @file Domain model for fig design documents
 *
 * High-level, typed representation of .fig files.
 * Consumed by renderer, builder, and editor packages.
 */

// Branded ID types and helpers
export type { FigNodeId, FigPageId } from "./node-id";
export { guidToNodeId, guidToPageId, parseId, toNodeId, toPageId } from "./node-id";

// Document model
export type {
  FigDesignDocument,
  FigDesignNode,
  FigPage,
  AutoLayoutProps,
  LayoutConstraints,
  TextData,
  TextStyleOverride,
  SymbolOverride,
  MutableFigDesignNode,
  BlendMode,
  DerivedBaseline,
  DerivedGlyph,
  DerivedDecoration,
  DerivedTextData,
  ComponentPropertyType,
  ComponentPropertyValue,
  ComponentPropertyDef,
  ComponentPropertyNodeField,
  ComponentPropertyRef,
  ComponentPropertyAssignment,
  FigStyleRegistry,
  FigDesignBlob,
} from "./document";

export {
  DEFAULT_PAGE_BACKGROUND,
  EMPTY_FIG_STYLE_REGISTRY,
  isValidOverridePath,
  isSelfOverride,
  overridePathToIds,
  overrideEntries,
  applyOverrideToNode,
} from "./document";
