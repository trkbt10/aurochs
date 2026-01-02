/**
 * @file Animation behavior parsers
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import { getAttr, getChild, type XmlElement } from "../../../xml";
import type {
  AnimateBehavior,
  SetBehavior,
  AnimateEffectBehavior,
  AnimateMotionBehavior,
  Point as MotionPoint,
  AnimateRotationBehavior,
  AnimateScaleBehavior,
  AnimateColorBehavior,
  AnimateColorDirection,
  AnimateColorSpace,
  AnimateMotionOrigin,
  AnimateMotionPathEditMode,
  AudioBehavior,
  VideoBehavior,
  CommandBehavior,
} from "../../domain/animation";
import { mapAdditiveMode, mapCalcMode, mapCommandType, mapValueType } from "./mapping";
import { parseCommonBehavior, parseCommonTimeNode } from "./common";
import { parseKeyframes, parseAnimateValue } from "./keyframe";
import { parseTargetElement } from "./target";
import { parseColorValue } from "./color";
import { parsePercentage, parsePositiveFixedPercentage } from "../primitive";

/**
 * Parse animate behavior (p:anim).
 * @see ECMA-376 Part 1, Section 19.5.1
 */
export function parseAnimateBehavior(element: XmlElement): AnimateBehavior | undefined {
  const cBhvr = getChild(element, "p:cBhvr");
  if (!cBhvr) {return undefined;}

  const { target, attribute, cTn, accumulate, override, transformType } = parseCommonBehavior(cBhvr);
  if (!target) {return undefined;}

  const base = cTn ? parseCommonTimeNode(cTn) : { id: 0 };

  // Parse keyframes
  const tavLst = getChild(element, "p:tavLst");
  const keyframes = tavLst ? parseKeyframes(tavLst) : undefined;

  return {
    type: "animate",
    ...base,
    target,
    attribute: attribute ?? "",
    keyframes,
    from: getAttr(element, "from"),
    to: getAttr(element, "to"),
    by: getAttr(element, "by"),
    calcMode: mapCalcMode(getAttr(element, "calcmode")),
    valueType: mapValueType(getAttr(element, "valueType")),
    additive: mapAdditiveMode(getAttr(cBhvr, "additive")),
    accumulate,
    override,
    transformType,
  };
}

/**
 * Parse set behavior (p:set).
 * @see ECMA-376 Part 1, Section 19.5.66
 */
export function parseSetBehavior(element: XmlElement): SetBehavior | undefined {
  const cBhvr = getChild(element, "p:cBhvr");
  if (!cBhvr) {return undefined;}

  const { target, attribute, cTn, accumulate, override, transformType } = parseCommonBehavior(cBhvr);
  if (!target) {return undefined;}

  const base = cTn ? parseCommonTimeNode(cTn) : { id: 0 };

  // Parse "to" value
  const toElement = getChild(element, "p:to");
  const value = toElement ? parseAnimateValue(toElement) : undefined;

  return {
    type: "set",
    ...base,
    target,
    attribute: attribute ?? "style.visibility",
    value: value ?? "visible",
    accumulate,
    override,
    transformType,
  };
}

/**
 * Parse animate effect behavior (p:animEffect).
 * @see ECMA-376 Part 1, Section 19.5.3
 */
export function parseAnimateEffectBehavior(element: XmlElement): AnimateEffectBehavior | undefined {
  const cBhvr = getChild(element, "p:cBhvr");
  if (!cBhvr) {return undefined;}

  const { target, cTn, accumulate, override, transformType } = parseCommonBehavior(cBhvr);
  if (!target) {return undefined;}

  const base = cTn ? parseCommonTimeNode(cTn) : { id: 0 };

  const transition = getAttr(element, "transition") as "in" | "out" | "none" | undefined;
  const filter = getAttr(element, "filter");
  const progress = getChild(element, "p:progress");

  return {
    type: "animateEffect",
    ...base,
    target,
    transition: transition ?? "in",
    filter: filter ?? "",
    progress: progress ? parseAnimateValue(progress) : undefined,
    accumulate,
    override,
    transformType,
  };
}

/**
 * Parse animate motion behavior (p:animMotion).
 * @see ECMA-376 Part 1, Section 19.5.4
 */
export function parseAnimateMotionBehavior(element: XmlElement): AnimateMotionBehavior | undefined {
  const cBhvr = getChild(element, "p:cBhvr");
  if (!cBhvr) {return undefined;}

  const { target, cTn, accumulate, override, transformType } = parseCommonBehavior(cBhvr);
  if (!target) {return undefined;}

  const base = cTn ? parseCommonTimeNode(cTn) : { id: 0 };

  const path = getAttr(element, "path");
  const origin = getAttr(element, "origin") as AnimateMotionOrigin | undefined;
  const pathEditMode = getAttr(element, "pathEditMode") as AnimateMotionPathEditMode | undefined;
  const rotationCenter = parseRotationCenter(getChild(element, "p:rCtr"));

  return {
    type: "animateMotion",
    ...base,
    target,
    path,
    origin,
    pathEditMode,
    rotationCenter,
    accumulate,
    override,
    transformType,
  };
}

/**
 * Parse animate rotation behavior (p:animRot).
 * @see ECMA-376 Part 1, Section 19.5.5
 */
export function parseAnimateRotationBehavior(element: XmlElement): AnimateRotationBehavior | undefined {
  const cBhvr = getChild(element, "p:cBhvr");
  if (!cBhvr) {return undefined;}

  const { target, cTn, accumulate, override, transformType } = parseCommonBehavior(cBhvr);
  if (!target) {return undefined;}

  const base = cTn ? parseCommonTimeNode(cTn) : { id: 0 };

  // Rotation values are in 1/60000 degrees
  const by = getAttr(element, "by");
  const from = getAttr(element, "from");
  const to = getAttr(element, "to");

  return {
    type: "animateRotation",
    ...base,
    target,
    from: from ? parseInt(from, 10) / 60000 : undefined,
    to: to ? parseInt(to, 10) / 60000 : undefined,
    by: by ? parseInt(by, 10) / 60000 : undefined,
    accumulate,
    override,
    transformType,
  };
}

/**
 * Parse scale value (in 1/1000, e.g., 100000 = 100%).
 */
function parseScaleValue(val: string | undefined): number | undefined {
  if (!val) {return undefined;}
  return parseInt(val, 10) / 1000;
}

function parsePercentageValue(value: string | undefined): number | undefined {
  if (!value) {return undefined;}
  if (value.endsWith("%")) {
    return parsePositiveFixedPercentage(value);
  }
  return parsePercentage(value);
}

function parseRotationCenter(element: XmlElement | undefined): MotionPoint | undefined {
  if (!element) {return undefined;}
  const x = parsePercentageValue(getAttr(element, "x"));
  const y = parsePercentageValue(getAttr(element, "y"));
  if (x === undefined || y === undefined) {return undefined;}
  return { x, y };
}

/**
 * Parse animate scale behavior (p:animScale).
 * @see ECMA-376 Part 1, Section 19.5.6
 */
export function parseAnimateScaleBehavior(element: XmlElement): AnimateScaleBehavior | undefined {
  const cBhvr = getChild(element, "p:cBhvr");
  if (!cBhvr) {return undefined;}

  const { target, cTn, accumulate, override, transformType } = parseCommonBehavior(cBhvr);
  if (!target) {return undefined;}

  const base = cTn ? parseCommonTimeNode(cTn) : { id: 0 };

  // Scale values are in 1/1000 (100000 = 100%)
  const by = getChild(element, "p:by");
  const from = getChild(element, "p:from");
  const to = getChild(element, "p:to");

  return {
    type: "animateScale",
    ...base,
    target,
    fromX: from ? parseScaleValue(getAttr(from, "x")) : undefined,
    fromY: from ? parseScaleValue(getAttr(from, "y")) : undefined,
    toX: to ? parseScaleValue(getAttr(to, "x")) : undefined,
    toY: to ? parseScaleValue(getAttr(to, "y")) : undefined,
    byX: by ? parseScaleValue(getAttr(by, "x")) : undefined,
    byY: by ? parseScaleValue(getAttr(by, "y")) : undefined,
    accumulate,
    override,
    transformType,
  };
}

/**
 * Parse animate color behavior (p:animClr).
 * @see ECMA-376 Part 1, Section 19.5.2
 */
export function parseAnimateColorBehavior(element: XmlElement): AnimateColorBehavior | undefined {
  const cBhvr = getChild(element, "p:cBhvr");
  if (!cBhvr) {return undefined;}

  const { target, attribute, cTn, accumulate, override, transformType } = parseCommonBehavior(cBhvr);
  if (!target) {return undefined;}

  const base = cTn ? parseCommonTimeNode(cTn) : { id: 0 };

  const clrSpc = getAttr(element, "clrSpc") as AnimateColorSpace | undefined;
  const direction = getAttr(element, "dir") as AnimateColorDirection | undefined;
  const by = getChild(element, "p:by");
  const from = getChild(element, "p:from");
  const to = getChild(element, "p:to");

  return {
    type: "animateColor",
    ...base,
    target,
    attribute: attribute ?? "",
    colorSpace: clrSpc ?? "rgb",
    direction,
    from: from ? parseColorValue(from) : undefined,
    to: to ? parseColorValue(to) : undefined,
    by: by ? parseColorValue(by) : undefined,
    accumulate,
    override,
    transformType,
  };
}

/**
 * Parse audio behavior (p:audio).
 * @see ECMA-376 Part 1, Section 19.5.7
 */
export function parseAudioBehavior(element: XmlElement): AudioBehavior | undefined {
  const cMediaNode = getChild(element, "p:cMediaNode");
  if (!cMediaNode) {return undefined;}

  const cTn = getChild(cMediaNode, "p:cTn");
  const tgtEl = getChild(cMediaNode, "p:tgtEl");

  const target = tgtEl ? parseTargetElement(tgtEl) : undefined;
  if (!target) {return undefined;}

  const base = cTn ? parseCommonTimeNode(cTn) : { id: 0 };

  return {
    type: "audio",
    ...base,
    target,
    isNarration: getAttr(element, "isNarration") === "1",
  };
}

/**
 * Parse video behavior (p:video).
 * @see ECMA-376 Part 1, Section 19.5.93
 */
export function parseVideoBehavior(element: XmlElement): VideoBehavior | undefined {
  const cMediaNode = getChild(element, "p:cMediaNode");
  if (!cMediaNode) {return undefined;}

  const cTn = getChild(cMediaNode, "p:cTn");
  const tgtEl = getChild(cMediaNode, "p:tgtEl");

  const target = tgtEl ? parseTargetElement(tgtEl) : undefined;
  if (!target) {return undefined;}

  const base = cTn ? parseCommonTimeNode(cTn) : { id: 0 };

  return {
    type: "video",
    ...base,
    target,
    fullscreen: getAttr(element, "fullScrn") === "1",
  };
}

/**
 * Parse command behavior (p:cmd).
 * @see ECMA-376 Part 1, Section 19.5.17
 */
export function parseCommandBehavior(element: XmlElement): CommandBehavior | undefined {
  const cBhvr = getChild(element, "p:cBhvr");
  if (!cBhvr) {return undefined;}

  const { target, cTn, accumulate, override, transformType } = parseCommonBehavior(cBhvr);
  if (!target) {return undefined;}

  const base = cTn ? parseCommonTimeNode(cTn) : { id: 0 };

  const cmdType = mapCommandType(getAttr(element, "type"));
  const cmd = getAttr(element, "cmd");

  return {
    type: "command",
    ...base,
    target,
    commandType: cmdType ?? "call",
    command: cmd ?? "",
    accumulate,
    override,
    transformType,
  };
}
