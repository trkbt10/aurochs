/**
 * @file Animation interpolation utilities
 *
 * Provides keyframe interpolation and attribute value processing
 * for PPTX animation playback.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import type {
  AnimateBehavior,
  CalcMode,
  Keyframe,
  AnimateValue,
} from "@oxen-office/pptx/domain/animation";
import { lerp } from "./engine";

// =============================================================================
// Types
// =============================================================================

/**
 * Parsed numeric value with optional unit
 */
export type ParsedValue = {
  readonly value: number;
  readonly unit: string;
};

/**
 * Interpolated keyframe result
 */
export type InterpolatedValue = {
  readonly value: number;
  readonly unit: string;
};

// =============================================================================
// Value Parsing
// =============================================================================

/**
 * Parse a PPTX animation value to numeric value with unit.
 *
 * PPTX uses various formats:
 * - "0.5" -> number
 * - "#ppt_x" -> reference to current position
 * - "ppt_x+0.1" -> relative offset
 * - "100%" -> percentage
 * - "50px" -> pixels
 *
 * @param value - Animation value from PPTX
 * @returns Parsed numeric value with unit, or undefined if not parseable
 */
export function parseAnimateValue(
  value: AnimateValue | undefined
): ParsedValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "number") {
    return { value, unit: "" };
  }

  if (typeof value === "boolean") {
    return { value: value ? 1 : 0, unit: "" };
  }

  if (typeof value === "string") {
    // Handle percentage
    const percentMatch = value.match(/^([-\d.]+)%$/);
    if (percentMatch) {
      return { value: parseFloat(percentMatch[1]), unit: "%" };
    }

    // Handle pixels
    const pxMatch = value.match(/^([-\d.]+)px$/);
    if (pxMatch) {
      return { value: parseFloat(pxMatch[1]), unit: "px" };
    }

    // Handle EMUs (English Metric Units)
    const emuMatch = value.match(/^([-\d.]+)emu$/i);
    if (emuMatch) {
      // Convert EMU to pixels (1 inch = 914400 EMU, 96 DPI)
      const emuValue = parseFloat(emuMatch[1]);
      return { value: emuValue / 914400 * 96, unit: "px" };
    }

    // Handle degrees
    const degMatch = value.match(/^([-\d.]+)deg$/);
    if (degMatch) {
      return { value: parseFloat(degMatch[1]), unit: "deg" };
    }

    // Handle plain number string
    const numMatch = value.match(/^([-\d.]+)$/);
    if (numMatch) {
      return { value: parseFloat(numMatch[1]), unit: "" };
    }

    // Handle ppt_x/ppt_y coordinate expressions
    // These are percentages of the slide size (0-1 range)
    const pptCoordMatch = value.match(/^([-\d.]+)\s*(?:x|y)?$/i);
    if (pptCoordMatch) {
      return { value: parseFloat(pptCoordMatch[1]), unit: "" };
    }
  }

  return undefined;
}

/**
 * Parse coordinate value from "ppt_x" or "ppt_y" style values.
 * These are typically 0-1 range representing percentage of slide size.
 *
 * @param value - Coordinate value string or number
 * @param slideSize - Slide size in pixels for the axis
 * @returns Pixel value
 */
export function parseCoordinateValue(
  value: AnimateValue | undefined,
  slideSize: number
): number | undefined {
  const parsed = parseAnimateValue(value);
  if (!parsed) {return undefined;}

  // If already in pixels, return as-is
  if (parsed.unit === "px") {
    return parsed.value;
  }

  // If percentage, convert based on slide size
  if (parsed.unit === "%" || parsed.unit === "") {
    // PPTX coordinates are typically 0-1 range
    // Values > 1 or < 0 are allowed for off-slide animations
    return parsed.value * slideSize;
  }

  return parsed.value;
}

// =============================================================================
// Keyframe Interpolation
// =============================================================================

/**
 * Interpolate keyframes at a given progress.
 *
 * @param keyframes - Array of keyframes with time (0-100) and value
 * @param progress - Animation progress (0-1)
 * @param calcMode - Calculation mode (discrete, linear, formula)
 * @returns Interpolated value
 */
export function interpolateKeyframes(
  keyframes: readonly Keyframe[],
  progress: number,
  calcMode: CalcMode = "linear"
): AnimateValue | undefined {
  if (!keyframes || keyframes.length === 0) {
    return undefined;
  }

  // Convert progress to time percentage (0-100)
  const timePercent = progress * 100;

  // Single keyframe - return its value
  if (keyframes.length === 1) {
    return keyframes[0].value;
  }

  // Find surrounding keyframes using reduce
  const initialPrev = keyframes[0];
  const initialNext = keyframes[keyframes.length - 1];

  const { prevKeyframe, nextKeyframe } = keyframes.reduce(
    (acc, kf) => {
      const kfTime = typeof kf.time === "number" ? kf.time : 0;
      if (kfTime <= timePercent) {
        acc.prevKeyframe = kf;
      }
      if (kfTime >= timePercent && acc.nextKeyframe === initialNext) {
        acc.nextKeyframe = kf;
      }
      return acc;
    },
    { prevKeyframe: initialPrev, nextKeyframe: initialNext }
  );

  // Same keyframe - return its value
  if (prevKeyframe === nextKeyframe) {
    return prevKeyframe.value;
  }

  const prevTime = typeof prevKeyframe.time === "number" ? prevKeyframe.time : 0;
  const nextTime = typeof nextKeyframe.time === "number" ? nextKeyframe.time : 100;

  // Discrete mode - return previous value
  if (calcMode === "discrete") {
    return prevKeyframe.value;
  }

  // Linear interpolation
  if (calcMode === "linear") {
    const t = (timePercent - prevTime) / (nextTime - prevTime);
    return interpolateValues(prevKeyframe.value, nextKeyframe.value, t);
  }

  // Formula mode - not yet supported, fall back to linear
  const t = (timePercent - prevTime) / (nextTime - prevTime);
  return interpolateValues(prevKeyframe.value, nextKeyframe.value, t);
}

/**
 * Interpolate between two animation values.
 */
export function interpolateValues(
  from: AnimateValue,
  to: AnimateValue,
  t: number
): AnimateValue {
  // Both numbers - linear interpolation
  if (typeof from === "number" && typeof to === "number") {
    return lerp(from, to, t);
  }

  // Both booleans - discrete
  if (typeof from === "boolean" || typeof to === "boolean") {
    return t < 0.5 ? from : to;
  }

  // Both strings - try to parse as numbers
  const fromParsed = parseAnimateValue(from);
  const toParsed = parseAnimateValue(to);

  if (fromParsed && toParsed && fromParsed.unit === toParsed.unit) {
    const value = lerp(fromParsed.value, toParsed.value, t);
    return fromParsed.unit ? `${value}${fromParsed.unit}` : value;
  }

  // Can't interpolate - discrete
  return t < 0.5 ? from : to;
}

// =============================================================================
// Attribute Mapping
// =============================================================================

/**
 * Map PPTX attribute name to CSS property.
 *
 * PPTX uses various attribute names:
 * - "style.opacity" -> "opacity"
 * - "style.visibility" -> "visibility"
 * - "ppt_x", "ppt_y" -> transform translate
 * - "style.rotation" -> transform rotate
 * - "style.scaleX", "style.scaleY" -> transform scale
 * - "fillcolor", "fill.type" -> fill (for SVG)
 *
 * @param attribute - PPTX attribute name
 * @returns CSS property name or special identifier
 */
export function mapAttributeToCSS(attribute: string): string {
  // Style properties
  if (attribute.startsWith("style.")) {
    const prop = attribute.slice(6);
    switch (prop) {
      case "opacity":
        return "opacity";
      case "visibility":
        return "visibility";
      case "rotation":
        return "transform-rotate";
      case "scaleX":
        return "transform-scaleX";
      case "scaleY":
        return "transform-scaleY";
      default:
        return prop;
    }
  }

  // Position properties (ppt_x, ppt_y)
  if (attribute === "ppt_x") {
    return "transform-translateX";
  }
  if (attribute === "ppt_y") {
    return "transform-translateY";
  }

  // Fill properties
  if (attribute === "fillcolor" || attribute === "fill.color") {
    return "fill";
  }
  if (attribute === "fill.type") {
    return "fill-type";
  }

  // Stroke properties
  if (attribute === "stroke.color") {
    return "stroke";
  }

  return attribute;
}

/**
 * Apply an animated value to an element.
 *
 * @param element - Target element
 * @param attribute - PPTX attribute name
 * @param value - Value to apply
 * @param slideWidth - Slide width in pixels (for coordinate conversion)
 * @param slideHeight - Slide height in pixels (for coordinate conversion)
 */
export function applyAnimatedValue({
  element,
  attribute,
  value,
  slideWidth = 960,
  slideHeight = 540,
}: {
  element: HTMLElement | SVGElement;
  attribute: string;
  value: AnimateValue;
  slideWidth?: number;
  slideHeight?: number;
}): void {
  const cssProperty = mapAttributeToCSS(attribute);
  const parsed = parseAnimateValue(value);

  switch (cssProperty) {
    case "opacity":
      element.style.opacity = String(parsed?.value ?? value);
      break;

    case "visibility":
      element.style.visibility = value === "visible" || value === true ? "visible" : "hidden";
      break;

    case "transform-translateX": {
      const px = parseCoordinateValue(value, slideWidth) ?? 0;
      updateTransform(element, "translateX", `${px}px`);
      break;
    }

    case "transform-translateY": {
      const px = parseCoordinateValue(value, slideHeight) ?? 0;
      updateTransform(element, "translateY", `${px}px`);
      break;
    }

    case "transform-rotate": {
      const deg = parsed?.value ?? 0;
      updateTransform(element, "rotate", `${deg}deg`);
      break;
    }

    case "transform-scaleX": {
      const scale = parsed?.value ?? 1;
      updateTransform(element, "scaleX", String(scale));
      break;
    }

    case "transform-scaleY": {
      const scale = parsed?.value ?? 1;
      updateTransform(element, "scaleY", String(scale));
      break;
    }

    case "fill":
    case "stroke":
      if (element instanceof SVGElement) {
        element.setAttribute(cssProperty, String(value));
      } else {
        element.style.setProperty(cssProperty === "fill" ? "background-color" : "border-color", String(value));
      }
      break;

    default:
      // Try to set as style property
      try {
        element.style.setProperty(cssProperty, String(value));
      } catch {
        // Ignore invalid properties
      }
  }
}

/**
 * Update a specific transform function on an element.
 * Preserves other transform functions.
 */
function updateTransform(
  element: HTMLElement | SVGElement,
  fn: string,
  value: string
): void {
  const current = element.style.transform || "";

  // Parse existing transform functions
  const transforms = new Map<string, string>();
  const regex = /(\w+)\(([^)]+)\)/g;
  for (const match of current.matchAll(regex)) {
    transforms.set(match[1], match[2]);
  }

  // Update or add the new transform
  transforms.set(fn, value);

  // Rebuild transform string in consistent order
  const order = ["translateX", "translateY", "translate", "rotate", "scaleX", "scaleY", "scale"];
  const parts: string[] = [];

  for (const name of order) {
    if (transforms.has(name)) {
      parts.push(`${name}(${transforms.get(name)})`);
      transforms.delete(name);
    }
  }

  // Add any remaining transforms
  for (const [name, val] of transforms) {
    parts.push(`${name}(${val})`);
  }

  element.style.transform = parts.join(" ");
}

// =============================================================================
// AnimateBehavior Processing
// =============================================================================

/**
 * Process an AnimateBehavior node and return an animation function.
 *
 * @param behavior - AnimateBehavior from timing tree
 * @param element - Target DOM element
 * @param slideWidth - Slide width in pixels
 * @param slideHeight - Slide height in pixels
 * @returns Animation update function (progress: 0-1) => void
 */
export function createAnimateFunction({
  behavior,
  element,
  slideWidth = 960,
  slideHeight = 540,
}: {
  behavior: AnimateBehavior;
  element: HTMLElement | SVGElement;
  slideWidth?: number;
  slideHeight?: number;
}): (progress: number) => void {
  const { attribute, from, to, by, keyframes, calcMode } = behavior;

  // Keyframe animation
  if (keyframes && keyframes.length > 0) {
    return (progress: number) => {
      const value = interpolateKeyframes(keyframes, progress, calcMode);
      if (value !== undefined) {
        applyAnimatedValue({ element, attribute, value, slideWidth, slideHeight });
      }
    };
  }

  // From/To animation
  if (from !== undefined && to !== undefined) {
    return (progress: number) => {
      const value = interpolateValues(from, to, progress);
      applyAnimatedValue({ element, attribute, value, slideWidth, slideHeight });
    };
  }

  // From/By animation (relative)
  if (from !== undefined && by !== undefined) {
    const fromParsed = parseAnimateValue(from);
    const byParsed = parseAnimateValue(by);

    if (fromParsed && byParsed) {
      const toValue = fromParsed.value + byParsed.value;
      const unit = fromParsed.unit || byParsed.unit;

      return (progress: number) => {
        const value = lerp(fromParsed.value, toValue, progress);
        const formatted = unit ? `${value}${unit}` : value;
        applyAnimatedValue({ element, attribute, value: formatted, slideWidth, slideHeight });
      };
    }
  }

  // To only (animate to target from current)
  if (to !== undefined) {
    // Get current value as from
    const cssProperty = mapAttributeToCSS(attribute);
    const fromValue: AnimateValue = cssProperty === "opacity"
      ? parseFloat(element.style.opacity) || 1
      : 0;

    return (progress: number) => {
      const value = interpolateValues(fromValue, to, progress);
      applyAnimatedValue({ element, attribute, value, slideWidth, slideHeight });
    };
  }

  // No animation possible
  return () => {};
}
