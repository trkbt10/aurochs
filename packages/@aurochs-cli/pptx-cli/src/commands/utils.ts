/**
 * @file Shared utility functions for PPTX CLI commands
 */

import type { Shape } from "@aurochs-office/pptx/domain/shape";

/**
 * Parse a single range part (e.g., "1" or "1-3") into slide numbers.
 */
function parseRangePart(part: string, maxSlide: number, result: number[]): void {
  if (part.includes("-")) {
    const [startStr, endStr] = part.split("-").map((s) => s.trim());
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return;
    }
    for (let i = Math.max(1, start); i <= Math.min(maxSlide, end); i++) {
      if (!result.includes(i)) {
        result.push(i);
      }
    }
  } else {
    const num = parseInt(part, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= maxSlide && !result.includes(num)) {
      result.push(num);
    }
  }
}

/**
 * Parse slide range string into slide numbers.
 * Examples: "1", "1,3,5", "1-3", "1-3,5,7-9"
 */
export function parseSlideRange(range: string, maxSlide: number): number[] {
  const result: number[] = [];
  const parts = range.split(",").map((s) => s.trim());

  for (const part of parts) {
    parseRangePart(part, maxSlide, result);
  }

  return result.sort((a, b) => a - b);
}

/**
 * Get slide numbers from optional range string, or all slides if not specified.
 */
export function getSlideNumbers(slidesOption: string | undefined, count: number): number[] {
  if (slidesOption) {
    return parseSlideRange(slidesOption, count);
  }
  return Array.from({ length: count }, (_, i) => i + 1);
}

/**
 * Check if any shape (recursively including group children) matches a predicate.
 */
export function hasShapeOfType(shapes: readonly Shape[], check: (shape: Shape) => boolean): boolean {
  for (const shape of shapes) {
    if (check(shape)) {
      return true;
    }
    if (shape.type === "grpSp" && hasShapeOfType(shape.children, check)) {
      return true;
    }
  }
  return false;
}

/**
 * Recursively collect results from shapes matching a collector function.
 * Traverses into group shapes automatically.
 */
export function collectShapes<T>(shapes: readonly Shape[], collector: (shape: Shape) => T | undefined): T[] {
  const results: T[] = [];
  for (const shape of shapes) {
    const result = collector(shape);
    if (result !== undefined) {
      results.push(result);
    }
    if (shape.type === "grpSp") {
      results.push(...collectShapes(shape.children, collector));
    }
  }
  return results;
}
