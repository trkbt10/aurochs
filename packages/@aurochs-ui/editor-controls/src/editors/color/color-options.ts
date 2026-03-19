/**
 * @file SelectOption arrays derived from ECMA-376 domain constants.
 *
 * UI-layer responsibility: converts domain label records to SelectOption[]
 * consumed by Select components in fill and color editors.
 */

import type { SchemeColorName, SchemeColorValue } from "@aurochs-office/drawing-ml/domain/color";
import { SCHEME_COLOR_NAMES, SCHEME_COLOR_NAME_LABELS, SCHEME_COLOR_VALUE_LABELS } from "@aurochs-office/drawing-ml/domain/color";
import type { PatternType } from "@aurochs-office/drawing-ml/domain/fill";
import { PATTERN_PRESETS, PATTERN_LABELS } from "@aurochs-office/drawing-ml/domain/fill";
import type { SelectOption } from "@aurochs-ui/ui-components/types";

/** 12 scheme color name options in standard display order. */
export const schemeColorNameOptions: SelectOption<SchemeColorName>[] = SCHEME_COLOR_NAMES.map((name) => ({
  value: name,
  label: SCHEME_COLOR_NAME_LABELS[name],
}));

/** 17 scheme color value options (12 names + bg1/bg2/tx1/tx2/phClr). */
export const schemeColorValueOptions: SelectOption<SchemeColorValue>[] = [
  ...schemeColorNameOptions,
  { value: "bg1", label: SCHEME_COLOR_VALUE_LABELS.bg1 },
  { value: "bg2", label: SCHEME_COLOR_VALUE_LABELS.bg2 },
  { value: "tx1", label: SCHEME_COLOR_VALUE_LABELS.tx1 },
  { value: "tx2", label: SCHEME_COLOR_VALUE_LABELS.tx2 },
  { value: "phClr", label: SCHEME_COLOR_VALUE_LABELS.phClr },
];

/** 51 pattern preset options in ECMA-376 order. */
export const patternPresetOptions: SelectOption<PatternType>[] = PATTERN_PRESETS.map((preset) => ({
  value: preset,
  label: PATTERN_LABELS[preset],
}));
