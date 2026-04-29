/**
 * @file Table-styles part builder (`ppt/tableStyles.xml`).
 *
 * @see ECMA-376 Part 1, §14.2.9 (Table Styles Part)
 * @see ECMA-376 Part 1, §20.1.4.2.27 (CT_TableStyleList)
 */

import { DRAWINGML_NAMESPACES } from "@aurochs-office/opc";
import { createElement, type XmlDocument } from "@aurochs/xml";

/** Canonical empty default-table-style identifier used by Office. */
const DEFAULT_TABLE_STYLE_ID = "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}";

export type BuildTableStylesOptions = {
  /** Default table style GUID; defaults to Office's stock value. */
  readonly defaultStyleId?: string;
};

/**
 * Build a structurally complete but empty `<a:tblStyleLst>`.
 *
 * Emits no `<a:tblStyle>` children — the part exists purely so that
 * tables anchored to the deck can resolve via the file's content-type
 * graph. The `def` attribute carries the canonical default GUID so
 * Office's reader treats untouched cells as if they referenced the
 * built-in "Medium Style 2 - Accent 1" template.
 */
export function buildTableStyles(options: BuildTableStylesOptions = {}): XmlDocument {
  const def = options.defaultStyleId ?? DEFAULT_TABLE_STYLE_ID;
  return {
    children: [
      createElement("a:tblStyleLst", { "xmlns:a": DRAWINGML_NAMESPACES.main, def }),
    ],
  };
}
