/**
 * @file DOCX Patch Specification Types
 *
 * Types for patching existing DOCX files. Each patch describes a specific
 * modification to apply to the document.
 */

import type { BlockContentSpec, NumberingDefinitionSpec, StyleSpec, SectionSpec } from "./types";

// =============================================================================
// Patch Operations
// =============================================================================

type ContentAppendPatch = {
  readonly type: "content.append";
  readonly content: readonly BlockContentSpec[];
};

type ContentInsertPatch = {
  readonly type: "content.insert";
  readonly index: number;
  readonly content: readonly BlockContentSpec[];
};

type ContentDeletePatch = {
  readonly type: "content.delete";
  readonly index: number;
  readonly count?: number;
};

type ContentReplacePatch = {
  readonly type: "content.replace";
  readonly index: number;
  readonly count?: number;
  readonly content: readonly BlockContentSpec[];
};

type StylesAppendPatch = {
  readonly type: "styles.append";
  readonly styles: readonly StyleSpec[];
};

type NumberingAppendPatch = {
  readonly type: "numbering.append";
  readonly numbering: readonly NumberingDefinitionSpec[];
};

type SectionUpdatePatch = {
  readonly type: "section.update";
  readonly section: SectionSpec;
};

type TextReplacePatch = {
  readonly type: "text.replace";
  readonly search: string;
  readonly replace: string;
  readonly replaceAll?: boolean;
};

// =============================================================================
// Patch Union
// =============================================================================

export type DocxPatch =
  | ContentAppendPatch
  | ContentInsertPatch
  | ContentDeletePatch
  | ContentReplacePatch
  | StylesAppendPatch
  | NumberingAppendPatch
  | SectionUpdatePatch
  | TextReplacePatch;

// =============================================================================
// Top-level Patch Spec
// =============================================================================

export type DocxPatchSpec = {
  readonly source: string;
  readonly output: string;
  readonly patches: readonly DocxPatch[];
};

// =============================================================================
// Patch Result Data
// =============================================================================

export type DocxPatchData = {
  readonly sourcePath: string;
  readonly outputPath: string;
  readonly patchCount: number;
  readonly paragraphCount: number;
  readonly tableCount: number;
};
