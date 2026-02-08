/**
 * @file Animation/Timing domain types for PPTX processing
 *
 * These types represent the logical structure of animations, independent of OOXML.
 * They follow the ECMA-376 Section 19.5 conceptual model.
 *
 * @see ECMA-376 Part 1, Section 19.5 - Animation
 */

import type { ShapeId } from "./types";

// =============================================================================
// Core Types
// =============================================================================

/**
 * Root timing information for a slide.
 * @see ECMA-376 Part 1, Section 19.5.87 (p:timing)
 */
export type Timing = {
  /** Root time node (typically a parallel container) */
  readonly rootTimeNode?: TimeNode;
  /** Build list for incremental animations */
  readonly buildList?: readonly BuildEntry[];
};

/**
 * Time node ID.
 * @see ECMA-376 Part 1, Section 19.7.42 (ST_TLTimeNodeID)
 */
export type TimeNodeId = number;

/**
 * Build entry for incremental text/diagram builds.
 * @see ECMA-376 Part 1, Section 19.5.12 (p:bldP)
 */
export type BuildEntry = {
  /** Target shape ID */
  readonly shapeId: ShapeId;
  /** Group ID for animation grouping */
  readonly groupId?: number;
  /** Build type */
  readonly buildType?: ParaBuildType;
  /** Auto-advance time */
  readonly advanceAfter?: TLTime;
  /** Whether to animate background */
  readonly animateBackground?: boolean;
  /** Reverse order */
  readonly reverse?: boolean;
  /** Expand UI state */
  readonly uiExpand?: boolean;
  /** Graphic build properties */
  readonly graphicBuild?: GraphicBuild;
  /** Embedded chart build properties */
  readonly oleChartBuild?: OleChartBuild;
  /** Template effects for paragraph levels */
  readonly templateEffects?: readonly TemplateEffect[];
};

/**
 * Template effect for build paragraph levels.
 * @see ECMA-376 Part 1, Section 19.5.84 (p:tmpl)
 */
export type TemplateEffect = {
  /** Paragraph level */
  readonly level?: number;
  /** Time nodes for the template */
  readonly timeNodes: readonly TimeNode[];
};

/**
 * Build type for incremental animations.
 */
export type BuildType =
  | "allAtOnce"    // All paragraphs at once
  | "paragraph"    // One paragraph at a time
  | "word"         // One word at a time
  | "character";   // One character at a time

/**
 * Paragraph build type.
 * @see ECMA-376 Part 1, Section 19.7.36 (ST_TLParaBuildType)
 */
export type ParaBuildType =
  | "allAtOnce"
  | "paragraph"
  | "custom"
  | "whole";

/**
 * Time value (milliseconds or indefinite).
 * @see ECMA-376 Part 1, Section 19.7.38 (ST_TLTime)
 */
export type TLTimeIndefinite = "indefinite";

/**
 * Time value (milliseconds or indefinite).
 * @see ECMA-376 Part 1, Section 19.7.38 (ST_TLTime)
 * @see ECMA-376 Part 1, Section 19.7.40 (ST_TLTimeIndefinite)
 */
export type TLTime = number | TLTimeIndefinite;

/**
 * Keyframe time value (percentage or indefinite).
 * @see ECMA-376 Part 1, Section 19.7.39 (ST_TLTimeAnimateValueTime)
 */
export type TLTimeAnimateValueTime = number | TLTimeIndefinite;

/**
 * Chart animation build step.
 * @see ECMA-376 Part 1, Section 20.1.10.13 (ST_ChartBuildStep)
 */
export type ChartBuildStep =
  | "allPts"
  | "category"
  | "gridLegend"
  | "ptInCategory"
  | "ptInSeries"
  | "series";

/**
 * Diagram animation build step.
 * @see ECMA-376 Part 1, Section 20.1.10.20 (ST_DgmBuildStep)
 */
export type DgmBuildStep =
  | "bg"
  | "sp";

/**
 * Chart-only build types for chart animations.
 */
export type AnimationChartOnlyBuildType =
  | "category"
  | "categoryEl"
  | "series"
  | "seriesEl";

/**
 * Build type for chart animations (text + chart-specific).
 */
export type AnimationChartBuildType = BuildType | AnimationChartOnlyBuildType;

/**
 * Diagram build types for diagram animations.
 * @see ECMA-376 Part 1, Section 19.7.33 (ST_TLDiagramBuildType)
 */
export type AnimationDgmOnlyBuildType =
  | "whole"
  | "depthByNode"
  | "depthByBranch"
  | "breadthByNode"
  | "breadthByLvl"
  | "cw"
  | "cwIn"
  | "cwOut"
  | "ccw"
  | "ccwIn"
  | "ccwOut"
  | "inByRing"
  | "outByRing"
  | "up"
  | "down"
  | "allAtOnce"
  | "cust";

/**
 * Build type for diagram animations.
 */
export type AnimationDgmBuildType = AnimationDgmOnlyBuildType;

/**
 * Embedded chart build types for animation.
 * @see ECMA-376 Part 1, Section 19.7.35 (ST_TLOleChartBuildType)
 */
export type AnimationOleChartBuildType =
  | "allAtOnce"
  | AnimationChartOnlyBuildType;

/**
 * Chart build properties (bldChart)
 * @see ECMA-376 Part 1, Section 20.1.2.2.1 (bldChart)
 */
export type ChartBuild = {
  readonly build?: AnimationChartBuildType;
  readonly animateBackground?: boolean;
};

/**
 * Diagram build properties (bldDgm)
 * @see ECMA-376 Part 1, Section 20.1.2.2.2 (bldDgm)
 */
export type DgmBuild = {
  readonly build?: AnimationDgmBuildType;
};

/**
 * Embedded chart build properties (bldOleChart).
 */
export type OleChartBuild = {
  readonly build?: AnimationOleChartBuildType;
  readonly animateBackground?: boolean;
};

/**
 * Graphic build properties (bldGraphic).
 */
export type GraphicBuild =
  | { readonly type: "asOne" }
  | {
      readonly type: "sub";
      readonly chartBuild?: ChartBuild;
      readonly diagramBuild?: DgmBuild;
    };

// =============================================================================
// Effect Types (MS-OE376 Part 4 Section 4.6.3)
// =============================================================================

/**
 * Effect filter type enumeration.
 *
 * Defines the visual effect types for animations as specified in MS-OE376.
 *
 * @see MS-OE376 Part 4 Section 4.6.3
 */
export type EffectType =
  | "fade"         // Fade transition (no subtype)
  | "slide"        // Slide from direction: fromTop, fromBottom, fromLeft, fromRight
  | "wipe"         // Wipe from direction: right, left, up, down
  | "blinds"       // Horizontal/vertical blinds
  | "box"          // Box in/out
  | "checkerboard" // Checkerboard across/down
  | "circle"       // Circle in/out
  | "diamond"      // Diamond in/out
  | "dissolve"     // Dissolve effect (no subtype)
  | "strips"       // Diagonal strips: downLeft, upLeft, downRight, upRight
  | "wheel"        // Wheel with spokes: 1, 2, 3, 4, 8
  | "plus"         // Plus/cross shape in/out
  | "barn"         // Barn door: inVertical, inHorizontal, outVertical, outHorizontal
  | "randombar"    // Random bars: horizontal, vertical
  | "wedge";       // Wedge shape (no subtype)

/**
 * Effect direction/subtype.
 *
 * Specifies the direction or variant for directional effects.
 *
 * @see MS-OE376 Part 4 Section 4.6.3
 */
export type EffectDirection =
  | "in" | "out"                                    // box, circle, diamond, plus
  | "left" | "right" | "up" | "down"                // wipe, slide
  | "horizontal" | "vertical"                       // blinds, randombar
  | "across" | "downward"                           // checkerboard
  | "downLeft" | "upLeft" | "downRight" | "upRight" // strips
  | "inVertical" | "inHorizontal" | "outVertical" | "outHorizontal"; // barn

// =============================================================================
// Time Node Types
// =============================================================================

/**
 * Base time node with common properties.
 * @see ECMA-376 Part 1, Section 19.5.33 (p:cTn)
 */
export type TimeNodeBase = {
  /** Unique time node ID */
  readonly id: TimeNodeId;
  /** Duration in milliseconds, or "indefinite" */
  readonly duration?: number | TLTimeIndefinite;
  /** Fill behavior after animation ends */
  readonly fill?: FillBehavior;
  /** Restart behavior */
  readonly restart?: RestartBehavior;
  /** Sync behavior */
  readonly syncBehavior?: TimeNodeSyncType;
  /** Master relation behavior */
  readonly masterRelation?: TimeNodeMasterRelation;
  /** Start conditions */
  readonly startConditions?: readonly Condition[];
  /** End conditions */
  readonly endConditions?: readonly Condition[];
  /** End sync condition */
  readonly endSync?: Condition;
  /** Sub time nodes */
  readonly subTimeNodes?: readonly TimeNode[];
  /** Iterate behavior */
  readonly iterate?: IterateData;
  /** Node type */
  readonly nodeType?: TimeNodeType;
  /** Preset animation info */
  readonly preset?: PresetInfo;
  /** Acceleration (0-100) */
  readonly acceleration?: number;
  /** Deceleration (0-100) */
  readonly deceleration?: number;
  /** Auto reverse */
  readonly autoReverse?: boolean;
  /** Repeat count */
  readonly repeatCount?: number | TLTimeIndefinite;
  /** Speed percentage (100 = normal) */
  readonly speed?: number;
};

/**
 * Iterate behavior for time nodes.
 * @see ECMA-376 Part 1, Section 19.5.49 (p:iterate)
 */
export type IterateData = {
  /** Iterate type (element/word/letter) */
  readonly type?: IterateType;
  /** Whether to run backwards */
  readonly backwards?: boolean;
  /** Iterate interval */
  readonly interval?: IterateInterval;
};

export type IterateType =
  | "element"
  | "word"
  | "letter";

export type IterateInterval =
  | { readonly type: "absolute"; readonly value: number }
  | { readonly type: "percentage"; readonly value: number };

/**
 * Next action type for sequence nodes.
 * @see ECMA-376 Part 1, Section 19.7.34 (ST_TLNextActionType)
 */
export type NextActionType = "none" | "seek";

/**
 * Previous action type for sequence nodes.
 * @see ECMA-376 Part 1, Section 19.7.37 (ST_TLPreviousActionType)
 */
export type PreviousActionType = "none" | "skip";

/**
 * Parallel time node - children execute simultaneously.
 * @see ECMA-376 Part 1, Section 19.5.53 (p:par)
 */
export type ParallelTimeNode = TimeNodeBase & {
  readonly type: "parallel";
  readonly children: readonly TimeNode[];
};

/**
 * Sequence time node - children execute in order.
 * @see ECMA-376 Part 1, Section 19.5.65 (p:seq)
 */
export type SequenceTimeNode = TimeNodeBase & {
  readonly type: "sequence";
  readonly children: readonly TimeNode[];
  /** Whether to run concurrently with previous */
  readonly concurrent?: boolean;
  /** Next action */
  readonly nextAction?: NextActionType;
  /** Previous action */
  readonly prevAction?: PreviousActionType;
  /** Previous conditions */
  readonly prevConditions?: readonly Condition[];
  /** Next conditions */
  readonly nextConditions?: readonly Condition[];
};

/**
 * Exclusive time node - only one child can be active.
 * @see ECMA-376 Part 1, Section 19.5.29 (p:excl)
 */
export type ExclusiveTimeNode = TimeNodeBase & {
  readonly type: "exclusive";
  readonly children: readonly TimeNode[];
};

/**
 * Animate behavior - property animation over time.
 * @see ECMA-376 Part 1, Section 19.5.1 (p:anim)
 */
export type AnimateBehavior = TimeNodeBase & {
  readonly type: "animate";
  readonly target: AnimationTarget;
  readonly attribute: string;
  readonly keyframes?: readonly Keyframe[];
  readonly from?: AnimateValue;
  readonly to?: AnimateValue;
  readonly by?: AnimateValue;
  readonly calcMode?: CalcMode;
  readonly valueType?: ValueType;
  readonly additive?: AdditiveMode;
  readonly accumulate?: AccumulateMode;
  readonly override?: OverrideMode;
  readonly transformType?: TransformType;
};

/**
 * Set behavior - instant property change.
 * @see ECMA-376 Part 1, Section 19.5.66 (p:set)
 */
export type SetBehavior = TimeNodeBase & {
  readonly type: "set";
  readonly target: AnimationTarget;
  readonly attribute: string;
  readonly value: AnimateValue;
  readonly accumulate?: AccumulateMode;
  readonly override?: OverrideMode;
  readonly transformType?: TransformType;
};

/**
 * Animate effect - visual effect animation.
 * @see ECMA-376 Part 1, Section 19.5.3 (p:animEffect)
 */
export type AnimateEffectBehavior = TimeNodeBase & {
  readonly type: "animateEffect";
  readonly target: AnimationTarget;
  readonly transition: "in" | "out" | "none";
  readonly filter: string;
  readonly progress?: AnimateValue;
  readonly accumulate?: AccumulateMode;
  readonly override?: OverrideMode;
  readonly transformType?: TransformType;
};

/**
 * Animate motion - path-based movement.
 * @see ECMA-376 Part 1, Section 19.5.4 (p:animMotion)
 */
export type AnimateMotionBehavior = TimeNodeBase & {
  readonly type: "animateMotion";
  readonly target: AnimationTarget;
  /** SVG-like path string */
  readonly path?: string;
  /** Origin point */
  readonly origin?: AnimateMotionOrigin;
  /** Path edit mode */
  readonly pathEditMode?: AnimateMotionPathEditMode;
  /** Rotation center (percent-based coordinates) */
  readonly rotationCenter?: Point;
  /** From point */
  readonly from?: Point;
  /** To point */
  readonly to?: Point;
  /** By offset */
  readonly by?: Point;
  readonly accumulate?: AccumulateMode;
  readonly override?: OverrideMode;
  readonly transformType?: TransformType;
};

/**
 * Animate rotation.
 * @see ECMA-376 Part 1, Section 19.5.5 (p:animRot)
 */
export type AnimateRotationBehavior = TimeNodeBase & {
  readonly type: "animateRotation";
  readonly target: AnimationTarget;
  readonly from?: number;
  readonly to?: number;
  readonly by?: number;
  readonly accumulate?: AccumulateMode;
  readonly override?: OverrideMode;
  readonly transformType?: TransformType;
};

/**
 * Animate scale.
 * @see ECMA-376 Part 1, Section 19.5.6 (p:animScale)
 */
export type AnimateScaleBehavior = TimeNodeBase & {
  readonly type: "animateScale";
  readonly target: AnimationTarget;
  readonly fromX?: number;
  readonly fromY?: number;
  readonly toX?: number;
  readonly toY?: number;
  readonly byX?: number;
  readonly byY?: number;
  readonly accumulate?: AccumulateMode;
  readonly override?: OverrideMode;
  readonly transformType?: TransformType;
};

/**
 * Animate color.
 * @see ECMA-376 Part 1, Section 19.5.2 (p:animClr)
 */
export type AnimateColorBehavior = TimeNodeBase & {
  readonly type: "animateColor";
  readonly target: AnimationTarget;
  readonly attribute: string;
  readonly colorSpace?: AnimateColorSpace;
  readonly direction?: AnimateColorDirection;
  readonly from?: string;
  readonly to?: string;
  readonly by?: string;
  readonly accumulate?: AccumulateMode;
  readonly override?: OverrideMode;
  readonly transformType?: TransformType;
};

/**
 * Audio playback.
 * @see ECMA-376 Part 1, Section 19.5.7 (p:audio)
 */
export type AudioBehavior = TimeNodeBase & {
  readonly type: "audio";
  readonly target: AnimationTarget;
  readonly isNarration?: boolean;
};

/**
 * Video playback.
 * @see ECMA-376 Part 1, Section 19.5.93 (p:video)
 */
export type VideoBehavior = TimeNodeBase & {
  readonly type: "video";
  readonly target: AnimationTarget;
  readonly fullscreen?: boolean;
};

/**
 * Command execution.
 * @see ECMA-376 Part 1, Section 19.5.17 (p:cmd)
 */
export type CommandBehavior = TimeNodeBase & {
  readonly type: "command";
  readonly target: AnimationTarget;
  readonly commandType: CommandType;
  readonly command: string;
  readonly accumulate?: AccumulateMode;
  readonly override?: OverrideMode;
  readonly transformType?: TransformType;
};

/**
 * Union of all time node types.
 */
export type TimeNode =
  | ParallelTimeNode
  | SequenceTimeNode
  | ExclusiveTimeNode
  | AnimateBehavior
  | SetBehavior
  | AnimateEffectBehavior
  | AnimateMotionBehavior
  | AnimateRotationBehavior
  | AnimateScaleBehavior
  | AnimateColorBehavior
  | AudioBehavior
  | VideoBehavior
  | CommandBehavior;

// =============================================================================
// Supporting Types
// =============================================================================

/**
 * Animate color direction.
 * @see ECMA-376 Part 1, Section 19.7.22 (ST_TLAnimateColorDirection)
 */
export type AnimateColorDirection = "cw" | "ccw";

/**
 * Animate color space.
 * @see ECMA-376 Part 1, Section 19.7.23 (ST_TLAnimateColorSpace)
 */
export type AnimateColorSpace = "rgb" | "hsl";

/**
 * Animate motion origin.
 * @see ECMA-376 Part 1, Section 19.7.25 (ST_TLAnimateMotionBehaviorOrigin)
 */
export type AnimateMotionOrigin = "parent" | "layout";

/**
 * Animate motion path edit mode.
 * @see ECMA-376 Part 1, Section 19.7.26 (ST_TLAnimateMotionPathEditMode)
 */
export type AnimateMotionPathEditMode = "fixed" | "relative";

/**
 * Chart subelement target type.
 * @see ECMA-376 Part 1, Section 19.7.31 (ST_TLChartSubelementType)
 */
export type ChartSubelementType =
  | "category"
  | "gridLegend"
  | "ptInCategory"
  | "ptInSeries"
  | "series";

/**
 * Command type.
 * @see ECMA-376 Part 1, Section 19.7.32 (ST_TLCommandType)
 */
export type CommandType = "call" | "event" | "verb";

/**
 * Animation target specification.
 * @see ECMA-376 Part 1, Section 19.5.81 (p:tgtEl)
 */
export type AnimationTarget =
  | ShapeTarget
  | SlideTarget
  | SoundTarget
  | InkTarget;

/**
 * Shape target for animation.
 * @see ECMA-376 Part 1, Section 19.5.70 (p:spTgt)
 */
export type ShapeTarget = {
  readonly type: "shape";
  readonly shapeId: ShapeId;
  /** Text element subset */
  readonly textElement?: TextElementTarget;
  /** Sub-shape ID */
  readonly subShapeId?: ShapeId;
  /** Target background */
  readonly targetBackground?: boolean;
  /** Graphic element target */
  readonly graphicElement?: GraphicElementTarget;
  /** Embedded chart element target */
  readonly oleChartElement?: OleChartElementTarget;
};

/**
 * Text element target within a shape.
 */
export type TextElementTarget =
  | { readonly type: "paragraph"; readonly start: number; readonly end: number }
  | { readonly type: "character"; readonly start: number; readonly end: number };

/**
 * Graphic element target within a shape.
 */
export type GraphicElementTarget =
  | { readonly type: "diagram"; readonly id?: string }
  | { readonly type: "chart"; readonly id?: string }
  | { readonly type: "table"; readonly id?: string }
  | { readonly type: "graphic"; readonly id?: string }
  | { readonly type: "unknown"; readonly name: string; readonly id?: string };

/**
 * Embedded chart element target within a shape.
 */
export type OleChartElementTarget = {
  readonly type?: ChartSubelementType;
  readonly level?: number;
};

/**
 * Slide target for animation.
 */
export type SlideTarget = {
  readonly type: "slide";
};

/**
 * Sound target for animation.
 */
export type SoundTarget = {
  readonly type: "sound";
  readonly resourceId: string;
  readonly name?: string;
};

/**
 * Ink target for animation.
 * @see ECMA-376 Part 1, Section 19.5.47 (p:inkTgt)
 */
export type InkTarget = {
  readonly type: "ink";
  readonly shapeId: ShapeId;
};

/**
 * Keyframe for time-based animation.
 * @see ECMA-376 Part 1, Section 19.5.78 (p:tav)
 */
export type Keyframe = {
  /** Time as percentage (0-100) */
  readonly time: TLTimeAnimateValueTime;
  /** Value at this keyframe */
  readonly value: AnimateValue;
  /** Optional formula */
  readonly formula?: string;
};

/**
 * Animation value - can be string, number, boolean, or color.
 */
export type AnimateValue =
  | string
  | number
  | boolean;

/**
 * 2D point for motion paths.
 */
export type Point = {
  readonly x: number;
  readonly y: number;
};

/**
 * Condition for starting/ending animations.
 * @see ECMA-376 Part 1, Section 19.5.25 (p:cond)
 */
export type Condition = {
  /** Delay in milliseconds, or "indefinite" */
  readonly delay?: number | TLTimeIndefinite;
  /** Trigger event */
  readonly event?: ConditionEvent;
  /** Target for event */
  readonly target?: AnimationTarget;
  /** Reference to another time node */
  readonly timeNodeRef?: TimeNodeId;
  /** Runtime node selection */
  readonly runtimeNode?: TriggerRuntimeNode;
};

/**
 * Trigger event.
 * @see ECMA-376 Part 1, Section 19.7.48 (ST_TLTriggerEvent)
 */
export type TriggerEvent =
  | "begin"
  | "end"
  | "onBegin"
  | "onEnd"
  | "onClick"
  | "onDoubleClick"
  | "onMouseOver"
  | "onMouseOut"
  | "onNext"
  | "onPrev"
  | "onStopAudio";

/**
 * Condition trigger events.
 */
export type ConditionEvent = TriggerEvent;

/**
 * Trigger runtime node.
 * @see ECMA-376 Part 1, Section 19.7.49 (ST_TLTriggerRuntimeNode)
 */
export type TriggerRuntimeNode =
  | "all"
  | "first"
  | "last";

// =============================================================================
// Enumerations
// =============================================================================

/**
 * Time node fill type.
 * @see ECMA-376 Part 1, Section 19.7.41 (ST_TLTimeNodeFillType)
 */
export type TimeNodeFillType =
  | "hold"       // Hold final state
  | "transition" // Transition to next
  | "freeze"     // Freeze at end
  | "remove";    // Remove effect

/**
 * Fill behavior after animation ends.
 * @see ECMA-376 Part 1, Section 19.5.33
 */
export type FillBehavior = TimeNodeFillType;

/**
 * Time node restart type.
 * @see ECMA-376 Part 1, Section 19.7.45 (ST_TLTimeNodeRestartType)
 */
export type TimeNodeRestartType =
  | "always"
  | "whenNotActive"
  | "never";

/**
 * Restart behavior.
 */
export type RestartBehavior = TimeNodeRestartType;

/**
 * Time node sync type.
 * @see ECMA-376 Part 1, Section 19.7.46 (ST_TLTimeNodeSyncType)
 */
export type TimeNodeSyncType =
  | "canSlip"
  | "locked";

/**
 * Time node master relation.
 * @see ECMA-376 Part 1, Section 19.7.43 (ST_TLTimeNodeMasterRelation)
 */
export type TimeNodeMasterRelation =
  | "lastClick"
  | "nextClick"
  | "sameClick";

/**
 * Time node type.
 * @see ECMA-376 Part 1, Section 19.7.47 (ST_TLTimeNodeType)
 */
export type TimeNodeType =
  | "tmRoot"         // Timing root
  | "mainSeq"        // Main sequence
  | "interactiveSeq" // Interactive sequence
  | "clickEffect"    // Click effect
  | "withEffect"     // With effect
  | "afterEffect"    // After effect
  | "clickPar"       // Click paragraph
  | "withGroup"      // With group
  | "afterGroup";    // After group

/**
 * Preset animation info.
 */
export type PresetInfo = {
  /** Preset ID (e.g., 1 = appear, 2 = fly in) */
  readonly id: number;
  /** Preset class */
  readonly class: PresetClass;
  /** Preset subtype */
  readonly subtype?: number;
};

/**
 * Time node preset class.
 * @see ECMA-376 Part 1, Section 19.7.44 (ST_TLTimeNodePresetClassType)
 */
export type TimeNodePresetClassType =
  | "entrance"   // Entrance animation
  | "exit"       // Exit animation
  | "emphasis"   // Emphasis animation
  | "motion"     // Motion path
  | "verb"       // OLE verb
  | "mediaCall"; // Media call

/**
 * Preset animation class.
 */
export type PresetClass = TimeNodePresetClassType;

/**
 * Calculation mode for interpolation.
 */
export type CalcMode =
  | "discrete"   // No interpolation
  | "linear"     // Linear interpolation
  | "formula";   // Formula-based

/**
 * Value type for animation.
 */
export type ValueType =
  | "string"
  | "number"
  | "color";

/**
 * Accumulate mode for animations.
 */
export type AccumulateMode =
  | "none"    // No accumulation
  | "always"; // Accumulate with each iteration

/**
 * Override mode for animations.
 */
export type OverrideMode =
  | "normal"
  | "childStyle";

/**
 * Transform type for animations.
 */
export type TransformType =
  | "pt"
  | "img";

/**
 * Additive mode for animations.
 */
export type AdditiveMode =
  | "base"     // Replace base value
  | "sum"      // Add to base
  | "replace"  // Replace completely
  | "multiply" // Multiply with base
  | "none";    // No additive behavior
