/**
 * @file PPTX table style bands adapter
 *
 * Converts between PPTX TableProperties band flags and the generic TableStyleBands.
 * PPTX uses positive flags (firstRow, bandRow, etc.).
 */

import type { TableProperties } from "@aurochs-office/pptx/domain/table/types";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { TableStyleBands } from "@aurochs-ui/editor-controls/table";

export const pptxTableAdapter: FormattingAdapter<TableProperties, TableStyleBands> = {
  toGeneric(value: TableProperties): TableStyleBands {
    return {
      headerRow: value.firstRow ?? false,
      totalRow: value.lastRow ?? false,
      firstColumn: value.firstCol ?? false,
      lastColumn: value.lastCol ?? false,
      bandedRows: value.bandRow ?? false,
      bandedColumns: value.bandCol ?? false,
    };
  },

  applyUpdate(current: TableProperties, update: Partial<TableStyleBands>): TableProperties {
    const result = { ...current };

    if ("headerRow" in update) {
      result.firstRow = update.headerRow;
    }
    if ("totalRow" in update) {
      result.lastRow = update.totalRow;
    }
    if ("firstColumn" in update) {
      result.firstCol = update.firstColumn;
    }
    if ("lastColumn" in update) {
      result.lastCol = update.lastColumn;
    }
    if ("bandedRows" in update) {
      result.bandRow = update.bandedRows;
    }
    if ("bandedColumns" in update) {
      result.bandCol = update.bandedColumns;
    }

    return result;
  },
};
