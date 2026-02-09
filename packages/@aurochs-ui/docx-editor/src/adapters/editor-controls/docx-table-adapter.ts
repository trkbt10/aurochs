/**
 * @file DOCX table style bands adapter
 *
 * Converts between DOCX DocxTableProperties (tblLook) and the generic TableStyleBands.
 * DOCX uses negative flags (noHBand, noVBand) which are inverted to positive.
 */

import type { DocxTableProperties } from "@aurochs-office/docx/domain/table";
import type { FormattingAdapter, TableStyleBands } from "@aurochs-ui/editor-controls/types";

export const docxTableAdapter: FormattingAdapter<DocxTableProperties, TableStyleBands> = {
  toGeneric(value: DocxTableProperties): TableStyleBands {
    const look = value.tblLook;
    return {
      headerRow: look?.firstRow ?? false,
      totalRow: look?.lastRow ?? false,
      firstColumn: look?.firstColumn ?? false,
      lastColumn: look?.lastColumn ?? false,
      bandedRows: !(look?.noHBand ?? false),
      bandedColumns: !(look?.noVBand ?? true),
    };
  },

  applyUpdate(current: DocxTableProperties, update: Partial<TableStyleBands>): DocxTableProperties {
    const look = { ...current.tblLook };

    if ("headerRow" in update) {look.firstRow = update.headerRow;}
    if ("totalRow" in update) {look.lastRow = update.totalRow;}
    if ("firstColumn" in update) {look.firstColumn = update.firstColumn;}
    if ("lastColumn" in update) {look.lastColumn = update.lastColumn;}
    if ("bandedRows" in update) {look.noHBand = !update.bandedRows;}
    if ("bandedColumns" in update) {look.noVBand = !update.bandedColumns;}

    return { ...current, tblLook: look };
  },
};
