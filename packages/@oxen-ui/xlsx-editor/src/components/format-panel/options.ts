/**
 * @file Format panel select options
 *
 * Shared option lists for SpreadsheetML formatting controls (alignment, borders, number formats).
 */

import type { SelectOption } from "@oxen-ui/ui-components";

export const HORIZONTAL_OPTIONS: readonly SelectOption<string>[] = [
  { value: "", label: "(auto)" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "fill", label: "Fill" },
  { value: "justify", label: "Justify" },
  { value: "centerContinuous", label: "CenterContinuous" },
  { value: "distributed", label: "Distributed" },
];

export const VERTICAL_OPTIONS: readonly SelectOption<string>[] = [
  { value: "", label: "(auto)" },
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
  { value: "justify", label: "Justify" },
  { value: "distributed", label: "Distributed" },
];

export const BORDER_STYLE_OPTIONS: readonly SelectOption<string>[] = [
  { value: "", label: "(none)" },
  { value: "thin", label: "Thin" },
  { value: "medium", label: "Medium" },
  { value: "thick", label: "Thick" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
  { value: "double", label: "Double" },
  { value: "hair", label: "Hair" },
  { value: "mediumDashed", label: "MediumDashed" },
  { value: "dashDot", label: "DashDot" },
  { value: "mediumDashDot", label: "MediumDashDot" },
  { value: "dashDotDot", label: "DashDotDot" },
  { value: "mediumDashDotDot", label: "MediumDashDotDot" },
  { value: "slantDashDot", label: "SlantDashDot" },
];

export const BUILTIN_FORMAT_OPTIONS: readonly SelectOption<string>[] = [
  { value: "0", label: "General" },
  { value: "1", label: "0" },
  { value: "2", label: "0.00" },
  { value: "3", label: "#,##0" },
  { value: "4", label: "#,##0.00" },
  { value: "9", label: "0%" },
  { value: "10", label: "0.00%" },
  { value: "11", label: "0.00E+00" },
  { value: "49", label: "Text" },
];
