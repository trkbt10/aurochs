/**
 * @file Context-aware segmentation using Normalized Compression Distance (NCD).
 *
 * This module provides a generic segmentation primitive that can be reused for
 * text-like units in different domains. It is also adapted for `GroupedText`
 * produced by spatial block segmentation.
 */

import { deflateSync } from "fflate";
import type { GroupedText, TextBounds } from "../contracts/types";

const DEFAULT_WINDOW_SIZE = 1;
const DEFAULT_MERGE_THRESHOLD = 0.22;
const DEFAULT_STRONG_MERGE_THRESHOLD = 0.1;
const DEFAULT_MIN_COMBINED_CHARS = 48;
const DEFAULT_MIN_X_AXIS_OVERLAP_RATIO = 0.3;
const DEFAULT_BOUNDARY_CONTEXT_CHARS = 220;
const DEFAULT_CONTEXT_PARAGRAPH_EDGE_COUNT = 2;
const DEFAULT_SUFFIX_PREFIX_MERGE_RATIO = 0.75;
const DEFAULT_SUFFIX_PREFIX_MERGE_MIN_CHARS = 10;

const ENCODER = new TextEncoder();

export type ContextualSegmentationUnit<T> = {
  readonly text: string;
  readonly value: T;
};

export type ContextualBoundaryDecisionReason =
  | "strong-ncd"
  | "suffix-prefix-overlap"
  | "threshold-ncd"
  | "ncd-too-high"
  | "insufficient-length"
  | "blocked-by-callback";

export type ContextualBoundaryScore = {
  /** Boundary between units[index] and units[index + 1] */
  readonly index: number;
  readonly ncd: number;
  readonly leftTextLength: number;
  readonly rightTextLength: number;
  readonly merge: boolean;
  readonly reason: ContextualBoundaryDecisionReason;
};

export type ContextualSegment<T> = {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly units: readonly ContextualSegmentationUnit<T>[];
  readonly text: string;
};

export type ContextualSegmentationResult<T> = {
  readonly threshold: number;
  readonly boundaries: readonly ContextualBoundaryScore[];
  readonly segments: readonly ContextualSegment<T>[];
};

export type ContextualBoundaryDecisionInput<T> = {
  readonly index: number;
  readonly leftUnit: ContextualSegmentationUnit<T>;
  readonly rightUnit: ContextualSegmentationUnit<T>;
  readonly ncd: number;
};

export type ContextualNcdSegmentationOptions<T> = {
  /** Number of units per side in boundary context windows (default: 1). */
  readonly windowSize?: number;
  /** Merge when NCD <= this threshold (default: 0.22). */
  readonly mergeThreshold?: number;
  /** Merge regardless of size when NCD <= this threshold (default: 0.10). */
  readonly strongMergeThreshold?: number;
  /** Require this many combined chars for standard-threshold merge (default: 48). */
  readonly minCombinedChars?: number;
  /** Limit boundary context to this many characters from each side (default: 220). */
  readonly boundaryContextChars?: number;
  /** Merge when suffix-prefix overlap ratio reaches this value (default: 0.75). */
  readonly suffixPrefixMergeRatio?: number;
  /** Minimum overlap chars to trigger suffix-prefix merge (default: 10). */
  readonly suffixPrefixMergeMinChars?: number;
  /** Optional adaptive threshold from lower quantile of observed NCD values. */
  readonly adaptiveMergePercentile?: number;
  /** Additional domain-specific merge gate. */
  readonly canMergeBoundary?: (input: ContextualBoundaryDecisionInput<T>) => boolean;
};

export type GroupedContextSegment = {
  readonly startGroupIndex: number;
  readonly endGroupIndex: number;
  readonly groups: readonly GroupedText[];
  readonly text: string;
  readonly bounds: TextBounds;
};

export type GroupedContextBoundaryScore = ContextualBoundaryScore & {
  readonly xAxisOverlapRatio: number;
};

export type GroupedContextSegmentationResult = {
  readonly threshold: number;
  readonly boundaries: readonly GroupedContextBoundaryScore[];
  readonly segments: readonly GroupedContextSegment[];
};

export type GroupedContextSegmentationOptions = Omit<ContextualNcdSegmentationOptions<GroupedText>, "canMergeBoundary"> & {
  /** Require at least this horizontal overlap ratio to allow merge (default: 0.30). */
  readonly minXAxisOverlapRatio?: number;
  /** Paragraph count sampled from both head/tail for NCD signature (default: 2). */
  readonly contextParagraphEdgeCount?: number;
};

function clamp(args: { readonly value: number; readonly min: number; readonly max: number }): number {
  const { value, min, max } = args;
  return Math.min(max, Math.max(min, value));
}

function quantile(args: { readonly values: readonly number[]; readonly q: number }): number {
  const { values, q } = args;
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const qq = clamp({ value: q, min: 0, max: 1 });
  const position = (sorted.length - 1) * qq;
  const base = Math.floor(position);
  const rest = position - base;

  const current = sorted[base] ?? 0;
  const next = sorted[base + 1];
  if (next === undefined) {
    return current;
  }
  return current + rest * (next - current);
}

function compressedSize(args: { readonly text: string; readonly cache: Map<string, number> }): number {
  const { text, cache } = args;
  const cached = cache.get(text);
  if (cached !== undefined) {
    return cached;
  }

  const size = deflateSync(ENCODER.encode(text)).length;
  cache.set(text, size);
  return size;
}

function normalizedCompressionDistance(args: {
  readonly left: string;
  readonly right: string;
  readonly cache: Map<string, number>;
}): number {
  const { left, right, cache } = args;
  if (left.length === 0 && right.length === 0) {
    return 0;
  }
  if (left.length === 0 || right.length === 0) {
    return 1;
  }

  const cLeft = compressedSize({ text: left, cache });
  const cRight = compressedSize({ text: right, cache });
  const cBoth = compressedSize({ text: left + right, cache });
  const maxSide = Math.max(cLeft, cRight);
  if (maxSide === 0) {
    return 0;
  }

  const minSide = Math.min(cLeft, cRight);
  return (cBoth - minSide) / maxSide;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function groupText(group: GroupedText): string {
  return normalizeText(group.paragraphs.map((paragraph) => paragraph.runs.map((run) => run.text).join("")).join("\n"));
}

function groupParagraphTexts(group: GroupedText): readonly string[] {
  return group.paragraphs
    .map((paragraph) => normalizeText(paragraph.runs.map((run) => run.text).join("")))
    .filter((text) => text.length > 0);
}

function groupContextSignature(args: { readonly group: GroupedText; readonly edgeCount: number }): string {
  const { group, edgeCount } = args;
  const paragraphs = groupParagraphTexts(group);
  if (paragraphs.length <= edgeCount * 2) {
    return paragraphs.join("\n");
  }

  const head = paragraphs.slice(0, edgeCount);
  const tail = paragraphs.slice(paragraphs.length - edgeCount);
  return [...head, ...tail].join("\n");
}

function resolveAdaptiveMergePercentile<T>(options: ContextualNcdSegmentationOptions<T> | undefined): number {
  const percentile = options?.adaptiveMergePercentile;
  if (percentile === undefined) {
    return 0;
  }
  return clamp({ value: percentile, min: 0, max: 1 });
}

function resolveOptions<T>(options: ContextualNcdSegmentationOptions<T> | undefined): Required<ContextualNcdSegmentationOptions<T>> {
  const windowSizeRaw = options?.windowSize ?? DEFAULT_WINDOW_SIZE;
  const windowSize = Math.max(1, Math.floor(windowSizeRaw));

  const mergeThresholdRaw = options?.mergeThreshold ?? DEFAULT_MERGE_THRESHOLD;
  const strongMergeThresholdRaw = options?.strongMergeThreshold ?? DEFAULT_STRONG_MERGE_THRESHOLD;
  const mergeThreshold = clamp({ value: mergeThresholdRaw, min: 0, max: 1 });
  const strongMergeThreshold = clamp({ value: strongMergeThresholdRaw, min: 0, max: mergeThreshold });

  const minCombinedCharsRaw = options?.minCombinedChars ?? DEFAULT_MIN_COMBINED_CHARS;
  const minCombinedChars = Math.max(1, Math.floor(minCombinedCharsRaw));
  const boundaryContextCharsRaw = options?.boundaryContextChars ?? DEFAULT_BOUNDARY_CONTEXT_CHARS;
  const boundaryContextChars = Math.max(32, Math.floor(boundaryContextCharsRaw));
  const suffixPrefixMergeRatioRaw = options?.suffixPrefixMergeRatio ?? DEFAULT_SUFFIX_PREFIX_MERGE_RATIO;
  const suffixPrefixMergeRatio = clamp({ value: suffixPrefixMergeRatioRaw, min: 0, max: 1 });
  const suffixPrefixMergeMinCharsRaw = options?.suffixPrefixMergeMinChars ?? DEFAULT_SUFFIX_PREFIX_MERGE_MIN_CHARS;
  const suffixPrefixMergeMinChars = Math.max(1, Math.floor(suffixPrefixMergeMinCharsRaw));

  const adaptiveMergePercentile = resolveAdaptiveMergePercentile(options);

  const canMergeBoundary = options?.canMergeBoundary ?? (() => true);

  return {
    windowSize,
    mergeThreshold,
    strongMergeThreshold,
    minCombinedChars,
    boundaryContextChars,
    suffixPrefixMergeRatio,
    suffixPrefixMergeMinChars,
    adaptiveMergePercentile,
    canMergeBoundary,
  };
}

function takeHeadByCodePoint(args: { readonly text: string; readonly maxChars: number }): string {
  const { text, maxChars } = args;
  const chars = Array.from(text);
  if (chars.length <= maxChars) {
    return text;
  }
  return chars.slice(0, maxChars).join("");
}

function takeTailByCodePoint(args: { readonly text: string; readonly maxChars: number }): string {
  const { text, maxChars } = args;
  const chars = Array.from(text);
  if (chars.length <= maxChars) {
    return text;
  }
  return chars.slice(chars.length - maxChars).join("");
}

function boundaryWindowText<T>(args: {
  readonly units: readonly ContextualSegmentationUnit<T>[];
  readonly index: number;
  readonly windowSize: number;
  readonly boundaryContextChars: number;
}): { readonly left: string; readonly right: string } {
  const { units, index, windowSize, boundaryContextChars } = args;

  const leftStart = Math.max(0, index - windowSize + 1);
  const left = units.slice(leftStart, index + 1).map((unit) => unit.text).join("\n");

  const rightEndExclusive = Math.min(units.length, index + 1 + windowSize);
  const right = units.slice(index + 1, rightEndExclusive).map((unit) => unit.text).join("\n");

  return {
    left: takeTailByCodePoint({ text: left, maxChars: boundaryContextChars }),
    right: takeHeadByCodePoint({ text: right, maxChars: boundaryContextChars }),
  };
}

function chooseMergeThreshold(args: {
  readonly baseThreshold: number;
  readonly adaptiveMergePercentile: number;
  readonly ncdValues: readonly number[];
}): number {
  const { baseThreshold, adaptiveMergePercentile, ncdValues } = args;
  if (adaptiveMergePercentile <= 0 || ncdValues.length === 0) {
    return baseThreshold;
  }
  const adaptive = quantile({ values: ncdValues, q: adaptiveMergePercentile });
  return Math.min(baseThreshold, adaptive);
}

function suffixPrefixOverlapChars(args: {
  readonly left: string;
  readonly right: string;
  readonly minChars: number;
}): number {
  const { left, right, minChars } = args;
  const leftChars = Array.from(left);
  const rightChars = Array.from(right);
  const maxOverlap = Math.min(leftChars.length, rightChars.length);
  if (maxOverlap < minChars) {
    return 0;
  }

  const candidates = Array.from({ length: maxOverlap - minChars + 1 }, (_, offset) => maxOverlap - offset);
  const matched = candidates.find((length) => {
    const leftSlice = leftChars.slice(leftChars.length - length).join("");
    const rightSlice = rightChars.slice(0, length).join("");
    return leftSlice === rightSlice;
  });
  if (matched === undefined) {
    return 0;
  }
  return matched;
}

function decideBoundary<T>(args: {
  readonly index: number;
  readonly leftUnit: ContextualSegmentationUnit<T>;
  readonly rightUnit: ContextualSegmentationUnit<T>;
  readonly ncd: number;
  readonly mergeThreshold: number;
  readonly strongMergeThreshold: number;
  readonly minCombinedChars: number;
  readonly suffixPrefixMergeRatio: number;
  readonly suffixPrefixMergeMinChars: number;
  readonly canMergeBoundary: (input: ContextualBoundaryDecisionInput<T>) => boolean;
}): ContextualBoundaryScore {
  const {
    index,
    leftUnit,
    rightUnit,
    ncd,
    mergeThreshold,
    strongMergeThreshold,
    minCombinedChars,
    suffixPrefixMergeRatio,
    suffixPrefixMergeMinChars,
    canMergeBoundary,
  } = args;

  const leftTextLength = Array.from(leftUnit.text).length;
  const rightTextLength = Array.from(rightUnit.text).length;

  const gateInput: ContextualBoundaryDecisionInput<T> = {
    index,
    leftUnit,
    rightUnit,
    ncd,
  };
  const gatePass = canMergeBoundary(gateInput);
  if (!gatePass) {
    return {
      index,
      ncd,
      leftTextLength,
      rightTextLength,
      merge: false,
      reason: "blocked-by-callback",
    };
  }

  if (ncd <= strongMergeThreshold) {
    return {
      index,
      ncd,
      leftTextLength,
      rightTextLength,
      merge: true,
      reason: "strong-ncd",
    };
  }

  const overlapChars = suffixPrefixOverlapChars({
    left: leftUnit.text,
    right: rightUnit.text,
    minChars: suffixPrefixMergeMinChars,
  });
  const smallerTextLength = Math.min(leftTextLength, rightTextLength);
  if (smallerTextLength > 0) {
    const overlapRatio = overlapChars / smallerTextLength;
    if (overlapRatio >= suffixPrefixMergeRatio) {
      return {
        index,
        ncd,
        leftTextLength,
        rightTextLength,
        merge: true,
        reason: "suffix-prefix-overlap",
      };
    }
  }

  const combinedLength = leftTextLength + rightTextLength;
  if (combinedLength < minCombinedChars) {
    return {
      index,
      ncd,
      leftTextLength,
      rightTextLength,
      merge: false,
      reason: "insufficient-length",
    };
  }

  if (ncd <= mergeThreshold) {
    return {
      index,
      ncd,
      leftTextLength,
      rightTextLength,
      merge: true,
      reason: "threshold-ncd",
    };
  }

  return {
    index,
    ncd,
    leftTextLength,
    rightTextLength,
    merge: false,
    reason: "ncd-too-high",
  };
}

function buildSegments<T>(args: {
  readonly units: readonly ContextualSegmentationUnit<T>[];
  readonly boundaries: readonly ContextualBoundaryScore[];
}): readonly ContextualSegment<T>[] {
  const { units, boundaries } = args;
  if (units.length === 0) {
    return [];
  }

  const splitStarts = [0, ...boundaries.filter((boundary) => !boundary.merge).map((boundary) => boundary.index + 1)];

  return splitStarts.map((start, index) => {
    const nextStart = splitStarts[index + 1];
    const end = nextStart === undefined ? units.length - 1 : nextStart - 1;
    const slice = units.slice(start, end + 1);
    return {
      startIndex: start,
      endIndex: end,
      units: slice,
      text: slice.map((unit) => unit.text).join("\n"),
    };
  });
}

/**
 * Segment arbitrary text units by contextual similarity (NCD).
 */
export function segmentTextUnitsByContext<T>(
  units: readonly ContextualSegmentationUnit<T>[],
  options?: ContextualNcdSegmentationOptions<T>,
): ContextualSegmentationResult<T> {
  const normalizedUnits = units
    .map((unit) => ({
      ...unit,
      text: normalizeText(unit.text),
    }))
    .filter((unit) => unit.text.length > 0);

  if (normalizedUnits.length === 0) {
    return {
      threshold: DEFAULT_MERGE_THRESHOLD,
      boundaries: [],
      segments: [],
    };
  }

  if (normalizedUnits.length === 1) {
    return {
      threshold: DEFAULT_MERGE_THRESHOLD,
      boundaries: [],
      segments: [{
        startIndex: 0,
        endIndex: 0,
        units: normalizedUnits,
        text: normalizedUnits[0]?.text ?? "",
      }],
    };
  }

  const resolved = resolveOptions(options);
  const cache = new Map<string, number>();

  const ncdValues = Array.from({ length: normalizedUnits.length - 1 }, (_, index) => {
    const window = boundaryWindowText({
      units: normalizedUnits,
      index,
      windowSize: resolved.windowSize,
      boundaryContextChars: resolved.boundaryContextChars,
    });
    return normalizedCompressionDistance({
      left: window.left,
      right: window.right,
      cache,
    });
  });

  const effectiveThreshold = chooseMergeThreshold({
    baseThreshold: resolved.mergeThreshold,
    adaptiveMergePercentile: resolved.adaptiveMergePercentile,
    ncdValues,
  });

  const boundaries = ncdValues.map((boundaryNcd, index) => {
    const leftUnit = normalizedUnits[index];
    const rightUnit = normalizedUnits[index + 1];
    if (!leftUnit || !rightUnit) {
      throw new Error(`segmentTextUnitsByContext: missing unit at boundary ${index}`);
    }

    return decideBoundary({
      index,
      leftUnit,
      rightUnit,
      ncd: boundaryNcd,
      mergeThreshold: effectiveThreshold,
      strongMergeThreshold: resolved.strongMergeThreshold,
      minCombinedChars: resolved.minCombinedChars,
      suffixPrefixMergeRatio: resolved.suffixPrefixMergeRatio,
      suffixPrefixMergeMinChars: resolved.suffixPrefixMergeMinChars,
      canMergeBoundary: resolved.canMergeBoundary,
    });
  });

  return {
    threshold: effectiveThreshold,
    boundaries,
    segments: buildSegments({ units: normalizedUnits, boundaries }),
  };
}

function xAxisOverlapRatio(args: { readonly left: TextBounds; readonly right: TextBounds }): number {
  const { left, right } = args;
  const leftEnd = left.x + left.width;
  const rightEnd = right.x + right.width;
  const overlap = Math.max(0, Math.min(leftEnd, rightEnd) - Math.max(left.x, right.x));
  const denominator = Math.min(left.width, right.width);
  if (denominator <= 0) {
    return 0;
  }
  return overlap / denominator;
}

function mergeTextBounds(boundsList: readonly TextBounds[]): TextBounds {
  const first = boundsList[0];
  if (!first) {
    throw new Error("mergeTextBounds requires at least one bounds");
  }

  const minX = Math.min(...boundsList.map((bounds) => bounds.x));
  const minY = Math.min(...boundsList.map((bounds) => bounds.y));
  const maxX = Math.max(...boundsList.map((bounds) => bounds.x + bounds.width));
  const maxY = Math.max(...boundsList.map((bounds) => bounds.y + bounds.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Segment `GroupedText` blocks into larger contextual segments.
 *
 * Spatial guard: groups are merged only when x-axis overlap is high enough,
 * preventing accidental merge across side-by-side columns.
 */
export function segmentGroupedTextByContext(
  groups: readonly GroupedText[],
  options?: GroupedContextSegmentationOptions,
): GroupedContextSegmentationResult {
  const minXAxisOverlapRatio = options?.minXAxisOverlapRatio ?? DEFAULT_MIN_X_AXIS_OVERLAP_RATIO;
  const contextParagraphEdgeCountRaw = options?.contextParagraphEdgeCount ?? DEFAULT_CONTEXT_PARAGRAPH_EDGE_COUNT;
  const contextParagraphEdgeCount = Math.max(1, Math.floor(contextParagraphEdgeCountRaw));

  const units: readonly ContextualSegmentationUnit<GroupedText>[] = groups.map((group) => ({
    text: groupContextSignature({ group, edgeCount: contextParagraphEdgeCount }),
    value: group,
  }));

  const baseResult = segmentTextUnitsByContext(units, {
    ...options,
    canMergeBoundary: ({ leftUnit, rightUnit }) => {
      const overlapRatio = xAxisOverlapRatio({
        left: leftUnit.value.bounds,
        right: rightUnit.value.bounds,
      });
      return overlapRatio >= minXAxisOverlapRatio;
    },
  });

  const overlapByBoundary = new Map<number, number>(
    groups.slice(0, -1).map((leftGroup, index) => {
      const rightGroup = groups[index + 1];
      if (!rightGroup) {
        return [index, 0];
      }
      const overlap = xAxisOverlapRatio({ left: leftGroup.bounds, right: rightGroup.bounds });
      return [index, overlap];
    }),
  );

  const boundaries: readonly GroupedContextBoundaryScore[] = baseResult.boundaries.map((boundary) => ({
    ...boundary,
    xAxisOverlapRatio: overlapByBoundary.get(boundary.index) ?? 0,
  }));

  const segments: readonly GroupedContextSegment[] = baseResult.segments.map((segment) => {
    const grouped = segment.units.map((unit) => unit.value);
    return {
      startGroupIndex: segment.startIndex,
      endGroupIndex: segment.endIndex,
      groups: grouped,
      text: grouped.map((group) => groupText(group)).join("\n"),
      bounds: mergeTextBounds(grouped.map((group) => group.bounds)),
    };
  });

  return {
    threshold: baseResult.threshold,
    boundaries,
    segments,
  };
}
