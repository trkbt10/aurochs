/**
 * @file Condition parsing for timing/animation
 *
 * @see ECMA-376 Part 1, Section 19.5.25 (p:cond)
 */

import { getAttr, getChild, getChildren, type XmlElement } from "@oxen/xml";
import type { Condition } from "../../domain/animation";
import { mapConditionEvent, mapTriggerRuntimeNode } from "./mapping";
import { parseTargetElement } from "./target";

/**
 * Parse delay value string.
 * @see ECMA-376 Part 1, Section 19.5.25
 */
function parseDelayValue(delayStr: string | undefined): number | "indefinite" | undefined {
  if (!delayStr) {
    return undefined;
  }
  if (delayStr === "indefinite") {
    return "indefinite";
  }
  return parseInt(delayStr, 10);
}

/**
 * Parse condition (p:cond).
 * @see ECMA-376 Part 1, Section 19.5.25
 */
export function parseTimeCondition(condition: XmlElement): Condition | undefined {
  const delay = parseDelayValue(getAttr(condition, "delay"));
  const event = mapConditionEvent(getAttr(condition, "evt"));

  const tgtEl = getChild(condition, "p:tgtEl");
  const target = tgtEl ? parseTargetElement(tgtEl) : undefined;

  const tn = getChild(condition, "p:tn");
  const timeNodeRef = tn ? parseInt(getAttr(tn, "val") ?? "0", 10) : undefined;

  const rtn = getChild(condition, "p:rtn");
  const runtimeNode = rtn ? mapTriggerRuntimeNode(getAttr(rtn, "val")) : undefined;

  return { delay, event, target, timeNodeRef, runtimeNode };
}

/**
 * Parse condition (p:cond).
 * @see ECMA-376 Part 1, Section 19.5.25
 */
export function parseCondition(cond: XmlElement): Condition | undefined {
  return parseTimeCondition(cond);
}

/**
 * Parse condition list.
 * @see ECMA-376 Part 1, Section 19.5.72
 */
export function parseConditionList(condLst: XmlElement): readonly Condition[] {
  const conditions: Condition[] = [];

  for (const cond of getChildren(condLst, "p:cond")) {
    const condition = parseCondition(cond);
    if (condition) {conditions.push(condition);}
  }

  return conditions;
}
