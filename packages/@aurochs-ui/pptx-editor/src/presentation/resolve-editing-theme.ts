/**
 * @file Resolve theme SoT for presentation editor chrome
 *
 * When `PresentationDocument.theme` is missing (e.g. some import paths), builds a
 * minimal `Theme` from `colorContext`, `fontScheme`, and domain defaults so theme
 * editors can still call `buildThemeXml` + `APPLY_THEME`.
 */

import type { PresentationDocument } from "@aurochs-office/pptx/app";
import type { Theme } from "@aurochs-office/pptx/domain/theme/types";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import { DEFAULT_COLOR_SCHEME } from "@aurochs-office/pptx/domain";
import { px } from "@aurochs-office/drawing-ml/domain/units";

const PH_SCHEME_FILL = {
  type: "solidFill" as const,
  color: { spec: { type: "scheme" as const, value: "phClr" as const } },
};

const MINIMAL_FORMAT_SCHEME: Theme["formatScheme"] = {
  fillStyles: [PH_SCHEME_FILL],
  lineStyles: [
    {
      width: px(1),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: PH_SCHEME_FILL,
      dash: "solid",
      join: "round",
    },
  ],
  effectStyles: [undefined],
  bgFillStyles: [PH_SCHEME_FILL],
};

function mergeSchemeColors(base: ColorScheme, overlay: ColorScheme): ColorScheme {
  return { ...base, ...overlay };
}

/**
 * Returns `document.theme` when present; otherwise a synthetic theme for editing.
 */
export function resolveEditingTheme(doc: PresentationDocument): Theme {
  if (doc.theme) {
    return doc.theme;
  }
  return {
    colorScheme: mergeSchemeColors({ ...DEFAULT_COLOR_SCHEME } as ColorScheme, doc.colorContext.colorScheme),
    fontScheme: doc.fontScheme,
    formatScheme: MINIMAL_FORMAT_SCHEME,
    customColors: [],
    extraColorSchemes: [],
    objectDefaults: {},
    themeOverrides: [],
  };
}
