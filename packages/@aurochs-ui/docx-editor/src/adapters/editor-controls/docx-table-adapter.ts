/**
 * @file DOCX table formatting adapter
 *
 * Converts between DOCX DocxTableProperties and the generic TableStyleBands type.
 */

import type { DocxTableProperties } from "@aurochs-office/docx/domain/table";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { TableStyleBands } from "@aurochs-ui/editor-controls/table";

/**
 * Adapter: DOCX DocxTableProperties <-> TableStyleBands
 */
export const docxTableAdapter: FormattingAdapter<DocxTableProperties, TableStyleBands> = {
  toGeneric(value: DocxTableProperties): TableStyleBands {
    const look = value.tblLook;
    return {
      headerRow: look?.firstRow ?? undefined,
      totalRow: look?.lastRow ?? undefined,
      firstColumn: look?.firstColumn ?? undefined,
      lastColumn: look?.lastColumn ?? undefined,
      bandedRows: look?.noHBand === true ? false : look?.noHBand === false ? true : undefined,
      bandedColumns: look?.noVBand === true ? false : look?.noVBand === false ? true : undefined,
    };
  },

  applyUpdate(current: DocxTableProperties, update: Partial<TableStyleBands>): DocxTableProperties {
    const currentLook = current.tblLook ?? {};
    const newLook = { ...currentLook };

    if ("headerRow" in update) {
      newLook.firstRow = update.headerRow ?? undefined;
    }
    if ("totalRow" in update) {
      newLook.lastRow = update.totalRow ?? undefined;
    }
    if ("firstColumn" in update) {
      newLook.firstColumn = update.firstColumn ?? undefined;
    }
    if ("lastColumn" in update) {
      newLook.lastColumn = update.lastColumn ?? undefined;
    }
    if ("bandedRows" in update) {
      newLook.noHBand = update.bandedRows === true ? false : update.bandedRows === false ? true : undefined;
    }
    if ("bandedColumns" in update) {
      newLook.noVBand = update.bandedColumns === true ? false : update.bandedColumns === false ? true : undefined;
    }

    return {
      ...current,
      tblLook: Object.keys(newLook).length > 0 ? newLook : undefined,
    };
  },
};
