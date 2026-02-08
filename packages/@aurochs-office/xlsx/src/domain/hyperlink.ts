/**
 * @file Worksheet hyperlink domain types
 *
 * Defines the parsed representation of SpreadsheetML hyperlinks.
 *
 * Hyperlinks are stored on worksheets under `<hyperlinks>` and may resolve their targets
 * via worksheet relationships (`sheet*.xml.rels`) when `r:id` is present.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.48 (hyperlink)
 * @see ECMA-376 Part 4, Section 18.3.1.49 (hyperlinks)
 */

import type { CellRange } from "./cell/address";

export type XlsxHyperlink = {
  readonly ref: CellRange;
  readonly relationshipId?: string;
  readonly target?: string;
  readonly targetMode?: "External" | "Internal";
  readonly display?: string;
  readonly location?: string;
  readonly tooltip?: string;
};

