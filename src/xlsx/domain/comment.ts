/**
 * @file Worksheet comment domain types
 *
 * Defines the parsed representation of SpreadsheetML cell comments.
 *
 * @see ECMA-376 Part 4, Section 18.7.6 (comments)
 * @see ECMA-376 Part 4, Section 18.7.3 (comment)
 */

import type { CellAddress } from "./cell/address";

export type XlsxComment = {
  readonly address: CellAddress;
  readonly author?: string;
  readonly text: string;
};

