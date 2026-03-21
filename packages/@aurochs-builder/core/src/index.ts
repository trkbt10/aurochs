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
 * import { createElement, conditionalAttrs } from "@aurochs-builder/core";
 * import { setChildren, updateDocumentRoot } from "@aurochs/xml";
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

// XML element construction + mutations: import from @aurochs/xml (SoT)

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

// OOXML unit serialization: import from @aurochs-office/ooxml/domain/ooxml-units (SoT)
