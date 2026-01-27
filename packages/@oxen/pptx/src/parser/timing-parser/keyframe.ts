/**
 * @file Keyframe parsing for timing/animation
 *
 * @see ECMA-376 Part 1, Section 19.5.79 (p:tavLst)
 */

import { getAttr, getChild, getChildren, type XmlElement } from "@oxen/xml";
import type { AnimateValue, Keyframe } from "../../domain/animation";
import { parseColorValue } from "./color";

/**
 * Parse animate value (p:val, p:to, etc).
 */
export function parseAnimateValue(element: XmlElement): AnimateValue {
  // String value
  const strVal = getChild(element, "p:strVal");
  if (strVal) {
    return getAttr(strVal, "val") ?? "";
  }

  // Boolean value
  const boolVal = getChild(element, "p:boolVal");
  if (boolVal) {
    return getAttr(boolVal, "val") === "1";
  }

  // Integer value
  const intVal = getChild(element, "p:intVal");
  if (intVal) {
    return parseInt(getAttr(intVal, "val") ?? "0", 10);
  }

  // Float value
  const fltVal = getChild(element, "p:fltVal");
  if (fltVal) {
    return parseFloat(getAttr(fltVal, "val") ?? "0");
  }

  // Color value
  const clrVal = getChild(element, "p:clrVal");
  if (clrVal) {
    return parseColorValue(clrVal) ?? "";
  }

  return "";
}

/**
 * Parse single keyframe (p:tav).
 * @see ECMA-376 Part 1, Section 19.5.78
 */
export function parseKeyframe(tav: XmlElement): Keyframe | undefined {
  const tm = getAttr(tav, "tm");
  if (tm === undefined) {
    return undefined;
  }
  if (tm === "indefinite") {
    return undefined;
  }

  // tm is 0-100000, convert to 0-100
  const time = parseInt(tm, 10) / 1000;

  const valElement = getChild(tav, "p:val");
  const value = valElement ? parseAnimateValue(valElement) : "";

  const formula = getAttr(tav, "fmla");

  return {
    time,
    value,
    formula,
  };
}

/**
 * Parse keyframes (p:tavLst).
 * @see ECMA-376 Part 1, Section 19.5.79
 */
export function parseKeyframes(tavLst: XmlElement): readonly Keyframe[] {
  const keyframes: Keyframe[] = [];

  for (const tav of getChildren(tavLst, "p:tav")) {
    const keyframe = parseKeyframe(tav);
    if (keyframe) {
      keyframes.push(keyframe);
    }
  }

  return keyframes;
}
