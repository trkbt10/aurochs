/**
 * @file Animation patcher
 *
 * Provides a simplified API for adding animations to slides.
 * Converts simple animation specs to the full timing model.
 *
 * @see ECMA-376 Part 1, Section 19.5 - Animation
 */

import { createElement, getChild, isXmlElement, type XmlDocument, type XmlElement } from "@aurochs/xml";
import type {
  Timing,
  TimeNode,
  ParallelTimeNode,
  SequenceTimeNode,
  SetBehavior,
  AnimateEffectBehavior,
  AnimateScaleBehavior,
  AnimateRotationBehavior,
  AnimateMotionBehavior,
  ShapeTarget,
  PresetClass,
} from "@aurochs-office/pptx/domain/animation";
import { serializeTiming } from "../serializer/animation";

// =============================================================================
// Animation Effect Types
// =============================================================================

/**
 * Entrance animation effect types.
 * These are the most common PowerPoint entrance animations.
 */
export type EntranceEffect =
  | "appear"
  | "fade"
  | "fadeZoom"
  | "fly"
  | "float"
  | "split"
  | "wipe"
  | "shape"
  | "wheel"
  | "randomBars"
  | "grow"
  | "swivel"
  | "zoom"
  | "bounce";

/**
 * Emphasis animation effect types.
 */
export type EmphasisEffect = "pulse" | "colorPulse" | "teeter" | "spin" | "grow" | "shrink" | "transparency";

/**
 * Exit animation effect types.
 */
export type ExitEffect = "disappear" | "fade" | "fly" | "float" | "wipe" | "zoom";

/**
 * Motion path types.
 */
export type MotionPathType = "line" | "arc" | "turn" | "circle" | "custom";

/**
 * Animation trigger type.
 */
export type AnimationTrigger = "onClick" | "withPrevious" | "afterPrevious";

/**
 * Direction for directional effects.
 */
export type AnimationDirection =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight"
  | "in"
  | "out";

/**
 * Simple animation specification for adding to slides.
 */
export type SimpleAnimationSpec = {
  /** Target shape ID */
  readonly shapeId: string;
  /** Preset class (entrance, exit, emphasis, motion) */
  readonly class: PresetClass;
  /** Effect type */
  readonly effect: string;
  /** Trigger type */
  readonly trigger?: AnimationTrigger;
  /** Duration in milliseconds */
  readonly duration?: number;
  /** Delay before animation starts (milliseconds) */
  readonly delay?: number;
  /** Direction for directional effects */
  readonly direction?: AnimationDirection;
  /** Repeat count (or "indefinite") */
  readonly repeat?: number | "indefinite";
  /** Auto-reverse */
  readonly autoReverse?: boolean;
};

// =============================================================================
// Effect Preset Mapping
// =============================================================================

/**
 * Preset IDs for entrance effects.
 * @see MS-OE376 Table 4.6.3
 */
const ENTRANCE_PRESET_IDS: Record<string, number> = {
  appear: 1,
  fly: 2,
  blinds: 3,
  box: 4,
  checkerboard: 5,
  circle: 6,
  crawl: 7,
  diamond: 8,
  dissolve: 9,
  fade: 10,
  flash: 11,
  peek: 12,
  plus: 13,
  randomBars: 14,
  splits: 15,
  strips: 16,
  wedge: 17,
  wheel: 18,
  wipe: 19,
  zoom: 20,
  float: 21,
  grow: 22,
  bounce: 23,
  swivel: 24,
  fadeZoom: 53,
};

/**
 * Preset IDs for emphasis effects.
 */
const EMPHASIS_PRESET_IDS: Record<string, number> = {
  pulse: 1,
  colorPulse: 2,
  teeter: 3,
  spin: 4,
  grow: 5,
  shrink: 6,
  transparency: 7,
  boldFlash: 8,
  blink: 9,
  wave: 10,
};

/**
 * Preset IDs for exit effects.
 */
const EXIT_PRESET_IDS: Record<string, number> = {
  disappear: 1,
  fly: 2,
  blinds: 3,
  box: 4,
  checkerboard: 5,
  circle: 6,
  crawl: 7,
  diamond: 8,
  dissolve: 9,
  fade: 10,
  flash: 11,
  peek: 12,
  plus: 13,
  randomBars: 14,
  splits: 15,
  strips: 16,
  wedge: 17,
  wheel: 18,
  wipe: 19,
  zoom: 20,
};

/**
 * Direction to subtype mapping.
 */
const DIRECTION_SUBTYPES: Record<string, number> = {
  left: 1,
  right: 2,
  top: 3,
  bottom: 4,
  topLeft: 5,
  topRight: 6,
  bottomLeft: 7,
  bottomRight: 8,
  in: 16,
  out: 32,
};

function getPresetId(effectClass: PresetClass, effect: string): number {
  switch (effectClass) {
    case "entrance":
      return ENTRANCE_PRESET_IDS[effect] ?? 1;
    case "exit":
      return EXIT_PRESET_IDS[effect] ?? 1;
    case "emphasis":
      return EMPHASIS_PRESET_IDS[effect] ?? 1;
    default:
      return 1;
  }
}

// =============================================================================
// Animation Building
// =============================================================================

let timeNodeIdCounter = 1;

function nextTimeNodeId(): number {
  return timeNodeIdCounter++;
}

function resetTimeNodeIdCounter(): void {
  timeNodeIdCounter = 1;
}

/**
 * Build a shape target for animation.
 */
function buildShapeTarget(shapeId: string): ShapeTarget {
  return {
    type: "shape",
    shapeId,
  };
}

/**
 * Build the effect behavior for an animation.
 */
function buildEffectBehavior(spec: SimpleAnimationSpec): TimeNode {
  const target = buildShapeTarget(spec.shapeId);
  const duration = spec.duration ?? 500;
  const presetId = getPresetId(spec.class, spec.effect);
  const subtype = spec.direction ? DIRECTION_SUBTYPES[spec.direction] : undefined;

  // For simple effects, use p:set for visibility + p:animEffect for the effect
  const id = nextTimeNodeId();

  // Determine the filter based on effect type
  let filter = "fade";
  if (spec.effect === "wipe") filter = "wipe(right)";
  else if (spec.effect === "blinds") filter = "blinds(horizontal)";
  else if (spec.effect === "fly") filter = "slide(fromBottom)";
  else if (spec.effect === "zoom") filter = "zoom";
  else if (spec.effect === "wheel") filter = "wheel(1)";
  else if (spec.effect === "randomBars") filter = "randombar(horizontal)";

  const transition = spec.class === "exit" ? "out" : "in";

  const effectNode: AnimateEffectBehavior = {
    type: "animateEffect",
    id,
    duration,
    fill: "hold",
    target,
    transition,
    filter,
    preset: {
      id: presetId,
      class: spec.class,
      subtype,
    },
    autoReverse: spec.autoReverse,
    repeatCount: spec.repeat,
  };

  return effectNode;
}

/**
 * Build a visibility set behavior (for appear/disappear).
 */
function buildVisibilitySet(shapeId: string, visible: boolean): SetBehavior {
  return {
    type: "set",
    id: nextTimeNodeId(),
    duration: 1,
    fill: "hold",
    target: buildShapeTarget(shapeId),
    attribute: "style.visibility",
    value: visible ? "visible" : "hidden",
  };
}

/**
 * Build a parallel container for effect nodes.
 */
function buildEffectContainer(spec: SimpleAnimationSpec): ParallelTimeNode {
  const effectNode = buildEffectBehavior(spec);
  const containerId = nextTimeNodeId();

  // For entrance effects, set initial visibility to hidden then visible
  const children: TimeNode[] = [];

  if (spec.class === "entrance") {
    // Add visibility set to visible at start
    children.push(buildVisibilitySet(spec.shapeId, true));
  }

  children.push(effectNode);

  if (spec.class === "exit") {
    // Add visibility set to hidden at end
    children.push(buildVisibilitySet(spec.shapeId, false));
  }

  const delayValue = spec.delay ?? 0;
  const startConditions =
    spec.trigger === "afterPrevious"
      ? [{ event: "onEnd" as const, delay: delayValue }]
      : spec.trigger === "withPrevious"
        ? [{ delay: delayValue }]
        : [{ event: "onClick" as const, delay: delayValue }];

  return {
    type: "parallel",
    id: containerId,
    fill: "hold",
    children,
    startConditions,
    nodeType:
      spec.trigger === "onClick" ? "clickEffect" : spec.trigger === "withPrevious" ? "withEffect" : "afterEffect",
  };
}

/**
 * Build the timing tree for a set of animations.
 */
function buildTimingTree(animations: readonly SimpleAnimationSpec[]): Timing {
  resetTimeNodeIdCounter();

  if (animations.length === 0) {
    return {};
  }

  // Build click groups
  const clickGroups: ParallelTimeNode[][] = [];
  let currentGroup: ParallelTimeNode[] = [];

  for (const anim of animations) {
    const container = buildEffectContainer(anim);

    if (anim.trigger === "onClick" || anim.trigger === undefined) {
      // New click group
      if (currentGroup.length > 0) {
        clickGroups.push(currentGroup);
      }
      currentGroup = [container];
    } else {
      // Add to current group
      currentGroup.push(container);
    }
  }

  if (currentGroup.length > 0) {
    clickGroups.push(currentGroup);
  }

  // Build sequence of click effects
  const sequenceChildren: TimeNode[] = clickGroups.map((group, index) => {
    if (group.length === 1) {
      return group[0];
    }
    // Multiple animations in same click - wrap in parallel
    return {
      type: "parallel" as const,
      id: nextTimeNodeId(),
      fill: "hold" as const,
      children: group,
      nodeType: index === 0 ? "clickEffect" : "afterEffect",
    } as ParallelTimeNode;
  });

  // Main sequence
  const mainSeq: SequenceTimeNode = {
    type: "sequence",
    id: nextTimeNodeId(),
    duration: "indefinite",
    nodeType: "mainSeq",
    children: sequenceChildren,
    concurrent: false,
    nextAction: "seek",
    prevAction: "skip",
  };

  // Root parallel node
  const root: ParallelTimeNode = {
    type: "parallel",
    id: nextTimeNodeId(),
    duration: "indefinite",
    nodeType: "tmRoot",
    children: [mainSeq],
  };

  return {
    rootTimeNode: root,
  };
}

// =============================================================================
// Slide Patching
// =============================================================================

/**
 * Add animations to a slide document.
 *
 * @param slideDoc - The slide XML document
 * @param animations - Array of animation specifications
 * @returns Updated slide document with animations
 */
export function addAnimationsToSlide(slideDoc: XmlDocument, animations: readonly SimpleAnimationSpec[]): XmlDocument {
  if (animations.length === 0) {
    return slideDoc;
  }

  const timing = buildTimingTree(animations);
  const timingEl = serializeTiming(timing);

  if (!timingEl) {
    return slideDoc;
  }

  // Add namespace if needed - create new element with namespace
  const timingElWithNs: XmlElement = {
    ...timingEl,
    attrs: {
      ...timingEl.attrs,
      "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    },
  };

  // Find the p:sld element and add p:timing
  const newChildren = slideDoc.children.map((child) => {
    if (!isXmlElement(child) || child.name !== "p:sld") {
      return child;
    }

    // Remove existing p:timing if present
    const filteredChildren = child.children.filter((c) => !isXmlElement(c) || c.name !== "p:timing");

    // Add new p:timing at the end
    return {
      ...child,
      children: [...filteredChildren, timingElWithNs],
    };
  });

  return {
    ...slideDoc,
    children: newChildren,
  };
}

/**
 * Remove all animations from a slide.
 *
 * @param slideDoc - The slide XML document
 * @returns Updated slide document without animations
 */
export function removeAnimationsFromSlide(slideDoc: XmlDocument): XmlDocument {
  const newChildren = slideDoc.children.map((child) => {
    if (!isXmlElement(child) || child.name !== "p:sld") {
      return child;
    }

    return {
      ...child,
      children: child.children.filter((c) => !isXmlElement(c) || c.name !== "p:timing"),
    };
  });

  return {
    ...slideDoc,
    children: newChildren,
  };
}
