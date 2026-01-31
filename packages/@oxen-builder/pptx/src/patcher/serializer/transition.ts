/**
 * @file Slide transition serializer
 *
 * Serializes SlideTransition domain objects to PresentationML XML elements.
 *
 * @see ECMA-376 Part 1, Section 19.5 - Transitions
 */

import { createElement, type XmlElement } from "@oxen/xml";
import type { SlideTransition, TransitionType } from "@oxen-office/pptx/domain/transition";

/**
 * Convert boolean to OOXML boolean attribute value
 */
function booleanAttr(value: boolean): "1" | "0" {
  return value ? "1" : "0";
}

/**
 * Convert duration in milliseconds to speed attribute value
 */
function durationToSpeed(durationMs: number): "fast" | "med" | "slow" {
  if (durationMs >= 1500) {
    return "slow";
  }
  if (durationMs >= 750) {
    return "med";
  }
  return "fast";
}

/**
 * Transition types that support eight-direction (l, r, u, d, ld, lu, rd, ru)
 */
const DIRECTION_EIGHT_TYPES: readonly TransitionType[] = ["wipe", "push", "cover", "pull", "strips"];

/**
 * Transition types that support orientation (horz, vert)
 */
const ORIENTATION_TYPES: readonly TransitionType[] = ["blinds", "checker", "comb", "randomBar"];

/**
 * Transition types that support spokes
 */
const SPOKES_TYPES: readonly TransitionType[] = ["wheel"];

/**
 * Transition types that support in/out direction
 */
const IN_OUT_TYPES: readonly TransitionType[] = ["split", "zoom"];

/**
 * Build the inner transition type element (e.g., p:wipe, p:fade, etc.)
 */
function serializeTransitionTypeElement(transition: SlideTransition): XmlElement {
  const { type, direction, orientation, spokes, inOutDirection } = transition;
  const attrs: Record<string, string> = {};

  const usesDir8 = DIRECTION_EIGHT_TYPES.includes(type);
  const usesOrientation = ORIENTATION_TYPES.includes(type);
  const usesSpokes = SPOKES_TYPES.includes(type);
  const usesInOut = IN_OUT_TYPES.includes(type);

  // Validate that attributes are appropriate for the transition type
  if (direction !== undefined && !usesDir8) {
    throw new Error(`serializeTransitionTypeElement: direction is not supported for transition type "${type}"`);
  }
  if (orientation !== undefined && !usesOrientation) {
    throw new Error(`serializeTransitionTypeElement: orientation is not supported for transition type "${type}"`);
  }
  if (spokes !== undefined && !usesSpokes) {
    throw new Error(`serializeTransitionTypeElement: spokes is not supported for transition type "${type}"`);
  }
  if (inOutDirection !== undefined && !usesInOut) {
    throw new Error(`serializeTransitionTypeElement: inOutDirection is not supported for transition type "${type}"`);
  }

  // Apply appropriate attributes
  if (usesDir8 && direction !== undefined) {
    attrs.dir = direction;
  }
  if (usesOrientation && orientation !== undefined) {
    attrs.dir = orientation;
  }
  if (usesSpokes && spokes !== undefined) {
    attrs.spkCnt = `${spokes}`;
  }
  if (usesInOut && inOutDirection !== undefined) {
    attrs.dir = inOutDirection;
  }

  return createElement(`p:${type}`, attrs);
}

/**
 * Serialize a SlideTransition to a p:transition XML element.
 *
 * @param transition - The slide transition specification
 * @returns XmlElement representing the p:transition element, or null if type is "none"
 *
 * @example
 * ```typescript
 * const el = serializeSlideTransition({
 *   type: "fade",
 *   duration: 500,
 *   advanceOnClick: true,
 * });
 * // => <p:transition spd="fast" advClick="1"><p:fade/></p:transition>
 * ```
 */
export function serializeSlideTransition(transition: SlideTransition): XmlElement | null {
  if (transition.type === "none") {
    return null;
  }

  const attrs: Record<string, string> = {};

  if (transition.duration !== undefined) {
    attrs.spd = durationToSpeed(transition.duration);
  }
  if (transition.advanceOnClick !== undefined) {
    attrs.advClick = booleanAttr(transition.advanceOnClick);
  }
  if (transition.advanceAfter !== undefined) {
    attrs.advTm = `${transition.advanceAfter}`;
  }

  const typeEl = serializeTransitionTypeElement(transition);
  return createElement("p:transition", attrs, [typeEl]);
}

/**
 * List of all valid transition types.
 */
export const TRANSITION_TYPES: readonly TransitionType[] = [
  "blinds",
  "checker",
  "circle",
  "comb",
  "cover",
  "cut",
  "diamond",
  "dissolve",
  "fade",
  "newsflash",
  "plus",
  "pull",
  "push",
  "random",
  "randomBar",
  "split",
  "strips",
  "wedge",
  "wheel",
  "wipe",
  "zoom",
  "none",
];

/**
 * Type guard for transition type strings.
 */
export function isTransitionType(value: string): value is TransitionType {
  return TRANSITION_TYPES.includes(value as TransitionType);
}
