/**
 * @file PowerPoint VBA Host Object Type Definitions
 *
 * Defines the host object types for PowerPoint VBA runtime integration.
 * These types represent the PowerPoint object model as seen from VBA.
 *
 * @see docs/plans/macro-runtime/02-layered-architecture.md
 */

import type { HostObject } from "@aurochs-office/vba";

// =============================================================================
// Base Type
// =============================================================================

/**
 * Base type for PowerPoint host objects with specific host type.
 */
type PowerPointHostObjectBase<T extends string> = HostObject & {
  readonly hostType: T;
};

// =============================================================================
// Application Object
// =============================================================================

/**
 * PowerPoint Application object.
 *
 * Represents the PowerPoint application instance.
 */
export type PowerPointApplicationObject = PowerPointHostObjectBase<"Application"> & {
  readonly _app: true;
};

/**
 * Type guard for Application object.
 */
export function isApplicationObject(obj: HostObject): obj is PowerPointApplicationObject {
  return obj.hostType === "Application";
}

// =============================================================================
// Presentation Object
// =============================================================================

/**
 * PowerPoint Presentation object.
 *
 * Represents a PowerPoint presentation.
 */
export type PowerPointPresentationObject = PowerPointHostObjectBase<"Presentation"> & {
  readonly _presentationId: string;
};

/**
 * Type guard for Presentation object.
 */
export function isPresentationObject(obj: HostObject): obj is PowerPointPresentationObject {
  return obj.hostType === "Presentation";
}

// =============================================================================
// Slides Collection Object
// =============================================================================

/**
 * PowerPoint Slides collection object.
 *
 * Represents the collection of slides in a presentation.
 */
export type PowerPointSlidesObject = PowerPointHostObjectBase<"Slides"> & {
  readonly _presentationId: string;
};

/**
 * Type guard for Slides object.
 */
export function isSlidesObject(obj: HostObject): obj is PowerPointSlidesObject {
  return obj.hostType === "Slides";
}

// =============================================================================
// Slide Object
// =============================================================================

/**
 * PowerPoint Slide object.
 *
 * Represents a single slide in the presentation.
 */
export type PowerPointSlideObject = PowerPointHostObjectBase<"Slide"> & {
  readonly _presentationId: string;
  readonly _slideIndex: number;
};

/**
 * Type guard for Slide object.
 */
export function isSlideObject(obj: HostObject): obj is PowerPointSlideObject {
  return obj.hostType === "Slide";
}

// =============================================================================
// Shapes Collection Object
// =============================================================================

/**
 * PowerPoint Shapes collection object.
 *
 * Represents the collection of shapes on a slide.
 */
export type PowerPointShapesObject = PowerPointHostObjectBase<"Shapes"> & {
  readonly _presentationId: string;
  readonly _slideIndex: number;
};

/**
 * Type guard for Shapes object.
 */
export function isShapesObject(obj: HostObject): obj is PowerPointShapesObject {
  return obj.hostType === "Shapes";
}

// =============================================================================
// Shape Object
// =============================================================================

/**
 * PowerPoint Shape object.
 *
 * Represents a single shape on a slide.
 */
export type PowerPointShapeObject = PowerPointHostObjectBase<"Shape"> & {
  readonly _presentationId: string;
  readonly _slideIndex: number;
  readonly _shapeIndex: number;
};

/**
 * Type guard for Shape object.
 */
export function isShapeObject(obj: HostObject): obj is PowerPointShapeObject {
  return obj.hostType === "Shape";
}

// =============================================================================
// TextRange Object
// =============================================================================

/**
 * PowerPoint TextRange object.
 *
 * Represents text content within a shape.
 */
export type PowerPointTextRangeObject = PowerPointHostObjectBase<"TextRange"> & {
  readonly _presentationId: string;
  readonly _slideIndex: number;
  readonly _shapeIndex: number;
  readonly _start: number;
  readonly _length: number;
};

/**
 * Type guard for TextRange object.
 */
export function isTextRangeObject(obj: HostObject): obj is PowerPointTextRangeObject {
  return obj.hostType === "TextRange";
}

// =============================================================================
// TextFrame Object
// =============================================================================

/**
 * PowerPoint TextFrame object.
 *
 * Represents the text frame of a shape.
 */
export type PowerPointTextFrameObject = PowerPointHostObjectBase<"TextFrame"> & {
  readonly _presentationId: string;
  readonly _slideIndex: number;
  readonly _shapeIndex: number;
};

/**
 * Type guard for TextFrame object.
 */
export function isTextFrameObject(obj: HostObject): obj is PowerPointTextFrameObject {
  return obj.hostType === "TextFrame";
}

// =============================================================================
// Union Types
// =============================================================================

/**
 * Union of all PowerPoint host object types.
 */
export type PowerPointHostObject =
  | PowerPointApplicationObject
  | PowerPointPresentationObject
  | PowerPointSlidesObject
  | PowerPointSlideObject
  | PowerPointShapesObject
  | PowerPointShapeObject
  | PowerPointTextRangeObject
  | PowerPointTextFrameObject;
