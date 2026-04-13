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
} from "./document";

export { DEFAULT_PAGE_BACKGROUND } from "./document";
