/**
 * @file PowerPoint VBA Host Adapter
 *
 * Implements the HostApi interface for PowerPoint (PPTX) presentations.
 * Bridges the VBA runtime with the PPTX domain model.
 *
 * @see docs/plans/macro-runtime/02-layered-architecture.md
 */

import type { HostApi, HostObject, VbaRuntimeValue } from "@aurochs-office/vba";
import { VbaRuntimeError, createHostObject } from "@aurochs-office/vba";
import type { Slide } from "../domain/slide/types";
import type { Shape, SpShape } from "../domain/shape";
import type { TextBody, Paragraph, TextRun } from "../domain/text";
import type {
  PowerPointApplicationObject,
  PowerPointPresentationObject,
  PowerPointSlidesObject,
  PowerPointSlideObject,
  PowerPointShapesObject,
  PowerPointShapeObject,
  PowerPointTextFrameObject,
  PowerPointTextRangeObject,
} from "./types";
import {
  isApplicationObject,
  isPresentationObject,
  isSlidesObject,
  isSlideObject,
  isShapesObject,
  isShapeObject,
  isTextFrameObject,
  isTextRangeObject,
} from "./types";

// =============================================================================
// Host Object Factories
// =============================================================================

/**
 * Create an Application host object.
 */
function createApplicationObject(): PowerPointApplicationObject {
  return createHostObject("Application", { _app: true as const }) as PowerPointApplicationObject;
}

/**
 * Create a Presentation host object.
 */
function createPresentationObject(presentationId: string): PowerPointPresentationObject {
  return createHostObject("Presentation", {
    _presentationId: presentationId,
  }) as PowerPointPresentationObject;
}

/**
 * Create a Slides collection host object.
 */
function createSlidesObject(presentationId: string): PowerPointSlidesObject {
  return createHostObject("Slides", { _presentationId: presentationId }) as PowerPointSlidesObject;
}

/**
 * Create a Slide host object.
 */
function createSlideObject(presentationId: string, slideIndex: number): PowerPointSlideObject {
  return createHostObject("Slide", {
    _presentationId: presentationId,
    _slideIndex: slideIndex,
  }) as PowerPointSlideObject;
}

/**
 * Create a Shapes collection host object.
 */
function createShapesObject(presentationId: string, slideIndex: number): PowerPointShapesObject {
  return createHostObject("Shapes", {
    _presentationId: presentationId,
    _slideIndex: slideIndex,
  }) as PowerPointShapesObject;
}

type ShapeObjectParams = {
  readonly presentationId: string;
  readonly slideIndex: number;
  readonly shapeIndex: number;
};

/**
 * Create a Shape host object.
 */
function createShapeObject(params: ShapeObjectParams): PowerPointShapeObject {
  return createHostObject("Shape", {
    _presentationId: params.presentationId,
    _slideIndex: params.slideIndex,
    _shapeIndex: params.shapeIndex,
  }) as PowerPointShapeObject;
}

/**
 * Create a TextFrame host object.
 */
function createTextFrameObject(params: ShapeObjectParams): PowerPointTextFrameObject {
  return createHostObject("TextFrame", {
    _presentationId: params.presentationId,
    _slideIndex: params.slideIndex,
    _shapeIndex: params.shapeIndex,
  }) as PowerPointTextFrameObject;
}

type TextRangeParams = {
  readonly presentationId: string;
  readonly slideIndex: number;
  readonly shapeIndex: number;
  readonly start: number;
  readonly length: number;
};

/**
 * Create a TextRange host object.
 */
function createTextRangeObject(params: TextRangeParams): PowerPointTextRangeObject {
  return createHostObject("TextRange", {
    _presentationId: params.presentationId,
    _slideIndex: params.slideIndex,
    _shapeIndex: params.shapeIndex,
    _start: params.start,
    _length: params.length,
  }) as PowerPointTextRangeObject;
}

// =============================================================================
// Text Extraction Helpers
// =============================================================================

/**
 * Extract text from a TextRun.
 */
function extractTextRunContent(run: TextRun): string {
  switch (run.type) {
    case "text":
      return run.text;
    case "field":
      return run.text ?? "";
    case "break":
      return "\n";
    default:
      return "";
  }
}

/**
 * Extract text from a Paragraph.
 */
function extractParagraphText(paragraph: Paragraph): string {
  return paragraph.runs.map(extractTextRunContent).join("");
}

/**
 * Extract text from a TextBody.
 */
function extractTextBodyText(textBody: TextBody): string {
  return textBody.paragraphs.map(extractParagraphText).join("\n");
}

/**
 * Check if a shape is an SpShape (has textBody).
 */
function isSpShape(shape: Shape): shape is SpShape {
  return shape.type === "sp";
}

/**
 * Get text body from a shape if it has one.
 */
function getShapeTextBody(shape: Shape): TextBody | undefined {
  if (isSpShape(shape)) {
    return shape.textBody;
  }
  return undefined;
}

// =============================================================================
// PowerPoint Host Adapter State
// =============================================================================

/**
 * State for the PowerPoint host adapter.
 */
export type PowerPointAdapterState = {
  /** The slides being operated on */
  readonly slides: readonly Slide[];
  /** Presentation ID (used for object references) */
  readonly presentationId: string;
  /** Current active slide index */
  activeSlideIndex: number;
  /** Text mutations (slideIndex -> shapeIndex -> text) */
  readonly mutations: Map<number, Map<number, string>>;
};

/**
 * Create initial adapter state.
 */
export function createPowerPointAdapterState(
  slides: readonly Slide[],
  presentationId = "default"
): PowerPointAdapterState {
  return {
    slides,
    presentationId,
    activeSlideIndex: 0,
    mutations: new Map(),
  };
}

// =============================================================================
// PowerPoint Host Adapter Factory
// =============================================================================

/**
 * Create a PowerPoint host adapter.
 *
 * @param state - Adapter state with slides and mutations
 * @returns HostApi implementation for PowerPoint
 *
 * @example
 * ```typescript
 * const doc = await openPresentation(bytes);
 * const state = createPowerPointAdapterState(doc.slides);
 * const hostApi = createPowerPointHostAdapter(state);
 * const ctx = createVbaExecutionContext(hostApi);
 * ```
 */
export function createPowerPointHostAdapter(state: PowerPointAdapterState): HostApi {
  const { presentationId } = state;

  // Application singleton
  const applicationObject = createApplicationObject();
  const activePresentationObject = createPresentationObject(presentationId);

  return {
    getGlobalObject(name: string): HostObject | undefined {
      const lowerName = name.toLowerCase();

      switch (lowerName) {
        case "application":
          return applicationObject;
        case "activepresentation":
          return activePresentationObject;
        case "activewindow":
          // Window not fully implemented
          return undefined;
        case "activeslide":
          return createSlideObject(presentationId, state.activeSlideIndex);
        case "slides":
          return createSlidesObject(presentationId);
        default:
          return undefined;
      }
    },

    getProperty(obj: HostObject, name: string): VbaRuntimeValue {
      const lowerName = name.toLowerCase();

      if (isApplicationObject(obj)) {
        return getApplicationProperty(state, lowerName);
      }

      if (isPresentationObject(obj)) {
        return getPresentationProperty(state, lowerName);
      }

      if (isSlidesObject(obj)) {
        return getSlidesProperty(state, lowerName);
      }

      if (isSlideObject(obj)) {
        return getSlideProperty(state, obj, lowerName);
      }

      if (isShapesObject(obj)) {
        return getShapesProperty(state, obj, lowerName);
      }

      if (isShapeObject(obj)) {
        return getShapeProperty(state, obj, lowerName);
      }

      if (isTextFrameObject(obj)) {
        return getTextFrameProperty(state, obj, lowerName);
      }

      if (isTextRangeObject(obj)) {
        return getTextRangeProperty(state, obj, lowerName);
      }

      throw new VbaRuntimeError(`Unknown property: ${name}`, "objectRequired");
    },

    setProperty(obj: HostObject, name: string, value: VbaRuntimeValue): void {
      const lowerName = name.toLowerCase();

      if (isTextRangeObject(obj)) {
        setTextRangeProperty({ state, obj, name: lowerName, value });
        return;
      }

      throw new VbaRuntimeError(`Cannot set property: ${name}`, "objectRequired");
    },

    callMethod(obj: HostObject, name: string, args: readonly VbaRuntimeValue[]): VbaRuntimeValue {
      const lowerName = name.toLowerCase();

      if (isSlidesObject(obj)) {
        return callSlidesMethod({ state, name: lowerName, args });
      }

      if (isSlideObject(obj)) {
        return callSlideMethod({ state, obj, name: lowerName });
      }

      if (isShapesObject(obj)) {
        return callShapesMethod({ state, obj, name: lowerName, args });
      }

      throw new VbaRuntimeError(`Unknown method: ${name}`, "invalidProcedureCall");
    },

    getIndexed(obj: HostObject, indices: readonly VbaRuntimeValue[]): VbaRuntimeValue {
      // Slides(index)
      if (isSlidesObject(obj)) {
        return getSlidesItem(state, indices[0]);
      }

      // Shapes(index)
      if (isShapesObject(obj)) {
        return getShapesItem(state, obj, indices[0]);
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

function getApplicationProperty(state: PowerPointAdapterState, name: string): VbaRuntimeValue {
  switch (name) {
    case "version":
      return "16.0"; // PowerPoint 2016+
    case "name":
      return "Microsoft PowerPoint";
    case "activepresentation":
      return createPresentationObject(state.presentationId);
    case "presentations":
      // Presentations collection not implemented - return active
      return createPresentationObject(state.presentationId);
    default:
      throw new VbaRuntimeError(`Unknown Application property: ${name}`, "invalidProcedureCall");
  }
}

function getPresentationProperty(state: PowerPointAdapterState, name: string): VbaRuntimeValue {
  const { presentationId } = state;

  switch (name) {
    case "name":
      return "Presentation";
    case "path":
      return "";
    case "fullname":
      return "Presentation";
    case "slides":
      return createSlidesObject(presentationId);
    case "slidewidth":
      // Return default slide width in points
      return 720; // 10 inches * 72 points
    case "slideheight":
      // Return default slide height in points
      return 540; // 7.5 inches * 72 points
    default:
      throw new VbaRuntimeError(`Unknown Presentation property: ${name}`, "invalidProcedureCall");
  }
}

function getSlidesProperty(state: PowerPointAdapterState, name: string): VbaRuntimeValue {
  switch (name) {
    case "count":
      return state.slides.length;
    default:
      throw new VbaRuntimeError(`Unknown Slides property: ${name}`, "invalidProcedureCall");
  }
}

function getSlideProperty(
  state: PowerPointAdapterState,
  obj: PowerPointSlideObject,
  name: string
): VbaRuntimeValue {
  const slide = state.slides[obj._slideIndex];
  if (!slide) {
    throw new VbaRuntimeError("Slide not found", "subscriptOutOfRange");
  }

  switch (name) {
    case "slideindex":
      return obj._slideIndex + 1; // VBA is 1-based
    case "slidenumber":
      return obj._slideIndex + 1;
    case "shapes":
      return createShapesObject(obj._presentationId, obj._slideIndex);
    case "name":
      return `Slide${obj._slideIndex + 1}`;
    case "layout":
      // Layout type (simplified)
      return 1; // ppLayoutTitle
    default:
      throw new VbaRuntimeError(`Unknown Slide property: ${name}`, "invalidProcedureCall");
  }
}

function getShapesProperty(
  state: PowerPointAdapterState,
  obj: PowerPointShapesObject,
  name: string
): VbaRuntimeValue {
  const slide = state.slides[obj._slideIndex];
  if (!slide) {
    throw new VbaRuntimeError("Slide not found", "subscriptOutOfRange");
  }

  switch (name) {
    case "count":
      return slide.shapes.length;
    default:
      throw new VbaRuntimeError(`Unknown Shapes property: ${name}`, "invalidProcedureCall");
  }
}

/**
 * Get shape name from any shape type.
 */
function getShapeName(shape: Shape): string | undefined {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp":
    case "graphicFrame":
      return shape.nonVisual.name;
    case "grpSp":
      return shape.nonVisual.name;
    case "contentPart":
      return undefined;
  }
}

/**
 * Get shape hidden state from any shape type.
 */
function getShapeHidden(shape: Shape): boolean {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp":
    case "graphicFrame":
      return shape.nonVisual.hidden === true;
    case "grpSp":
      return shape.nonVisual.hidden === true;
    case "contentPart":
      return false;
  }
}

/**
 * Get shape transform from any shape type.
 */
function getShapeTransform(shape: Shape): { x: number; y: number; width: number; height: number } | undefined {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp":
      return shape.properties?.transform;
    case "graphicFrame":
      return shape.transform;
    case "grpSp":
      // GroupTransform has different structure but includes x, y, width, height
      return shape.properties?.transform;
    case "contentPart":
      return undefined;
  }
}

function getShapeProperty(
  state: PowerPointAdapterState,
  obj: PowerPointShapeObject,
  name: string
): VbaRuntimeValue {
  const slide = state.slides[obj._slideIndex];
  if (!slide) {
    throw new VbaRuntimeError("Slide not found", "subscriptOutOfRange");
  }

  const shape = slide.shapes[obj._shapeIndex];
  if (!shape) {
    throw new VbaRuntimeError("Shape not found", "subscriptOutOfRange");
  }

  const transform = getShapeTransform(shape);

  switch (name) {
    case "name":
      return getShapeName(shape) ?? `Shape${obj._shapeIndex + 1}`;
    case "id":
      return obj._shapeIndex + 1;
    case "left":
      return transform?.x ?? 0;
    case "top":
      return transform?.y ?? 0;
    case "width":
      return transform?.width ?? 0;
    case "height":
      return transform?.height ?? 0;
    case "visible":
      return !getShapeHidden(shape);
    case "textframe":
      return createTextFrameObject({
        presentationId: obj._presentationId,
        slideIndex: obj._slideIndex,
        shapeIndex: obj._shapeIndex,
      });
    case "hastext":
    case "hastextframe":
      return getShapeTextBody(shape) !== undefined;
    default:
      throw new VbaRuntimeError(`Unknown Shape property: ${name}`, "invalidProcedureCall");
  }
}

function getTextFrameProperty(
  state: PowerPointAdapterState,
  obj: PowerPointTextFrameObject,
  name: string
): VbaRuntimeValue {
  const slide = state.slides[obj._slideIndex];
  if (!slide) {
    throw new VbaRuntimeError("Slide not found", "subscriptOutOfRange");
  }

  const shape = slide.shapes[obj._shapeIndex];
  if (!shape) {
    throw new VbaRuntimeError("Shape not found", "subscriptOutOfRange");
  }

  const textBody = getShapeTextBody(shape);

  switch (name) {
    case "textrange": {
      if (!textBody) {
        throw new VbaRuntimeError("Shape has no text", "invalidProcedureCall");
      }
      const text = extractTextBodyText(textBody);
      return createTextRangeObject({
        presentationId: obj._presentationId,
        slideIndex: obj._slideIndex,
        shapeIndex: obj._shapeIndex,
        start: 0,
        length: text.length,
      });
    }
    case "hastext":
      return textBody !== undefined && textBody.paragraphs.length > 0;
    default:
      throw new VbaRuntimeError(`Unknown TextFrame property: ${name}`, "invalidProcedureCall");
  }
}

function getTextRangeProperty(
  state: PowerPointAdapterState,
  obj: PowerPointTextRangeObject,
  name: string
): VbaRuntimeValue {
  const slide = state.slides[obj._slideIndex];
  if (!slide) {
    throw new VbaRuntimeError("Slide not found", "subscriptOutOfRange");
  }

  const shape = slide.shapes[obj._shapeIndex];
  if (!shape) {
    throw new VbaRuntimeError("Shape not found", "subscriptOutOfRange");
  }

  const textBody = getShapeTextBody(shape);
  if (!textBody) {
    throw new VbaRuntimeError("Shape has no text", "invalidProcedureCall");
  }

  const fullText = extractTextBodyText(textBody);

  switch (name) {
    case "text":
      return fullText.substring(obj._start, obj._start + obj._length);
    case "length":
      return obj._length;
    case "start":
      return obj._start + 1; // VBA is 1-based
    default:
      throw new VbaRuntimeError(`Unknown TextRange property: ${name}`, "invalidProcedureCall");
  }
}

// =============================================================================
// Property Setters
// =============================================================================

type SetTextRangePropertyParams = {
  readonly state: PowerPointAdapterState;
  readonly obj: PowerPointTextRangeObject;
  readonly name: string;
  readonly value: VbaRuntimeValue;
};

function setTextRangeProperty(params: SetTextRangePropertyParams): void {
  const { state, obj, name, value } = params;

  switch (name) {
    case "text": {
      // Store text mutation
      const slideMutations = state.mutations.get(obj._slideIndex) ?? new Map();
      slideMutations.set(obj._shapeIndex, String(value ?? ""));
      state.mutations.set(obj._slideIndex, slideMutations);
      return;
    }
    default:
      throw new VbaRuntimeError(`Cannot set TextRange property: ${name}`, "invalidProcedureCall");
  }
}

// =============================================================================
// Method Callers
// =============================================================================

type CallSlidesMethodParams = {
  readonly state: PowerPointAdapterState;
  readonly name: string;
  readonly args: readonly VbaRuntimeValue[];
};

function callSlidesMethod(params: CallSlidesMethodParams): VbaRuntimeValue {
  const { state, name, args } = params;

  switch (name) {
    case "item":
      return getSlidesItem(state, args[0]);
    case "add":
    case "addslide":
      throw new VbaRuntimeError("Slides.Add not implemented", "notImplemented");
    default:
      throw new VbaRuntimeError(`Unknown Slides method: ${name}`, "invalidProcedureCall");
  }
}

type CallSlideMethodParams = {
  readonly state: PowerPointAdapterState;
  readonly obj: PowerPointSlideObject;
  readonly name: string;
};

function callSlideMethod(params: CallSlideMethodParams): VbaRuntimeValue {
  const { state, obj, name } = params;

  switch (name) {
    case "select":
      state.activeSlideIndex = obj._slideIndex;
      return undefined;
    case "delete":
      throw new VbaRuntimeError("Slide.Delete not implemented", "notImplemented");
    case "copy":
    case "cut":
      throw new VbaRuntimeError(`Slide.${name} not implemented`, "notImplemented");
    default:
      throw new VbaRuntimeError(`Unknown Slide method: ${name}`, "invalidProcedureCall");
  }
}

type CallShapesMethodParams = {
  readonly state: PowerPointAdapterState;
  readonly obj: PowerPointShapesObject;
  readonly name: string;
  readonly args: readonly VbaRuntimeValue[];
};

function callShapesMethod(params: CallShapesMethodParams): VbaRuntimeValue {
  const { state, obj, name, args } = params;

  switch (name) {
    case "item":
      return getShapesItem(state, obj, args[0]);
    case "addshape":
    case "addtextbox":
    case "addpicture":
      throw new VbaRuntimeError(`Shapes.${name} not implemented`, "notImplemented");
    default:
      throw new VbaRuntimeError(`Unknown Shapes method: ${name}`, "invalidProcedureCall");
  }
}

// =============================================================================
// Indexed Access
// =============================================================================

function getSlidesItem(state: PowerPointAdapterState, index: VbaRuntimeValue): PowerPointSlideObject {
  // Index by number (1-based in VBA)
  if (typeof index === "number") {
    const slideIndex = Math.floor(index) - 1;
    if (slideIndex < 0 || slideIndex >= state.slides.length) {
      throw new VbaRuntimeError("Subscript out of range", "subscriptOutOfRange");
    }
    return createSlideObject(state.presentationId, slideIndex);
  }

  throw new VbaRuntimeError("Invalid slide index", "typeMismatch");
}

function getShapesItem(
  state: PowerPointAdapterState,
  obj: PowerPointShapesObject,
  index: VbaRuntimeValue
): PowerPointShapeObject {
  const slide = state.slides[obj._slideIndex];
  if (!slide) {
    throw new VbaRuntimeError("Slide not found", "subscriptOutOfRange");
  }

  // Index by number (1-based in VBA)
  if (typeof index === "number") {
    const shapeIndex = Math.floor(index) - 1;
    if (shapeIndex < 0 || shapeIndex >= slide.shapes.length) {
      throw new VbaRuntimeError("Subscript out of range", "subscriptOutOfRange");
    }
    return createShapeObject({
      presentationId: obj._presentationId,
      slideIndex: obj._slideIndex,
      shapeIndex,
    });
  }

  // Index by name
  if (typeof index === "string") {
    const shapeIndex = slide.shapes.findIndex(
      (s) => getShapeName(s)?.toLowerCase() === index.toLowerCase()
    );
    if (shapeIndex === -1) {
      throw new VbaRuntimeError(`Shape not found: ${index}`, "subscriptOutOfRange");
    }
    return createShapeObject({
      presentationId: obj._presentationId,
      slideIndex: obj._slideIndex,
      shapeIndex,
    });
  }

  throw new VbaRuntimeError("Invalid shape index", "typeMismatch");
}
