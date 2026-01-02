/**
 * @file Timing/Animation mapping functions
 *
 * Maps OOXML attribute values to domain types.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */
/* eslint-disable jsdoc/require-jsdoc -- mapping helpers are small and self-explanatory */

import type {
  FillBehavior,
  RestartBehavior,
  TimeNodeSyncType,
  TimeNodeMasterRelation,
  TimeNodeType,
  PresetClass,
  CalcMode,
  ValueType,
  AccumulateMode,
  OverrideMode,
  TransformType,
  AdditiveMode,
  BuildType,
  ParaBuildType,
  ChartBuildStep,
  DgmBuildStep,
  AnimationChartOnlyBuildType,
  AnimationChartBuildType,
  AnimationDgmOnlyBuildType,
  AnimationDgmBuildType,
  AnimationOleChartBuildType,
  ChartSubelementType,
  CommandType,
  ConditionEvent,
  TriggerRuntimeNode,
  IterateType,
  NextActionType,
  PreviousActionType,
} from "../../domain/animation";

export function parseDuration(dur: string | undefined): number | "indefinite" | undefined {
  if (!dur) {
    return undefined;
  }
  if (dur === "indefinite") {
    return "indefinite";
  }
  return parseInt(dur, 10);
}

export function parseRepeatCount(val: string | undefined): number | "indefinite" | undefined {
  if (!val) {
    return undefined;
  }
  if (val === "indefinite") {
    return "indefinite";
  }
  // RepeatCount is in 1/1000, so 1000 = 1 repeat
  return parseInt(val, 10) / 1000;
}

export function mapFillBehavior(val: string | undefined): FillBehavior | undefined {
  switch (val) {
    case "hold": return "hold";
    case "transition": return "transition";
    case "freeze": return "freeze";
    case "remove": return "remove";
    default: return undefined;
  }
}

export function mapRestartBehavior(val: string | undefined): RestartBehavior | undefined {
  switch (val) {
    case "always": return "always";
    case "whenNotActive": return "whenNotActive";
    case "never": return "never";
    default: return undefined;
  }
}

export function mapTimeNodeSyncType(val: string | undefined): TimeNodeSyncType | undefined {
  switch (val) {
    case "canSlip": return "canSlip";
    case "locked": return "locked";
    default: return undefined;
  }
}

export function mapTimeNodeMasterRelation(val: string | undefined): TimeNodeMasterRelation | undefined {
  switch (val) {
    case "lastClick": return "lastClick";
    case "nextClick": return "nextClick";
    case "sameClick": return "sameClick";
    default: return undefined;
  }
}

export function mapTimeNodeType(val: string | undefined): TimeNodeType | undefined {
  switch (val) {
    case "tmRoot": return "tmRoot";
    case "mainSeq": return "mainSeq";
    case "interactiveSeq": return "interactiveSeq";
    case "clickEffect": return "clickEffect";
    case "withEffect": return "withEffect";
    case "afterEffect": return "afterEffect";
    case "clickPar": return "clickPar";
    case "withGroup": return "withGroup";
    case "afterGroup": return "afterGroup";
    default: return undefined;
  }
}

export function mapPresetClass(val: string | undefined): PresetClass | undefined {
  switch (val) {
    case "entr": return "entrance";
    case "exit": return "exit";
    case "emph": return "emphasis";
    case "path": return "motion";
    case "verb": return "verb";
    case "mediacall": return "mediaCall";
    default: return undefined;
  }
}

export function mapConditionEvent(val: string | undefined): ConditionEvent | undefined {
  switch (val) {
    case "begin": return "begin";
    case "end": return "end";
    case "onBegin": return "onBegin";
    case "onEnd": return "onEnd";
    case "onClick": return "onClick";
    case "onDblClick": return "onDoubleClick";
    case "onMouseOver": return "onMouseOver";
    case "onMouseOut": return "onMouseOut";
    case "onNext": return "onNext";
    case "onPrev": return "onPrev";
    case "onStopAudio": return "onStopAudio";
    default: return undefined;
  }
}

export function mapTriggerRuntimeNode(val: string | undefined): TriggerRuntimeNode | undefined {
  switch (val) {
    case "all": return "all";
    case "first": return "first";
    case "last": return "last";
    default: return undefined;
  }
}

export function mapIterateType(val: string | undefined): IterateType | undefined {
  switch (val) {
    case "el": return "element";
    case "wd": return "word";
    case "lt": return "letter";
    default: return undefined;
  }
}

export function mapNextAction(val: string | undefined): NextActionType | undefined {
  switch (val) {
    case "none": return "none";
    case "seek": return "seek";
    default: return undefined;
  }
}

export function mapPrevAction(val: string | undefined): PreviousActionType | undefined {
  switch (val) {
    case "none": return "none";
    case "skip": return "skip";
    default: return undefined;
  }
}

export function mapCalcMode(val: string | undefined): CalcMode | undefined {
  switch (val) {
    case "discrete": return "discrete";
    case "lin": return "linear";
    case "fmla": return "formula";
    default: return undefined;
  }
}

export function mapValueType(val: string | undefined): ValueType | undefined {
  switch (val) {
    case "str": return "string";
    case "num": return "number";
    case "clr": return "color";
    default: return undefined;
  }
}

export function mapAdditiveMode(val: string | undefined): AdditiveMode | undefined {
  switch (val) {
    case "base": return "base";
    case "sum": return "sum";
    case "repl": return "replace";
    case "mult": return "multiply";
    case "none": return "none";
    default: return undefined;
  }
}

export function mapAccumulateMode(val: string | undefined): AccumulateMode | undefined {
  switch (val) {
    case "always": return "always";
    case "none": return "none";
    default: return undefined;
  }
}

export function mapOverrideMode(val: string | undefined): OverrideMode | undefined {
  switch (val) {
    case "normal": return "normal";
    case "childStyle": return "childStyle";
    default: return undefined;
  }
}

export function mapTransformType(val: string | undefined): TransformType | undefined {
  switch (val) {
    case "pt": return "pt";
    case "img": return "img";
    default: return undefined;
  }
}

export function mapBuildType(val: string | undefined): BuildType | undefined {
  switch (val) {
    case "allAtOnce": return "allAtOnce";
    case "p": return "paragraph";
    case "wd": return "word";
    case "char": return "character";
    default: return undefined;
  }
}

export function mapParaBuildType(val: string | undefined): ParaBuildType | undefined {
  switch (val) {
    case "allAtOnce": return "allAtOnce";
    case "p": return "paragraph";
    case "cust": return "custom";
    case "whole": return "whole";
    default: return undefined;
  }
}

export function mapChartBuildStep(val: string | undefined): ChartBuildStep | undefined {
  switch (val) {
    case "allPts": return "allPts";
    case "category": return "category";
    case "gridLegend": return "gridLegend";
    case "ptInCategory": return "ptInCategory";
    case "ptInSeries": return "ptInSeries";
    case "series": return "series";
    default: return undefined;
  }
}

export function mapDgmBuildStep(val: string | undefined): DgmBuildStep | undefined {
  switch (val) {
    case "bg": return "bg";
    case "sp": return "sp";
    default: return undefined;
  }
}

export function mapChartOnlyBuildType(val: string | undefined): AnimationChartOnlyBuildType | undefined {
  switch (val) {
    case "category": return "category";
    case "categoryEl": return "categoryEl";
    case "series": return "series";
    case "seriesEl": return "seriesEl";
    default: return undefined;
  }
}

export function mapChartBuildType(val: string | undefined): AnimationChartBuildType | undefined {
  return mapBuildType(val) ?? mapChartOnlyBuildType(val);
}

export function mapChartSubelementType(val: string | undefined): ChartSubelementType | undefined {
  switch (val) {
    case "category": return "category";
    case "gridLegend": return "gridLegend";
    case "ptInCategory": return "ptInCategory";
    case "ptInSeries": return "ptInSeries";
    case "series": return "series";
    default: return undefined;
  }
}

export function mapCommandType(val: string | undefined): CommandType | undefined {
  switch (val) {
    case "call": return "call";
    case "evt": return "event";
    case "verb": return "verb";
    default: return undefined;
  }
}

export function mapDgmOnlyBuildType(val: string | undefined): AnimationDgmOnlyBuildType | undefined {
  switch (val) {
    case "whole": return "whole";
    case "depthByNode": return "depthByNode";
    case "depthByBranch": return "depthByBranch";
    case "breadthByNode": return "breadthByNode";
    case "breadthByLvl": return "breadthByLvl";
    case "cw": return "cw";
    case "cwIn": return "cwIn";
    case "cwOut": return "cwOut";
    case "ccw": return "ccw";
    case "ccwIn": return "ccwIn";
    case "ccwOut": return "ccwOut";
    case "inByRing": return "inByRing";
    case "outByRing": return "outByRing";
    case "up": return "up";
    case "down": return "down";
    case "allAtOnce": return "allAtOnce";
    case "cust": return "cust";
    default: return undefined;
  }
}

export function mapDgmBuildType(val: string | undefined): AnimationDgmBuildType | undefined {
  return mapDgmOnlyBuildType(val);
}

export function mapOleChartBuildType(val: string | undefined): AnimationOleChartBuildType | undefined {
  if (val === "allAtOnce") {
    return "allAtOnce";
  }
  return mapChartOnlyBuildType(val);
}
