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
 * import { createElement, setChildren, conditionalAttrs } from "@aurochs-builder/core";
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

// XML building utilities
export {
  createElement,
  setChildren,
  addChild,
  addChildren,
  setAttrs,
  removeAttr,
  findChild,
  findChildren,
  updateChild,
  removeChildren,
  conditionalAttrs,
  conditionalChildren,
} from "./xml-builder";

// ZIP package utilities
export {
  readXmlPart,
  writeXmlPart,
  getRelationshipsPath,
  normalizePath,
  getPartDirectory,
  resolvePartPath,
  partExists,
  copyPart,
  removePart,
} from "./zip-utils";

// OOXML unit serialization
export { ooxmlBool, ooxmlAngleUnits, ooxmlPercent100k, ooxmlPercent1000, ooxmlEmu, EMU_PER_PIXEL } from "./ooxml-units";
