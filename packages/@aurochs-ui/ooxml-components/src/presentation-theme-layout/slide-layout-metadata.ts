/**
 * @file slide-layout-metadata — Single source of truth for slide layout UI metadata
 *
 * ST_SlideLayoutType labels and editor affordances shared by pptx-editor (slide props)
 * and potx-editor (layout template). Domain type: {@link SlideLayoutType} in @aurochs-office/pptx.
 *
 * @see ECMA-376 Part 1, Section 19.7.15 (ST_SlideLayoutType)
 */

import type { SlideLayoutType } from "@aurochs-office/pptx/domain";
import type { SelectOption } from "@aurochs-ui/ui-components/types";

// =============================================================================
// Layout type — display labels (exhaustive for SlideLayoutType)
// =============================================================================

/**
 * Human-readable label for each ST_SlideLayoutType value.
 * Used by layout pickers in PPTX slide properties and POTX layout editing.
 */
export const SLIDE_LAYOUT_TYPE_LABELS = {
  title: "Title",
  tx: "Text",
  twoColTx: "Two Column Text",
  tbl: "Table",
  txAndChart: "Text + Chart",
  chartAndTx: "Chart + Text",
  dgm: "Diagram",
  chart: "Chart",
  txAndClipArt: "Text + Clip Art",
  clipArtAndTx: "Clip Art + Text",
  titleOnly: "Title Only",
  blank: "Blank",
  txAndObj: "Text + Object",
  objAndTx: "Object + Text",
  objOnly: "Object Only",
  obj: "Object",
  txAndMedia: "Text + Media",
  mediaAndTx: "Media + Text",
  objOverTx: "Object over Text",
  txOverObj: "Text over Object",
  txAndTwoObj: "Text + Two Objects",
  twoObjAndTx: "Two Objects + Text",
  twoObjOverTx: "Two Objects over Text",
  fourObj: "Four Objects",
  vertTx: "Vertical Text",
  clipArtAndVertTx: "Clip Art + Vertical Text",
  vertTitleAndTx: "Vertical Title + Text",
  vertTitleAndTxOverChart: "Vertical Title + Text over Chart",
  twoObj: "Two Objects",
  objAndTwoObj: "Object + Two Objects",
  twoObjAndObj: "Two Objects + Object",
  cust: "Custom",
  secHead: "Section Header",
  twoTxTwoObj: "Two Text Two Objects",
  objTx: "Object + Text",
  picTx: "Picture + Text",
} as const satisfies Record<SlideLayoutType, string>;

/**
 * Order of layout types in shared dropdowns (after optional "Default" row).
 * Matches the historical pptx-editor SlideLayoutEditor ordering.
 */
export const SLIDE_LAYOUT_TYPE_UI_ORDER: readonly SlideLayoutType[] = [
  "title",
  "tx",
  "twoColTx",
  "tbl",
  "txAndChart",
  "chartAndTx",
  "dgm",
  "chart",
  "txAndClipArt",
  "clipArtAndTx",
  "titleOnly",
  "blank",
  "txAndObj",
  "objAndTx",
  "objOnly",
  "obj",
  "txAndMedia",
  "mediaAndTx",
  "objOverTx",
  "txOverObj",
  "txAndTwoObj",
  "twoObjAndTx",
  "twoObjOverTx",
  "fourObj",
  "vertTx",
  "clipArtAndVertTx",
  "vertTitleAndTx",
  "vertTitleAndTxOverChart",
  "twoObj",
  "objAndTwoObj",
  "twoObjAndObj",
  "cust",
  "secHead",
  "twoTxTwoObj",
  "objTx",
  "picTx",
];

/**
 * Options for {@link Select} when editing optional boolean attributes on slide layouts
 * (showMasterShapes, preserve, userDrawn, showMasterPhAnim, etc.).
 */
export type SlideLayoutOptionalBooleanSelectValue = "" | "true" | "false";

export const SLIDE_LAYOUT_OPTIONAL_BOOLEAN_SELECT_OPTIONS: SelectOption<SlideLayoutOptionalBooleanSelectValue>[] = [
  { value: "", label: "Default" },
  { value: "true", label: "True" },
  { value: "false", label: "False" },
];

/** Maps optional boolean layout attributes to tri-state select value. */
export function slideLayoutOptionalBooleanToSelectValue(value: boolean | undefined): SlideLayoutOptionalBooleanSelectValue {
  if (value === true) {
    return "true";
  }
  if (value === false) {
    return "false";
  }
  return "";
}

/** Maps tri-state select value back to optional boolean for layout attributes. */
export function slideLayoutSelectValueToOptionalBoolean(
  value: SlideLayoutOptionalBooleanSelectValue,
): boolean | undefined {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

/** Trims and maps empty string to `undefined` for optional layout string fields. */
export function slideLayoutTrimmedOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Build {@link Select} options for slide layout type.
 *
 * @param includeDefault - When true, prepends `{ value: "", label: "Default" }` for unset type in PPTX slide editing.
 */
export function slideLayoutTypeSelectOptions(includeDefault: boolean): SelectOption<string>[] {
  const ordered: SelectOption<string>[] = SLIDE_LAYOUT_TYPE_UI_ORDER.map((t) => ({
    value: t,
    label: SLIDE_LAYOUT_TYPE_LABELS[t],
  }));
  if (includeDefault) {
    return [{ value: "", label: "Default" }, ...ordered];
  }
  return ordered;
}
