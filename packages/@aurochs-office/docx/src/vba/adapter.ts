/**
 * @file Word VBA Host Adapter
 *
 * Implements the HostApi interface for Word (DOCX) documents.
 * Bridges the VBA runtime with the DOCX domain model.
 *
 * @see docs/plans/macro-runtime/02-layered-architecture.md
 */

import type { HostApi, HostObject, VbaRuntimeValue } from "@aurochs-office/vba";
import { VbaRuntimeError, createHostObject } from "@aurochs-office/vba";
import type { DocxDocument } from "../domain/document";
import type { DocxParagraph } from "../domain/paragraph";
import type { DocxRun } from "../domain/run";
import type {
  WordApplicationObject,
  WordDocumentObject,
  WordParagraphsObject,
  WordParagraphObject,
  WordRangeObject,
} from "./types";
import {
  isApplicationObject,
  isDocumentObject,
  isParagraphsObject,
  isParagraphObject,
  isRangeObject,
} from "./types";

// =============================================================================
// Host Object Factories
// =============================================================================

/**
 * Create an Application host object.
 */
function createApplicationObject(): WordApplicationObject {
  return createHostObject("Application", { _app: true as const }) as WordApplicationObject;
}

/**
 * Create a Document host object.
 */
function createDocumentObject(documentId: string): WordDocumentObject {
  return createHostObject("Document", { _documentId: documentId }) as WordDocumentObject;
}

/**
 * Create a Paragraphs collection host object.
 */
function createParagraphsObject(documentId: string): WordParagraphsObject {
  return createHostObject("Paragraphs", { _documentId: documentId }) as WordParagraphsObject;
}

/**
 * Create a Paragraph host object.
 */
function createParagraphObject(documentId: string, paragraphIndex: number): WordParagraphObject {
  return createHostObject("Paragraph", {
    _documentId: documentId,
    _paragraphIndex: paragraphIndex,
  }) as WordParagraphObject;
}

type RangeObjectParams = {
  readonly documentId: string;
  readonly start: number;
  readonly end: number;
};

/**
 * Create a Range host object.
 */
function createRangeObject(params: RangeObjectParams): WordRangeObject {
  return createHostObject("Range", {
    _documentId: params.documentId,
    _start: params.start,
    _end: params.end,
  }) as WordRangeObject;
}

// =============================================================================
// Text Extraction Helpers
// =============================================================================

/**
 * Extract text from a DocxRun.
 */
function extractRunText(run: DocxRun): string {
  const parts: string[] = [];
  for (const content of run.content) {
    switch (content.type) {
      case "text":
        parts.push(content.value);
        break;
      case "tab":
        parts.push("\t");
        break;
      case "break":
        if (content.breakType === "textWrapping") {
          parts.push("\n");
        }
        break;
      // Skip other content types (drawings, symbols, fieldChar, instrText)
    }
  }
  return parts.join("");
}

/**
 * Extract text from a paragraph.
 */
function extractParagraphText(paragraph: DocxParagraph): string {
  const parts: string[] = [];
  for (const content of paragraph.content) {
    if (content.type === "run") {
      parts.push(extractRunText(content));
    } else if (content.type === "hyperlink") {
      for (const run of content.content) {
        parts.push(extractRunText(run));
      }
    }
  }
  return parts.join("");
}

/**
 * Get all paragraphs from document body.
 */
function getParagraphs(document: DocxDocument): readonly DocxParagraph[] {
  const paragraphs: DocxParagraph[] = [];
  for (const block of document.body.content) {
    if (block.type === "paragraph") {
      paragraphs.push(block);
    }
  }
  return paragraphs;
}

type ParagraphPosition = { readonly start: number; readonly end: number };

/**
 * Calculate character positions for each paragraph.
 * Returns array of { start, end } positions for each paragraph.
 */
function calculateParagraphPositions(
  paragraphs: readonly DocxParagraph[]
): readonly ParagraphPosition[] {
  type Accumulator = { readonly positions: readonly ParagraphPosition[]; readonly currentPos: number };

  const initial: Accumulator = { positions: [], currentPos: 0 };

  const result = paragraphs.reduce<Accumulator>((acc, para) => {
    const text = extractParagraphText(para);
    const start = acc.currentPos;
    const end = acc.currentPos + text.length;
    const position: ParagraphPosition = { start, end };
    return {
      positions: [...acc.positions, position],
      // Add 1 for paragraph mark
      currentPos: end + 1,
    };
  }, initial);

  return result.positions;
}

// =============================================================================
// Word Host Adapter State
// =============================================================================

/**
 * State for the Word host adapter.
 */
export type WordAdapterState = {
  /** The document being operated on */
  readonly document: DocxDocument;
  /** Document ID (used for object references) */
  readonly documentId: string;
  /** Text mutations (start position -> text) */
  readonly mutations: Map<number, string>;
};

/**
 * Create initial adapter state.
 */
export function createWordAdapterState(document: DocxDocument, documentId = "default"): WordAdapterState {
  return {
    document,
    documentId,
    mutations: new Map(),
  };
}

// =============================================================================
// Word Host Adapter Factory
// =============================================================================

/**
 * Create a Word host adapter.
 *
 * @param state - Adapter state with document and mutations
 * @returns HostApi implementation for Word
 *
 * @example
 * ```typescript
 * const document = await parseDocxDocument(bytes);
 * const state = createWordAdapterState(document);
 * const hostApi = createWordHostAdapter(state);
 * const ctx = createVbaExecutionContext(hostApi);
 * ```
 */
export function createWordHostAdapter(state: WordAdapterState): HostApi {
  const { documentId } = state;

  // Application singleton
  const applicationObject = createApplicationObject();
  const thisDocumentObject = createDocumentObject(documentId);

  return {
    getGlobalObject(name: string): HostObject | undefined {
      const lowerName = name.toLowerCase();

      switch (lowerName) {
        case "application":
          return applicationObject;
        case "thisdocument":
        case "activedocument":
          return thisDocumentObject;
        case "paragraphs":
          return createParagraphsObject(documentId);
        case "selection":
          // Selection not fully implemented - return a range at start
          return createRangeObject({ documentId, start: 0, end: 0 });
        default:
          return undefined;
      }
    },

    getProperty(obj: HostObject, name: string): VbaRuntimeValue {
      const lowerName = name.toLowerCase();

      if (isApplicationObject(obj)) {
        return getApplicationProperty(state, lowerName);
      }

      if (isDocumentObject(obj)) {
        return getDocumentProperty(state, lowerName);
      }

      if (isParagraphsObject(obj)) {
        return getParagraphsProperty(state, lowerName);
      }

      if (isParagraphObject(obj)) {
        return getParagraphProperty(state, obj, lowerName);
      }

      if (isRangeObject(obj)) {
        return getRangeProperty(state, obj, lowerName);
      }

      throw new VbaRuntimeError(`Unknown property: ${name}`, "objectRequired");
    },

    setProperty(obj: HostObject, name: string, value: VbaRuntimeValue): void {
      const lowerName = name.toLowerCase();

      if (isRangeObject(obj)) {
        setRangeProperty({ state, obj, name: lowerName, value });
        return;
      }

      throw new VbaRuntimeError(`Cannot set property: ${name}`, "objectRequired");
    },

    callMethod(obj: HostObject, name: string, args: readonly VbaRuntimeValue[]): VbaRuntimeValue {
      const lowerName = name.toLowerCase();

      if (isDocumentObject(obj)) {
        return callDocumentMethod({ state, name: lowerName, args });
      }

      if (isParagraphsObject(obj)) {
        return callParagraphsMethod({ state, name: lowerName, args });
      }

      if (isRangeObject(obj)) {
        return callRangeMethod({ state, obj, name: lowerName, args });
      }

      throw new VbaRuntimeError(`Unknown method: ${name}`, "invalidProcedureCall");
    },

    getIndexed(obj: HostObject, indices: readonly VbaRuntimeValue[]): VbaRuntimeValue {
      // Paragraphs(index)
      if (isParagraphsObject(obj)) {
        return getParagraphsItem(state, indices[0]);
      }

      throw new VbaRuntimeError("Object does not support indexing", "typeMismatch");
    },

    setIndexed(_obj: HostObject, _indices: readonly VbaRuntimeValue[], _value: VbaRuntimeValue): void {
      throw new VbaRuntimeError("Indexed assignment not implemented", "notImplemented");
    },
  };
}

// =============================================================================
// Property Getters
// =============================================================================

function getApplicationProperty(state: WordAdapterState, name: string): VbaRuntimeValue {
  switch (name) {
    case "version":
      return "16.0"; // Word 2016+
    case "name":
      return "Microsoft Word";
    case "activedocument":
      return createDocumentObject(state.documentId);
    case "documents":
      // Documents collection not implemented - return active document
      return createDocumentObject(state.documentId);
    default:
      throw new VbaRuntimeError(`Unknown Application property: ${name}`, "invalidProcedureCall");
  }
}

function getDocumentProperty(state: WordAdapterState, name: string): VbaRuntimeValue {
  const { documentId } = state;

  switch (name) {
    case "name":
      return "Document";
    case "path":
      return "";
    case "fullname":
      return "Document";
    case "paragraphs":
      return createParagraphsObject(documentId);
    case "content":
      // Content property returns the main story range
      return getDocumentContentRange(state);
    case "range":
      // Range property (parameterless) returns entire document
      return getDocumentContentRange(state);
    case "characters":
      // Characters collection - simplified as range
      return getDocumentContentRange(state);
    case "words":
      // Words collection - simplified as range
      return getDocumentContentRange(state);
    case "sentences":
      // Sentences collection - simplified as range
      return getDocumentContentRange(state);
    default:
      throw new VbaRuntimeError(`Unknown Document property: ${name}`, "invalidProcedureCall");
  }
}

function getParagraphsProperty(state: WordAdapterState, name: string): VbaRuntimeValue {
  const paragraphs = getParagraphs(state.document);

  switch (name) {
    case "count":
      return paragraphs.length;
    case "first":
      if (paragraphs.length === 0) {
        throw new VbaRuntimeError("No paragraphs in document", "subscriptOutOfRange");
      }
      return createParagraphObject(state.documentId, 0);
    case "last":
      if (paragraphs.length === 0) {
        throw new VbaRuntimeError("No paragraphs in document", "subscriptOutOfRange");
      }
      return createParagraphObject(state.documentId, paragraphs.length - 1);
    default:
      throw new VbaRuntimeError(`Unknown Paragraphs property: ${name}`, "invalidProcedureCall");
  }
}

function getParagraphProperty(
  state: WordAdapterState,
  obj: WordParagraphObject,
  name: string
): VbaRuntimeValue {
  const paragraphs = getParagraphs(state.document);
  const paragraph = paragraphs[obj._paragraphIndex];

  if (!paragraph) {
    throw new VbaRuntimeError("Paragraph not found", "subscriptOutOfRange");
  }

  const positions = calculateParagraphPositions(paragraphs);
  const pos = positions[obj._paragraphIndex];

  switch (name) {
    case "range":
      return createRangeObject({
        documentId: obj._documentId,
        start: pos.start,
        end: pos.end,
      });
    case "style":
      return paragraph.properties?.pStyle ?? "";
    case "alignment":
      // Return numeric alignment value (VBA constants)
      return alignmentToVba(paragraph.properties?.jc);
    case "outlinelevel":
      return paragraph.properties?.outlineLvl ?? 10; // 10 = body text
    default:
      throw new VbaRuntimeError(`Unknown Paragraph property: ${name}`, "invalidProcedureCall");
  }
}

function getRangeProperty(
  state: WordAdapterState,
  obj: WordRangeObject,
  name: string
): VbaRuntimeValue {
  switch (name) {
    case "text":
      return getRangeText(state, obj);
    case "start":
      return obj._start;
    case "end":
      return obj._end;
    case "paragraphs":
      // Return paragraphs collection for this range
      return createParagraphsObject(obj._documentId);
    case "font":
      // Font object not fully implemented
      throw new VbaRuntimeError("Range.Font not implemented", "notImplemented");
    case "bold":
    case "italic":
    case "underline":
      // Character formatting not implemented
      throw new VbaRuntimeError(`Range.${name} not implemented`, "notImplemented");
    default:
      throw new VbaRuntimeError(`Unknown Range property: ${name}`, "invalidProcedureCall");
  }
}

// =============================================================================
// Property Setters
// =============================================================================

type SetRangePropertyParams = {
  readonly state: WordAdapterState;
  readonly obj: WordRangeObject;
  readonly name: string;
  readonly value: VbaRuntimeValue;
};

function setRangeProperty(params: SetRangePropertyParams): void {
  const { state, obj, name, value } = params;

  switch (name) {
    case "text":
      // Store text mutation
      state.mutations.set(obj._start, String(value ?? ""));
      return;
    default:
      throw new VbaRuntimeError(`Cannot set Range property: ${name}`, "invalidProcedureCall");
  }
}

// =============================================================================
// Method Callers
// =============================================================================

type CallDocumentMethodParams = {
  readonly state: WordAdapterState;
  readonly name: string;
  readonly args: readonly VbaRuntimeValue[];
};

function callDocumentMethod(params: CallDocumentMethodParams): VbaRuntimeValue {
  const { state, name, args } = params;

  switch (name) {
    case "range":
      // Document.Range(Start, End)
      return resolveDocumentRange(state, args);
    case "paragraphs":
      // Document.Paragraphs(Index)
      if (args.length > 0) {
        return getParagraphsItem(state, args[0]);
      }
      return createParagraphsObject(state.documentId);
    case "close":
    case "save":
    case "saveas":
      // Document operations not implemented
      throw new VbaRuntimeError(`Document.${name} not implemented`, "notImplemented");
    default:
      throw new VbaRuntimeError(`Unknown Document method: ${name}`, "invalidProcedureCall");
  }
}

type CallParagraphsMethodParams = {
  readonly state: WordAdapterState;
  readonly name: string;
  readonly args: readonly VbaRuntimeValue[];
};

function callParagraphsMethod(params: CallParagraphsMethodParams): VbaRuntimeValue {
  const { state, name, args } = params;

  switch (name) {
    case "item":
      return getParagraphsItem(state, args[0]);
    case "add":
      throw new VbaRuntimeError("Paragraphs.Add not implemented", "notImplemented");
    default:
      throw new VbaRuntimeError(`Unknown Paragraphs method: ${name}`, "invalidProcedureCall");
  }
}

type CallRangeMethodParams = {
  readonly state: WordAdapterState;
  readonly obj: WordRangeObject;
  readonly name: string;
  readonly args: readonly VbaRuntimeValue[];
};

function callRangeMethod(params: CallRangeMethodParams): VbaRuntimeValue {
  const { state, obj, name, args } = params;

  switch (name) {
    case "select":
      // Selection not implemented
      return undefined;
    case "copy":
    case "cut":
    case "paste":
    case "delete":
      throw new VbaRuntimeError(`Range.${name} not implemented`, "notImplemented");
    case "collapse":
      // Collapse range to start or end
      return collapseRange(obj, args);
    case "expand":
      // Expand range by unit
      throw new VbaRuntimeError("Range.Expand not implemented", "notImplemented");
    case "setrange":
      // SetRange(Start, End)
      return setRangeExtent(state, args);
    case "insertafter":
    case "insertbefore":
      // Insert text
      throw new VbaRuntimeError(`Range.${name} not implemented`, "notImplemented");
    default:
      throw new VbaRuntimeError(`Unknown Range method: ${name}`, "invalidProcedureCall");
  }
}

// =============================================================================
// Indexed Access
// =============================================================================

function getParagraphsItem(state: WordAdapterState, index: VbaRuntimeValue): WordParagraphObject {
  const paragraphs = getParagraphs(state.document);

  // Index by number (1-based in VBA)
  if (typeof index === "number") {
    const paragraphIndex = Math.floor(index) - 1;
    if (paragraphIndex < 0 || paragraphIndex >= paragraphs.length) {
      throw new VbaRuntimeError("Subscript out of range", "subscriptOutOfRange");
    }
    return createParagraphObject(state.documentId, paragraphIndex);
  }

  throw new VbaRuntimeError("Invalid paragraph index", "typeMismatch");
}

// =============================================================================
// Range Resolution Helpers
// =============================================================================

function getDocumentContentRange(state: WordAdapterState): WordRangeObject {
  const paragraphs = getParagraphs(state.document);
  if (paragraphs.length === 0) {
    return createRangeObject({ documentId: state.documentId, start: 0, end: 0 });
  }

  const positions = calculateParagraphPositions(paragraphs);
  const lastPos = positions[positions.length - 1];

  return createRangeObject({
    documentId: state.documentId,
    start: 0,
    end: lastPos.end,
  });
}

function resolveDocumentRange(
  state: WordAdapterState,
  args: readonly VbaRuntimeValue[]
): WordRangeObject {
  const start = typeof args[0] === "number" ? Math.floor(args[0]) : 0;
  const end = typeof args[1] === "number" ? Math.floor(args[1]) : start;

  return createRangeObject({
    documentId: state.documentId,
    start,
    end,
  });
}

function getRangeText(state: WordAdapterState, obj: WordRangeObject): string {
  const paragraphs = getParagraphs(state.document);

  // Build full document text (paragraphs separated by carriage return)
  const fullText = paragraphs.map((p) => extractParagraphText(p)).join("\r");

  // Extract range
  const start = Math.max(0, obj._start);
  const end = Math.min(fullText.length, obj._end);

  return fullText.substring(start, end);
}

function collapseRange(obj: WordRangeObject, args: readonly VbaRuntimeValue[]): WordRangeObject {
  // wdCollapseStart = 1, wdCollapseEnd = 0 (default)
  const direction = typeof args[0] === "number" ? args[0] : 0;
  const position = direction === 1 ? obj._start : obj._end;

  return createRangeObject({
    documentId: obj._documentId,
    start: position,
    end: position,
  });
}

function setRangeExtent(
  state: WordAdapterState,
  args: readonly VbaRuntimeValue[]
): WordRangeObject {
  const start = typeof args[0] === "number" ? Math.floor(args[0]) : 0;
  const end = typeof args[1] === "number" ? Math.floor(args[1]) : start;

  return createRangeObject({
    documentId: state.documentId,
    start,
    end,
  });
}

// =============================================================================
// Value Conversion Helpers
// =============================================================================

/**
 * Convert paragraph alignment to VBA constant.
 * wdAlignParagraphLeft = 0
 * wdAlignParagraphCenter = 1
 * wdAlignParagraphRight = 2
 * wdAlignParagraphJustify = 3
 */
function alignmentToVba(alignment: string | undefined): number {
  switch (alignment) {
    case "left":
    case "start":
      return 0;
    case "center":
      return 1;
    case "right":
    case "end":
      return 2;
    case "both":
    case "distribute":
      return 3;
    default:
      return 0; // Default to left
  }
}
