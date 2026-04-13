/**
 * @file Document types — re-exported from @aurochs/fig/domain
 *
 * Domain types (FigDesignDocument, FigDesignNode, FigPage, etc.) live in
 * @aurochs/fig/domain. This module re-exports them for backward compatibility.
 */

export type {
  FigDesignDocument,
  FigDesignNode,
  FigPage,
  AutoLayoutProps,
  LayoutConstraints,
  TextData,
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
} from "@aurochs/fig/domain";

export { DEFAULT_PAGE_BACKGROUND } from "@aurochs/fig/domain";
