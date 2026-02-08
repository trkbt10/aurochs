/**
 * @file Animation timing serializer
 *
 * Serializes animation domain objects to PresentationML timing XML elements.
 *
 * @see ECMA-376 Part 1, Section 19.5 - Animation
 */

import { createElement, type XmlElement } from "@aurochs/xml";
import type {
  Timing,
  TimeNode,
  ParallelTimeNode,
  SequenceTimeNode,
  AnimateBehavior,
  SetBehavior,
  AnimateEffectBehavior,
  AnimateMotionBehavior,
  AnimateColorBehavior,
  AnimateScaleBehavior,
  AnimateRotationBehavior,
  Condition,
  AnimationTarget,
  ShapeTarget,
  Keyframe,
  BuildEntry,
  TLTime,
  PresetInfo,
} from "@aurochs-office/pptx/domain/animation";

// =============================================================================
// Helper Functions
// =============================================================================

function boolAttr(value: boolean): "1" | "0" {
  return value ? "1" : "0";
}

function timeValue(time: TLTime): string {
  return time === "indefinite" ? "indefinite" : String(time);
}

// =============================================================================
// Target Serialization
// =============================================================================

function serializeShapeTarget(target: ShapeTarget): XmlElement {
  const children: XmlElement[] = [];

  // Text element target
  if (target.textElement) {
    if (target.textElement.type === "paragraph") {
      children.push(
        createElement("p:txEl", {}, [
          createElement("p:pRg", {
            st: String(target.textElement.start),
            end: String(target.textElement.end),
          }),
        ]),
      );
    } else {
      children.push(
        createElement("p:txEl", {}, [
          createElement("p:charRg", {
            st: String(target.textElement.start),
            end: String(target.textElement.end),
          }),
        ]),
      );
    }
  }

  // Background target
  if (target.targetBackground) {
    children.push(createElement("p:bg"));
  }

  return createElement("p:spTgt", { spid: String(target.shapeId) }, children);
}

function serializeTarget(target: AnimationTarget): XmlElement {
  switch (target.type) {
    case "shape":
      return createElement("p:tgtEl", {}, [serializeShapeTarget(target)]);
    case "slide":
      return createElement("p:tgtEl", {}, [createElement("p:sldTgt")]);
    case "sound":
      return createElement("p:tgtEl", {}, [
        createElement("p:sndTgt", { "r:embed": target.resourceId, name: target.name ?? "" }),
      ]);
    case "ink":
      return createElement("p:tgtEl", {}, [createElement("p:inkTgt", { spid: String(target.shapeId) })]);
  }
}

// =============================================================================
// Condition Serialization
// =============================================================================

function serializeCondition(cond: Condition): XmlElement {
  const attrs: Record<string, string> = {};

  if (cond.delay !== undefined) {
    attrs.delay = timeValue(cond.delay);
  }
  if (cond.event !== undefined) {
    attrs.evt = cond.event;
  }

  const children: XmlElement[] = [];
  if (cond.target) {
    children.push(serializeTarget(cond.target));
  }
  if (cond.timeNodeRef !== undefined) {
    children.push(createElement("p:tn", { val: String(cond.timeNodeRef) }));
  }
  if (cond.runtimeNode !== undefined) {
    children.push(createElement("p:rtn", { val: cond.runtimeNode }));
  }

  return createElement("p:cond", attrs, children);
}

function serializeConditionList(conditions: readonly Condition[], wrapper: string): XmlElement {
  return createElement(wrapper, {}, conditions.map(serializeCondition));
}

// =============================================================================
// Keyframe Serialization
// =============================================================================

function serializeKeyframe(kf: Keyframe): XmlElement {
  const attrs: Record<string, string> = {
    tm: kf.time === "indefinite" ? "indefinite" : String(kf.time),
  };
  if (kf.formula) {
    attrs.fmla = kf.formula;
  }

  const valEl = createElement("p:val", {}, [createElement("p:strVal", { val: String(kf.value) })]);

  return createElement("p:tav", attrs, [valEl]);
}

// =============================================================================
// Preset Info Serialization
// =============================================================================

function serializePreset(preset: PresetInfo, attrs: Record<string, string>): void {
  attrs.presetID = String(preset.id);
  attrs.presetClass = preset.class;
  if (preset.subtype !== undefined) {
    attrs.presetSubtype = String(preset.subtype);
  }
}

// =============================================================================
// Common Time Node Serialization
// =============================================================================

function serializeCommonTimeNode(node: TimeNode): XmlElement {
  const attrs: Record<string, string> = {
    id: String(node.id),
  };

  if (node.duration !== undefined) {
    attrs.dur = timeValue(node.duration);
  }
  if (node.fill !== undefined) {
    attrs.fill = node.fill;
  }
  if (node.restart !== undefined) {
    attrs.restart = node.restart;
  }
  if (node.nodeType !== undefined) {
    attrs.nodeType = node.nodeType;
  }
  if (node.preset !== undefined) {
    serializePreset(node.preset, attrs);
  }
  if (node.acceleration !== undefined) {
    attrs.accel = String(node.acceleration * 1000);
  }
  if (node.deceleration !== undefined) {
    attrs.decel = String(node.deceleration * 1000);
  }
  if (node.autoReverse !== undefined) {
    attrs.autoRev = boolAttr(node.autoReverse);
  }
  if (node.repeatCount !== undefined) {
    attrs.repeatCount = node.repeatCount === "indefinite" ? "indefinite" : String(node.repeatCount);
  }
  if (node.speed !== undefined) {
    attrs.spd = String(node.speed * 1000);
  }

  const children: XmlElement[] = [];

  if (node.startConditions && node.startConditions.length > 0) {
    children.push(serializeConditionList(node.startConditions, "p:stCondLst"));
  }
  if (node.endConditions && node.endConditions.length > 0) {
    children.push(serializeConditionList(node.endConditions, "p:endCondLst"));
  }

  // Add child time nodes
  if ("children" in node && node.children.length > 0) {
    children.push(createElement("p:childTnLst", {}, node.children.map(serializeTimeNode)));
  }

  return createElement("p:cTn", attrs, children);
}

// =============================================================================
// Behavior Serialization
// =============================================================================

function serializeCommonBehavior(
  node:
    | AnimateBehavior
    | SetBehavior
    | AnimateEffectBehavior
    | AnimateMotionBehavior
    | AnimateColorBehavior
    | AnimateScaleBehavior
    | AnimateRotationBehavior,
): XmlElement {
  const attrs: Record<string, string> = {};

  if ("attribute" in node && node.attribute) {
    attrs.attrName = node.attribute;
  }
  if ("additive" in node && node.additive !== undefined) {
    attrs.additive = node.additive;
  }
  if (node.accumulate !== undefined) {
    attrs.accumulate = node.accumulate;
  }
  if (node.transformType !== undefined) {
    attrs.xfrmType = node.transformType;
  }

  const children: XmlElement[] = [serializeCommonTimeNode(node)];
  children.push(serializeTarget(node.target));

  if ("attribute" in node && node.attribute) {
    children.push(
      createElement("p:attrNameLst", {}, [createElement("p:attrName", {}, [{ type: "text", value: node.attribute }])]),
    );
  }

  return createElement("p:cBhvr", attrs, children);
}

function serializeAnimateBehavior(node: AnimateBehavior): XmlElement {
  const attrs: Record<string, string> = {};

  if (node.calcMode !== undefined) {
    attrs.calcmode = node.calcMode;
  }
  if (node.valueType !== undefined) {
    attrs.valueType = node.valueType;
  }

  const children: XmlElement[] = [serializeCommonBehavior(node)];

  if (node.keyframes && node.keyframes.length > 0) {
    children.push(createElement("p:tavLst", {}, node.keyframes.map(serializeKeyframe)));
  }

  return createElement("p:anim", attrs, children);
}

function serializeSetBehavior(node: SetBehavior): XmlElement {
  const children: XmlElement[] = [serializeCommonBehavior(node)];

  children.push(createElement("p:to", {}, [createElement("p:strVal", { val: String(node.value) })]));

  return createElement("p:set", {}, children);
}

function serializeAnimateEffectBehavior(node: AnimateEffectBehavior): XmlElement {
  const attrs: Record<string, string> = {
    transition: node.transition,
    filter: node.filter,
  };

  const children: XmlElement[] = [serializeCommonBehavior(node)];

  return createElement("p:animEffect", attrs, children);
}

function serializeAnimateMotionBehavior(node: AnimateMotionBehavior): XmlElement {
  const attrs: Record<string, string> = {};

  if (node.origin !== undefined) {
    attrs.origin = node.origin;
  }
  if (node.path !== undefined) {
    attrs.path = node.path;
  }
  if (node.pathEditMode !== undefined) {
    attrs.pathEditMode = node.pathEditMode;
  }

  const children: XmlElement[] = [serializeCommonBehavior(node)];

  if (node.from !== undefined) {
    children.push(createElement("p:from", { x: String(node.from.x), y: String(node.from.y) }));
  }
  if (node.to !== undefined) {
    children.push(createElement("p:to", { x: String(node.to.x), y: String(node.to.y) }));
  }
  if (node.by !== undefined) {
    children.push(createElement("p:by", { x: String(node.by.x), y: String(node.by.y) }));
  }
  if (node.rotationCenter !== undefined) {
    children.push(createElement("p:rCtr", { x: String(node.rotationCenter.x), y: String(node.rotationCenter.y) }));
  }

  return createElement("p:animMotion", attrs, children);
}

function serializeAnimateColorBehavior(node: AnimateColorBehavior): XmlElement {
  const attrs: Record<string, string> = {};

  if (node.colorSpace !== undefined) {
    attrs.clrSpc = node.colorSpace;
  }
  if (node.direction !== undefined) {
    attrs.dir = node.direction;
  }

  const children: XmlElement[] = [serializeCommonBehavior(node)];

  // Color values need proper serialization as srgbClr or similar
  if (node.from !== undefined) {
    children.push(createElement("p:from", {}, [createElement("a:srgbClr", { val: node.from })]));
  }
  if (node.to !== undefined) {
    children.push(createElement("p:to", {}, [createElement("a:srgbClr", { val: node.to })]));
  }
  if (node.by !== undefined) {
    children.push(createElement("p:by", {}, [createElement("a:srgbClr", { val: node.by })]));
  }

  return createElement("p:animClr", attrs, children);
}

function serializeAnimateScaleBehavior(node: AnimateScaleBehavior): XmlElement {
  const children: XmlElement[] = [serializeCommonBehavior(node)];

  if (node.fromX !== undefined && node.fromY !== undefined) {
    children.push(createElement("p:from", { x: String(node.fromX * 1000), y: String(node.fromY * 1000) }));
  }
  if (node.toX !== undefined && node.toY !== undefined) {
    children.push(createElement("p:to", { x: String(node.toX * 1000), y: String(node.toY * 1000) }));
  }
  if (node.byX !== undefined && node.byY !== undefined) {
    children.push(createElement("p:by", { x: String(node.byX * 1000), y: String(node.byY * 1000) }));
  }

  return createElement("p:animScale", {}, children);
}

function serializeAnimateRotationBehavior(node: AnimateRotationBehavior): XmlElement {
  const attrs: Record<string, string> = {};

  if (node.from !== undefined) {
    attrs.from = String(node.from * 60000);
  }
  if (node.to !== undefined) {
    attrs.to = String(node.to * 60000);
  }
  if (node.by !== undefined) {
    attrs.by = String(node.by * 60000);
  }

  const children: XmlElement[] = [serializeCommonBehavior(node)];

  return createElement("p:animRot", attrs, children);
}

// =============================================================================
// Time Node Serialization
// =============================================================================

/**
 * Serialize a time node to its XML representation.
 */
export function serializeTimeNode(node: TimeNode): XmlElement {
  switch (node.type) {
    case "parallel":
      return serializeParallelNode(node);
    case "sequence":
      return serializeSequenceNode(node);
    case "exclusive":
      return createElement("p:excl", {}, [serializeCommonTimeNode(node)]);
    case "animate":
      return serializeAnimateBehavior(node);
    case "set":
      return serializeSetBehavior(node);
    case "animateEffect":
      return serializeAnimateEffectBehavior(node);
    case "animateMotion":
      return serializeAnimateMotionBehavior(node);
    case "animateColor":
      return serializeAnimateColorBehavior(node);
    case "animateScale":
      return serializeAnimateScaleBehavior(node);
    case "animateRotation":
      return serializeAnimateRotationBehavior(node);
    case "audio":
      return createElement("p:audio", {}, [serializeCommonTimeNode(node), serializeTarget(node.target)]);
    case "video":
      return createElement("p:video", { fullScrn: node.fullscreen ? "1" : "0" }, [
        serializeCommonTimeNode(node),
        serializeTarget(node.target),
      ]);
    case "command":
      return createElement("p:cmd", { type: node.commandType, cmd: node.command }, [
        serializeCommonTimeNode(node),
        serializeTarget(node.target),
      ]);
  }
}

function serializeParallelNode(node: ParallelTimeNode): XmlElement {
  return createElement("p:par", {}, [serializeCommonTimeNode(node)]);
}

function serializeSequenceNode(node: SequenceTimeNode): XmlElement {
  const attrs: Record<string, string> = {};

  if (node.concurrent !== undefined) {
    attrs.concurrent = boolAttr(node.concurrent);
  }
  if (node.nextAction !== undefined) {
    attrs.nextAc = node.nextAction;
  }
  if (node.prevAction !== undefined) {
    attrs.prevAc = node.prevAction;
  }

  const children: XmlElement[] = [serializeCommonTimeNode(node)];

  if (node.prevConditions && node.prevConditions.length > 0) {
    children.push(serializeConditionList(node.prevConditions, "p:prevCondLst"));
  }
  if (node.nextConditions && node.nextConditions.length > 0) {
    children.push(serializeConditionList(node.nextConditions, "p:nextCondLst"));
  }

  return createElement("p:seq", attrs, children);
}

// =============================================================================
// Build List Serialization
// =============================================================================

function serializeBuildEntry(entry: BuildEntry): XmlElement {
  const attrs: Record<string, string> = {
    spid: String(entry.shapeId),
  };

  if (entry.groupId !== undefined) {
    attrs.grpId = String(entry.groupId);
  }
  if (entry.buildType !== undefined) {
    attrs.build = entry.buildType;
  }
  if (entry.animateBackground !== undefined) {
    attrs.animBg = boolAttr(entry.animateBackground);
  }
  if (entry.reverse !== undefined) {
    attrs.rev = boolAttr(entry.reverse);
  }
  if (entry.advanceAfter !== undefined) {
    attrs.advAuto = timeValue(entry.advanceAfter);
  }
  if (entry.uiExpand !== undefined) {
    attrs.uiExpand = boolAttr(entry.uiExpand);
  }

  return createElement("p:bldP", attrs);
}

// =============================================================================
// Main Timing Serialization
// =============================================================================

/**
 * Serialize timing data to a p:timing XML element.
 *
 * @param timing - The timing specification
 * @returns XmlElement representing the p:timing element, or null if empty
 */
export function serializeTiming(timing: Timing): XmlElement | null {
  if (!timing.rootTimeNode && !timing.buildList) {
    return null;
  }

  const children: XmlElement[] = [];

  if (timing.rootTimeNode) {
    children.push(createElement("p:tnLst", {}, [serializeTimeNode(timing.rootTimeNode)]));
  }

  if (timing.buildList && timing.buildList.length > 0) {
    children.push(createElement("p:bldLst", {}, timing.buildList.map(serializeBuildEntry)));
  }

  return createElement("p:timing", {}, children);
}
