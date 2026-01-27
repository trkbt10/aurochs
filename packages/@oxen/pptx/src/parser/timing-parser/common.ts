/**
 * @file Common behavior and time node parsing
 *
 * @see ECMA-376 Part 1, Section 19.5.22 (p:cBhvr)
 * @see ECMA-376 Part 1, Section 19.5.33 (p:cTn)
 */

import {
  getAttr,
  getChild,
  getChildren,
  getTextContent,
  type XmlElement,
} from "@oxen/xml";
import type {
  AnimationTarget,
  ParallelTimeNode,
  PresetClass,
  IterateData,
  IterateInterval,
  AccumulateMode,
  OverrideMode,
  TransformType,
} from "../../domain/animation";
import {
  parseDuration,
  parseRepeatCount,
  mapFillBehavior,
  mapRestartBehavior,
  mapTimeNodeSyncType,
  mapTimeNodeMasterRelation,
  mapTimeNodeType,
  mapPresetClass,
  mapIterateType,
  mapAccumulateMode,
  mapOverrideMode,
  mapTransformType,
} from "./mapping";
import { parseConditionList, parseTimeCondition } from "./condition";
import { parseTargetElement } from "./target";
import { getBoolAttr, parsePositiveFixedPercentage, parsePositivePercentage } from "../primitive";

/**
 * Parse preset info from common time node.
 * @see ECMA-376 Part 1, Section 19.5.33 (presetID, presetClass, presetSubtype)
 */
export function parsePresetInfo(cTn: XmlElement): { id: number; class: PresetClass; subtype?: number } | undefined {
  const presetID = getAttr(cTn, "presetID");
  const presetClass = getAttr(cTn, "presetClass");

  if (!presetID || !presetClass) {
    return undefined;
  }

  const mappedClass = mapPresetClass(presetClass);
  if (!mappedClass) {
    return undefined;
  }

  const presetSubtype = getAttr(cTn, "presetSubtype");

  return {
    id: parseInt(presetID, 10),
    class: mappedClass,
    subtype: presetSubtype ? parseInt(presetSubtype, 10) : undefined,
  };
}

/**
 * Parse common time node properties (p:cTn).
 * @see ECMA-376 Part 1, Section 19.5.33
 */
export function parseCommonTimeNode(cTn: XmlElement): Omit<ParallelTimeNode, "type" | "children"> {
  const id = parseInt(getAttr(cTn, "id") ?? "0", 10);
  const duration = parseDuration(getAttr(cTn, "dur"));
  const fill = mapFillBehavior(getAttr(cTn, "fill"));
  const restart = mapRestartBehavior(getAttr(cTn, "restart"));
  const syncBehavior = mapTimeNodeSyncType(getAttr(cTn, "syncBehavior"));
  const masterRelation = mapTimeNodeMasterRelation(getAttr(cTn, "masterRel"));
  const nodeType = mapTimeNodeType(getAttr(cTn, "nodeType"));

  // Parse preset info
  const preset = parsePresetInfo(cTn);

  // Parse conditions
  const stCondLst = getChild(cTn, "p:stCondLst");
  const endCondLst = getChild(cTn, "p:endCondLst");
  const endSync = getChild(cTn, "p:endSync");
  const startConditions = stCondLst ? parseConditionList(stCondLst) : undefined;
  const endConditions = endCondLst ? parseConditionList(endCondLst) : undefined;
  const endSyncCondition = endSync ? parseTimeCondition(endSync) : undefined;
  const iterate = parseIterateData(cTn);

  // Parse timing modifiers
  const accel = getAttr(cTn, "accel");
  const decel = getAttr(cTn, "decel");
  const autoRev = getAttr(cTn, "autoRev");
  const repeatCount = parseRepeatCount(getAttr(cTn, "repeatCount"));
  const spd = getAttr(cTn, "spd");

  return {
    id,
    duration,
    fill,
    restart,
    syncBehavior,
    masterRelation,
    nodeType,
    preset,
    startConditions,
    endConditions,
    endSync: endSyncCondition,
    iterate,
    acceleration: accel ? parseInt(accel, 10) / 1000 : undefined,
    deceleration: decel ? parseInt(decel, 10) / 1000 : undefined,
    autoReverse: autoRev === "1",
    repeatCount,
    speed: spd ? parseInt(spd, 10) / 1000 : undefined,
  };
}

function parseIterateInterval(iterate: XmlElement): IterateInterval | undefined {
  const tmAbs = getChild(iterate, "p:tmAbs");
  if (tmAbs) {
    const val = getAttr(tmAbs, "val");
    if (val !== undefined) {
      const parsed = parseInt(val, 10);
      if (!Number.isNaN(parsed)) {
        return { type: "absolute", value: parsed };
      }
    }
  }

  const tmPct = getChild(iterate, "p:tmPct");
  if (tmPct) {
    const raw = getAttr(tmPct, "val");
    const pct = parseIteratePercentage(raw);
    if (pct !== undefined) {
      return { type: "percentage", value: pct };
    }
  }

  return undefined;
}

function parseIterateData(cTn: XmlElement): IterateData | undefined {
  const iterate = getChild(cTn, "p:iterate");
  if (!iterate) {
    return undefined;
  }

  const type = mapIterateType(getAttr(iterate, "type")) ?? "element";
  const backwards = getBoolAttr(iterate, "backwards");
  const interval = parseIterateInterval(iterate);

  return {
    type,
    backwards,
    interval,
  };
}

function parseIteratePercentage(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }
  if (raw.endsWith("%")) {
    return parsePositiveFixedPercentage(raw);
  }
  return parsePositivePercentage(raw);
}

/**
 * Extract first attribute name from attrNameLst.
 */
function extractFirstAttributeName(attrNameLst: XmlElement | undefined): string | undefined {
  if (!attrNameLst) {
    return undefined;
  }
  const attrNames = getChildren(attrNameLst, "p:attrName");
  if (attrNames.length === 0) {
    return undefined;
  }
  return getTextContent(attrNames[0]);
}

/**
 * Parse common behavior (p:cBhvr).
 * @see ECMA-376 Part 1, Section 19.5.22
 */
export function parseCommonBehavior(cBhvr: XmlElement): {
  target?: AnimationTarget;
  attribute?: string;
  cTn?: XmlElement;
  accumulate?: AccumulateMode;
  override?: OverrideMode;
  transformType?: TransformType;
} {
  const cTn = getChild(cBhvr, "p:cTn");
  const tgtEl = getChild(cBhvr, "p:tgtEl");
  const attrNameLst = getChild(cBhvr, "p:attrNameLst");

  const target = tgtEl ? parseTargetElement(tgtEl) : undefined;

  // Get first attribute name
  const attribute = extractFirstAttributeName(attrNameLst);
  const accumulate = mapAccumulateMode(getAttr(cBhvr, "accumulate"));
  const override = mapOverrideMode(getAttr(cBhvr, "override"));
  const transformType = mapTransformType(getAttr(cBhvr, "xfrmType"));

  return { target, attribute, cTn, accumulate, override, transformType };
}
