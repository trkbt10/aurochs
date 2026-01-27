/**
 * @file Grouping strategy configuration for PDF → PPTX conversion
 *
 * Provides a "strategy-like" configuration layer on top of the existing
 * pluggable text grouping function, and allows disabling table inference.
 */

import type { TextGroupingFn } from "./text-grouping/types";
import { noGrouping } from "./text-grouping/no-grouping";
import { createSpatialGrouping, spatialGrouping, type SpatialGroupingOptions } from "./text-grouping/spatial-grouping";

export type PdfGroupingPreset = "none" | "text" | "full";

export type PdfTextGroupingStrategy =
  | { readonly type: "none" }
  | { readonly type: "spatial"; readonly options?: SpatialGroupingOptions }
  | { readonly type: "custom"; readonly fn: TextGroupingFn };

export type PdfTableGroupingStrategy = {
  /**
   * Enable table conversion (table region detection + table inference).
   * Default: true (keeps current behavior).
   */
  readonly enabled?: boolean;

  /**
   * Enable table region detection from paths (early table-first segmentation).
   * Default: true.
   */
  readonly detectRegions?: boolean;

  /**
   * Enable table inference from grouped texts (later inference pass).
   * Default: true.
   */
  readonly inferFromTextGroups?: boolean;
};

export type PdfGroupingStrategyOptions = {
  /**
   * Convenience preset for stepwise application.
   *
   * - "none": no text grouping + no table conversion
   * - "text": text grouping only (no table conversion)
   * - "full": text grouping + table conversion (default behavior)
   */
  readonly preset?: PdfGroupingPreset;

  /** Text grouping strategy (defaults to spatial grouping). */
  readonly text?: PdfTextGroupingStrategy;

  /** Table-related grouping strategy toggles. */
  readonly tables?: PdfTableGroupingStrategy;
};

export type ResolvedPdfGroupingStrategy = {
  readonly textGroupingFn: TextGroupingFn;
  readonly tablesEnabled: boolean;
  readonly detectTableRegions: boolean;
  readonly inferTablesFromTextGroups: boolean;
};

const DEFAULT_TABLES: Required<PdfTableGroupingStrategy> = {
  enabled: true,
  detectRegions: true,
  inferFromTextGroups: true,
};

const defaultTextStrategy: PdfTextGroupingStrategy = { type: "spatial" } as const;

function resolveTextGroupingFn(strategy: PdfTextGroupingStrategy): TextGroupingFn {
  switch (strategy.type) {
    case "none":
      return noGrouping;
    case "spatial":
      return strategy.options ? createSpatialGrouping(strategy.options) : spatialGrouping;
    case "custom":
      return strategy.fn;
  }
}

function presetToDefaults(preset: PdfGroupingPreset): {
  readonly text: PdfTextGroupingStrategy;
  readonly tables: Required<PdfTableGroupingStrategy>;
} {
  switch (preset) {
    case "none":
      return { text: { type: "none" }, tables: { enabled: false, detectRegions: false, inferFromTextGroups: false } };
    case "text":
      return { text: defaultTextStrategy, tables: { enabled: false, detectRegions: false, inferFromTextGroups: false } };
    case "full":
      return { text: defaultTextStrategy, tables: DEFAULT_TABLES };
  }
}

/**
 * Resolve grouping strategies for PDF → PPTX conversion.
 *
 * `textGroupingFn` is retained for backward compatibility, but must not be
 * specified together with `grouping.text` to avoid ambiguity.
 */
export function resolvePdfGroupingStrategy(input: {
  readonly grouping?: PdfGroupingStrategyOptions;
  readonly textGroupingFn?: TextGroupingFn;
}): ResolvedPdfGroupingStrategy {
  if (!input) {
    throw new Error("resolvePdfGroupingStrategy: input is required");
  }

  const grouping = input.grouping;
  const customFn = input.textGroupingFn;

  if (customFn && grouping?.text) {
    throw new Error("Specify either `textGroupingFn` or `grouping.text`, not both");
  }

  const presetDefaults = grouping?.preset ? presetToDefaults(grouping.preset) : undefined;

  const textStrategy: PdfTextGroupingStrategy =
    grouping?.text ?? (customFn ? ({ type: "custom", fn: customFn } as const) : (presetDefaults?.text ?? defaultTextStrategy));

  const tables0 = presetDefaults?.tables ?? DEFAULT_TABLES;
  const tables: Required<PdfTableGroupingStrategy> = {
    enabled: grouping?.tables?.enabled ?? tables0.enabled,
    detectRegions: grouping?.tables?.detectRegions ?? tables0.detectRegions,
    inferFromTextGroups: grouping?.tables?.inferFromTextGroups ?? tables0.inferFromTextGroups,
  };

  const tablesEnabled = tables.enabled;
  return {
    textGroupingFn: resolveTextGroupingFn(textStrategy),
    tablesEnabled,
    detectTableRegions: tablesEnabled && tables.detectRegions,
    inferTablesFromTextGroups: tablesEnabled && tables.inferFromTextGroups,
  };
}

