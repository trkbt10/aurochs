/**
 * @file Core utilities for unified builder architecture
 *
 * This package provides shared types and utilities used across all format-specific
 * builders (PPTX, DOCX, XLSX). It establishes common patterns for:
 * - Build results and contexts
 * - XML element construction
 * - ZIP package operations
 *
 * @example
 * ```typescript
 * import { createElement, setChildren, conditionalAttrs, updateDocumentRoot } from "@aurochs-builder/core";
 * import type { BuildResult, BuildContext } from "@aurochs-builder/core";
 * ```
 */

// Types
export type {
  // Build result types
  ResourceEntry,
  RelationshipEntry,
  BuildResult,
  // Context types
  BaseBuildContext,
  BuildContext,
  // Builder function types
  SyncBuilder,
  AsyncBuilder,
  // Add elements options
  AddElementsSyncOptions,
  AddElementsAsyncOptions,
  AddElementsResult,
} from "./types";

// XML element construction
export {
  createElement,
  conditionalAttrs,
  conditionalChildren,
} from "./xml-builder";

// XML immutable update operations (SoT for all builders)
export {
  setAttribute,
  setAttributes,
  removeAttribute,
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
  findElement,
  findElements,
  updateAtPath,
  updateDocumentRoot,
  getDocumentRoot,
} from "./xml-mutator";

// ZIP package utilities
export {
  readXmlPart,
  readXmlPartOrThrow,
  writeXmlPart,
  normalizePath,
  getPartDirectory,
  resolvePartPath,
  partExists,
  copyPart,
  removePart,
} from "./zip-utils";

// OOXML unit serialization
export { ooxmlBool, ooxmlAngleUnits, ooxmlPercent100k, ooxmlPercent1000, ooxmlEmu, EMU_PER_PIXEL } from "./ooxml-units";
