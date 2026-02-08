/**
 * @file Conditional formatting domain types
 *
 * Defines SpreadsheetML conditional formatting structures on a worksheet.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.18 (conditionalFormatting)
 * @see ECMA-376 Part 4, Section 18.3.1.10 (cfRule)
 */

import type { CellRange } from "./cell/address";
import type { XlsxColor } from "./style/font";

// =============================================================================
// Conditional Value Object (cfvo)
// =============================================================================

/**
 * Conditional value object type.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.11 (cfvo)
 */
export type XlsxCfvoType = "num" | "percent" | "percentile" | "min" | "max" | "formula" | "autoMin" | "autoMax";

/**
 * Conditional formatting value object.
 *
 * Used by color scales, data bars, and icon sets to define thresholds.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.11 (cfvo)
 */
export type XlsxCfvo = {
  /** Type of the value object */
  readonly type: XlsxCfvoType;
  /** Value (formula, number, or percentage depending on type) */
  readonly val?: string;
  /** Whether to include equal value (used with gte in cfvo) */
  readonly gte?: boolean;
};

// =============================================================================
// Color Scale
// =============================================================================

/**
 * Color scale rule for conditional formatting.
 *
 * Creates a gradient fill based on cell values.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.16 (colorScale)
 */
export type XlsxColorScaleRule = {
  readonly type: "colorScale";
  readonly priority?: number;
  readonly stopIfTrue?: boolean;
  /** Value objects defining the scale points (2 or 3 points) */
  readonly cfvo: readonly XlsxCfvo[];
  /** Colors corresponding to each cfvo point */
  readonly colors: readonly XlsxColor[];
};

// =============================================================================
// Data Bar
// =============================================================================

/**
 * Data bar rule for conditional formatting.
 *
 * Displays a bar proportional to the cell value.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.28 (dataBar)
 */
export type XlsxDataBarRule = {
  readonly type: "dataBar";
  readonly priority?: number;
  readonly stopIfTrue?: boolean;
  /** Value objects defining min and max points */
  readonly cfvo: readonly XlsxCfvo[];
  /** Bar fill color */
  readonly color?: XlsxColor;
  /** Whether to show the cell value along with the bar */
  readonly showValue?: boolean;
  /** Minimum bar length as percentage (0-100) */
  readonly minLength?: number;
  /** Maximum bar length as percentage (0-100) */
  readonly maxLength?: number;
  /** Whether bar has gradient fill */
  readonly gradient?: boolean;
  /** Border color for the bar */
  readonly borderColor?: XlsxColor;
  /** Negative bar fill color */
  readonly negativeFillColor?: XlsxColor;
  /** Negative bar border color */
  readonly negativeBorderColor?: XlsxColor;
  /** Axis color */
  readonly axisColor?: XlsxColor;
  /** Axis position */
  readonly axisPosition?: "automatic" | "middle" | "none";
  /** Direction */
  readonly direction?: "context" | "leftToRight" | "rightToLeft";
};

// =============================================================================
// Icon Set
// =============================================================================

/**
 * Icon set names supported by Excel.
 *
 * @see ECMA-376 Part 4, Section 18.18.42 (ST_IconSetType)
 */
export type XlsxIconSetName =
  | "3Arrows"
  | "3ArrowsGray"
  | "3Flags"
  | "3Signs"
  | "3Symbols"
  | "3Symbols2"
  | "3TrafficLights1"
  | "3TrafficLights2"
  | "4Arrows"
  | "4ArrowsGray"
  | "4Rating"
  | "4RedToBlack"
  | "4TrafficLights"
  | "5Arrows"
  | "5ArrowsGray"
  | "5Quarters"
  | "5Rating";

/**
 * Icon set rule for conditional formatting.
 *
 * Displays icons based on cell value thresholds.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.49 (iconSet)
 */
export type XlsxIconSetRule = {
  readonly type: "iconSet";
  readonly priority?: number;
  readonly stopIfTrue?: boolean;
  /** Name of the icon set */
  readonly iconSet: XlsxIconSetName;
  /** Value objects defining the thresholds for each icon */
  readonly cfvo: readonly XlsxCfvo[];
  /** Whether to show the cell value along with the icon */
  readonly showValue?: boolean;
  /** Whether to reverse the icon order */
  readonly reverse?: boolean;
  /** Whether icons only (no cell values visible) */
  readonly iconOnly?: boolean;
  /** Custom icon overrides (by index) */
  readonly customIcons?: readonly XlsxCustomIcon[];
};

/**
 * Custom icon override for a specific threshold.
 */
export type XlsxCustomIcon = {
  /** Icon set to use for this icon */
  readonly iconSet: XlsxIconSetName;
  /** Icon index within the set (0-based) */
  readonly iconId: number;
};

// =============================================================================
// Standard Rule Types
// =============================================================================

/**
 * Standard conditional formatting rule (cell value, formula, etc.).
 *
 * @see ECMA-376 Part 4, Section 18.3.1.10 (cfRule)
 */
export type XlsxStandardRule = {
  readonly type:
    | "expression"
    | "cellIs"
    | "containsText"
    | "notContainsText"
    | "beginsWith"
    | "endsWith"
    | "containsBlanks"
    | "notContainsBlanks"
    | "containsErrors"
    | "notContainsErrors"
    | "timePeriod"
    | "aboveAverage"
    | "top10"
    | "duplicateValues"
    | "uniqueValues";
  readonly dxfId?: number;
  readonly priority?: number;
  readonly operator?: string;
  readonly stopIfTrue?: boolean;
  readonly formulas: readonly string[];
  /** Text value for text-based rules */
  readonly text?: string;
  /** Time period for timePeriod rules */
  readonly timePeriod?: string;
  /** Rank for top10 rules */
  readonly rank?: number;
  /** Whether top10 uses percentage */
  readonly percent?: boolean;
  /** Whether top10 is bottom instead of top */
  readonly bottom?: boolean;
  /** Standard deviation for aboveAverage rules */
  readonly stdDev?: number;
  /** Whether aboveAverage includes equal to average */
  readonly equalAverage?: boolean;
  /** Whether this is below average */
  readonly aboveAverage?: boolean;
};

// =============================================================================
// Union Types
// =============================================================================

/**
 * All conditional formatting rule types.
 */
export type XlsxConditionalFormattingRule =
  | XlsxStandardRule
  | XlsxColorScaleRule
  | XlsxDataBarRule
  | XlsxIconSetRule;

/**
 * Conditional formatting definition for a range.
 */
export type XlsxConditionalFormatting = {
  readonly sqref: string;
  readonly ranges: readonly CellRange[];
  readonly rules: readonly XlsxConditionalFormattingRule[];
};

