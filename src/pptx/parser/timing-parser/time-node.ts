/**
 * @file Time node parsing
 *
 * @see ECMA-376 Part 1, Section 19.5.53 (p:par)
 * @see ECMA-376 Part 1, Section 19.5.65 (p:seq)
 * @see ECMA-376 Part 1, Section 19.5.29 (p:excl)
 */

import { getAttr, getChild, getChildren, isXmlElement, type XmlElement } from "../../../xml";
import type {
  TimeNode,
  ParallelTimeNode,
  SequenceTimeNode,
  ExclusiveTimeNode,
} from "../../domain/animation";
import { mapNextAction, mapPrevAction } from "./mapping";
import { parseCommonTimeNode } from "./common";
import { parseConditionList } from "./condition";
import {
  parseAnimateBehavior,
  parseSetBehavior,
  parseAnimateEffectBehavior,
  parseAnimateMotionBehavior,
  parseAnimateRotationBehavior,
  parseAnimateScaleBehavior,
  parseAnimateColorBehavior,
  parseAudioBehavior,
  parseVideoBehavior,
  parseCommandBehavior,
} from "./behavior";

/**
 * Parse a single time node element.
 */
export function parseTimeNodeElement(element: XmlElement): TimeNode | undefined {
  switch (element.name) {
    case "p:par":
      return parseParallelTimeNode(element);
    case "p:seq":
      return parseSequenceTimeNode(element);
    case "p:excl":
      return parseExclusiveTimeNode(element);
    case "p:anim":
      return parseAnimateBehavior(element);
    case "p:set":
      return parseSetBehavior(element);
    case "p:animEffect":
      return parseAnimateEffectBehavior(element);
    case "p:animMotion":
      return parseAnimateMotionBehavior(element);
    case "p:animRot":
      return parseAnimateRotationBehavior(element);
    case "p:animScale":
      return parseAnimateScaleBehavior(element);
    case "p:animClr":
      return parseAnimateColorBehavior(element);
    case "p:audio":
      return parseAudioBehavior(element);
    case "p:video":
      return parseVideoBehavior(element);
    case "p:cmd":
      return parseCommandBehavior(element);
    default:
      return undefined;
  }
}

/**
 * Parse child time nodes from p:childTnLst.
 */
function parseChildTimeNodes(cTn: XmlElement): readonly TimeNode[] {
  const childTnLst = getChild(cTn, "p:childTnLst");
  if (!childTnLst) {return [];}

  const nodes: TimeNode[] = [];

  for (const child of childTnLst.children) {
    if (!isXmlElement(child)) {continue;}

    const node = parseTimeNodeElement(child);
    if (node) {nodes.push(node);}
  }

  return nodes;
}

/**
 * Parse sub time nodes from p:subTnLst.
 */
function parseSubTimeNodes(cTn: XmlElement): readonly TimeNode[] {
  const subTnLst = getChild(cTn, "p:subTnLst");
  if (!subTnLst) {return [];}

  const nodes: TimeNode[] = [];

  for (const child of subTnLst.children) {
    if (!isXmlElement(child)) {continue;}

    const node = parseTimeNodeElement(child);
    if (node) {nodes.push(node);}
  }

  return nodes;
}

/**
 * Parse parallel time node (p:par).
 * @see ECMA-376 Part 1, Section 19.5.53
 */
export function parseParallelTimeNode(element: XmlElement): ParallelTimeNode | undefined {
  const cTn = getChild(element, "p:cTn");
  if (!cTn) {return undefined;}

  const base = parseCommonTimeNode(cTn);
  const children = parseChildTimeNodes(cTn);
  const subTimeNodes = parseSubTimeNodes(cTn);

  return {
    type: "parallel",
    ...base,
    children,
    subTimeNodes: subTimeNodes.length > 0 ? subTimeNodes : undefined,
  };
}

/**
 * Parse sequence time node (p:seq).
 * @see ECMA-376 Part 1, Section 19.5.65
 */
export function parseSequenceTimeNode(element: XmlElement): SequenceTimeNode | undefined {
  const cTn = getChild(element, "p:cTn");
  if (!cTn) {return undefined;}

  const base = parseCommonTimeNode(cTn);
  const children = parseChildTimeNodes(cTn);
  const subTimeNodes = parseSubTimeNodes(cTn);
  const prevCondLst = getChild(element, "p:prevCondLst");
  const nextCondLst = getChild(element, "p:nextCondLst");
  const prevConditions = prevCondLst ? parseConditionList(prevCondLst) : undefined;
  const nextConditions = nextCondLst ? parseConditionList(nextCondLst) : undefined;

  return {
    type: "sequence",
    ...base,
    children,
    subTimeNodes: subTimeNodes.length > 0 ? subTimeNodes : undefined,
    concurrent: getAttr(element, "concurrent") === "1",
    nextAction: mapNextAction(getAttr(element, "nextAc")),
    prevAction: mapPrevAction(getAttr(element, "prevAc")),
    prevConditions,
    nextConditions,
  };
}

/**
 * Parse exclusive time node (p:excl).
 * Only one child can be active at a time.
 * @see ECMA-376 Part 1, Section 19.5.29
 */
export function parseExclusiveTimeNode(element: XmlElement): ExclusiveTimeNode | undefined {
  const cTn = getChild(element, "p:cTn");
  if (!cTn) {return undefined;}

  const base = parseCommonTimeNode(cTn);
  const children = parseChildTimeNodes(cTn);
  const subTimeNodes = parseSubTimeNodes(cTn);

  return {
    type: "exclusive",
    ...base,
    children,
    subTimeNodes: subTimeNodes.length > 0 ? subTimeNodes : undefined,
  };
}

/**
 * Parse root time node from tnLst.
 */
export function parseRootTimeNode(tnLst: XmlElement | undefined): TimeNode | undefined {
  if (!tnLst) {
    return undefined;
  }
  const parElements = getChildren(tnLst, "p:par");
  if (parElements.length === 0) {
    return undefined;
  }
  return parseParallelTimeNode(parElements[0]);
}

/**
 * Parse all time nodes from tnLst.
 */
export function parseTimeNodeList(tnLst: XmlElement | undefined): readonly TimeNode[] {
  if (!tnLst) {return [];}

  const nodes: TimeNode[] = [];
  for (const child of tnLst.children) {
    if (!isXmlElement(child)) {continue;}
    const node = parseTimeNodeElement(child);
    if (node) {nodes.push(node);}
  }
  return nodes;
}
