/** @file Type guard functions for diagram format types */
import type { TextBody } from "../text";
import type { ShapeStyle } from "../shape";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/** Type guard to check if a value is a valid TextBody */
export function isTextBody(value: unknown): value is TextBody {
  if (!isObject(value)) {
    return false;
  }
  if (!("bodyProperties" in value) || !isObject(value.bodyProperties)) {
    return false;
  }
  return "paragraphs" in value && Array.isArray(value.paragraphs);
}

/** Type guard to check if a value is a valid ShapeStyle */
export function isShapeStyle(value: unknown): value is ShapeStyle {
  if (!isObject(value)) {
    return false;
  }

  const maybe = value as Record<string, unknown>;
  const allowedFontIndices = new Set(["major", "minor", "none"]);

  const lineRef = maybe.lineReference;
  if (lineRef !== undefined) {
    if (!isObject(lineRef) || typeof lineRef.index !== "number") {
      return false;
    }
  }

  const fillRef = maybe.fillReference;
  if (fillRef !== undefined) {
    if (!isObject(fillRef) || typeof fillRef.index !== "number") {
      return false;
    }
  }

  const effectRef = maybe.effectReference;
  if (effectRef !== undefined) {
    if (!isObject(effectRef) || typeof effectRef.index !== "number") {
      return false;
    }
  }

  const fontRef = maybe.fontReference;
  if (fontRef !== undefined) {
    if (!isObject(fontRef) || typeof fontRef.index !== "string") {
      return false;
    }
    if (!allowedFontIndices.has(fontRef.index)) {
      return false;
    }
  }

  return true;
}
