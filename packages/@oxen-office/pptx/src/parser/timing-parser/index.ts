/**
 * @file Timing/Animation parser - exports
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

// Main timing parser
export { parseTiming, findTimingElement, parseSlideTimingData } from "./parse-timing";

// Submodule exports
export {
  mapAccumulateMode,
  mapAdditiveMode,
  mapBuildType,
  mapCalcMode,
  mapChartBuildStep,
  mapChartBuildType,
  mapChartOnlyBuildType,
  mapChartSubelementType,
  mapCommandType,
  mapConditionEvent,
  mapDgmBuildStep,
  mapDgmBuildType,
  mapDgmOnlyBuildType,
  mapFillBehavior,
  mapIterateType,
  mapNextAction,
  mapOleChartBuildType,
  mapOverrideMode,
  mapParaBuildType,
  mapPresetClass,
  mapPrevAction,
  mapRestartBehavior,
  mapTimeNodeMasterRelation,
  mapTimeNodeSyncType,
  mapTimeNodeType,
  mapTransformType,
  mapTriggerRuntimeNode,
  mapValueType,
  parseDuration,
  parseRepeatCount,
} from "./mapping";

export { parseGraphicElementTarget, parseShapeTarget, parseTargetElement, parseTextElementTarget } from "./target";

export { parseAnimateValue, parseKeyframe, parseKeyframes } from "./keyframe";

export { parseCondition, parseConditionList, parseTimeCondition } from "./condition";

export { parseBuildGraphic, parseBuildList, parseBuildOleChart, parseBuildParagraph } from "./build-list";

export { parseCommonBehavior, parseCommonTimeNode, parsePresetInfo } from "./common";

export {
  parseAnimateBehavior,
  parseAnimateColorBehavior,
  parseAnimateEffectBehavior,
  parseAnimateMotionBehavior,
  parseAnimateRotationBehavior,
  parseAnimateScaleBehavior,
  parseAudioBehavior,
  parseCommandBehavior,
  parseSetBehavior,
  parseVideoBehavior,
} from "./behavior";

export {
  parseExclusiveTimeNode,
  parseParallelTimeNode,
  parseRootTimeNode,
  parseSequenceTimeNode,
  parseTimeNodeElement,
  parseTimeNodeList,
} from "./time-node";

export { parseBuildChartElement, parseBuildDgmElement } from "./graphic-build";
