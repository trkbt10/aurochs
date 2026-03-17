/**
 * @file Adapters for react-editor-ui text sections
 *
 * Converts between PPTX MixedRunProperties and react-editor-ui data types.
 * Types are defined locally to match react-editor-ui's structural expectations.
 */

import type { RunProperties } from "@aurochs-office/pptx/domain/text";
import { pt, px } from "@aurochs-office/drawing-ml/domain/units";
import type { FontData, FontMetricsData, CaseTransformData, TextStyle } from "@aurochs-ui/editor-core/adapter-types";
import type { MixedRunProperties } from "../../editors/text/mixed-properties";
import { getExtractionValue } from "../../editors/text/mixed-properties";

// =============================================================================
// FontMetrics adapter
// =============================================================================

/** Convert MixedRunProperties to FontMetricsData for react-editor-ui FontMetrics section. */
export function mixedRunToFontMetrics(mixed: MixedRunProperties): FontMetricsData {
  const fontSize = getExtractionValue(mixed.fontSize);
  const spacing = getExtractionValue(mixed.spacing);
  const kerning = getExtractionValue(mixed.kerning);

  return {
    size: fontSize !== undefined ? `${fontSize as number} pt` : "",
    leading: "auto",
    kerning: kerning !== undefined && (kerning as number) > 0 ? "auto" : "none",
    tracking: spacing !== undefined ? `${spacing as number}` : "0",
  };
}

/** Convert FontMetricsData back to a partial RunProperties update for applying font metric changes. */
export function fontMetricsToRunUpdate(data: FontMetricsData): Partial<RunProperties> {
  const update: Record<string, unknown> = {};

  if (data.size) {
    const parsed = parseFloat(data.size);
    if (!Number.isNaN(parsed) && parsed > 0) {
      update.fontSize = pt(parsed);
    }
  }

  if (data.tracking !== "0" && data.tracking !== "") {
    const parsed = parseFloat(data.tracking);
    if (!Number.isNaN(parsed)) {
      update.spacing = px(parsed);
    }
  }

  return update as Partial<RunProperties>;
}

// =============================================================================
// Font adapter
// =============================================================================

/** Convert MixedRunProperties to FontData for react-editor-ui Font section. */
export function mixedRunToFont(mixed: MixedRunProperties): FontData {
  const fontFamily = getExtractionValue(mixed.fontFamily);
  const bold = getExtractionValue(mixed.bold);

  return {
    family: fontFamily ?? "",
    weight: bold === true ? "bold" : "400",
  };
}

/** Convert FontData back to a partial RunProperties update for applying font changes. */
export function fontToRunUpdate(data: FontData): Partial<RunProperties> {
  const update: Record<string, unknown> = {};

  if (data.family) {
    update.fontFamily = data.family;
  }

  if (data.weight === "bold") {
    update.bold = true;
  } else if (data.weight === "400") {
    update.bold = false;
  }

  return update as Partial<RunProperties>;
}

// =============================================================================
// CaseTransform adapter
// =============================================================================

function capsToCase(caps: string | undefined): CaseTransformData["case"] {
  if (caps === "small") { return "small-caps"; }
  if (caps === "all") { return "all-caps"; }
  return "normal";
}

/** Convert MixedRunProperties to CaseTransformData for react-editor-ui CaseTransform section. */
export function mixedRunToCaseTransform(mixed: MixedRunProperties): CaseTransformData {
  const caps = getExtractionValue(mixed.caps);
  const underline = getExtractionValue(mixed.underline);
  const strike = getExtractionValue(mixed.strike);
  const baseline = getExtractionValue(mixed.baseline);

  const capsValue = capsToCase(caps);

  const styles: TextStyle[] = [];
  if (underline !== undefined && underline !== "none") { styles.push("underline"); }
  if (strike !== undefined && strike !== "noStrike") { styles.push("strikethrough"); }
  if (baseline !== undefined && baseline > 0) { styles.push("superscript"); }
  if (baseline !== undefined && baseline < 0) { styles.push("subscript"); }

  return { case: capsValue, styles };
}

/** Convert CaseTransformData back to a partial RunProperties update for applying case/style changes. */
export function caseTransformToRunUpdate(data: CaseTransformData): Partial<RunProperties> {
  const update: Record<string, unknown> = {};

  if (data.case === "small-caps") {
    update.caps = "small";
  } else if (data.case === "all-caps") {
    update.caps = "all";
  } else {
    update.caps = "none";
  }

  update.underline = data.styles.includes("underline") ? "sng" : "none";
  update.strike = data.styles.includes("strikethrough") ? "sngStrike" : "noStrike";

  if (data.styles.includes("superscript")) {
    update.baseline = 30;
  } else if (data.styles.includes("subscript")) {
    update.baseline = -25;
  } else {
    update.baseline = 0;
  }

  return update as Partial<RunProperties>;
}
