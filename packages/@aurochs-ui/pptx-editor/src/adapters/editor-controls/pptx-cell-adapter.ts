/**
 * @file PPTX cell formatting adapter
 *
 * Converts between PPTX TableCellProperties and the generic CellFormatting.
 */

import type { TableCellProperties } from "@aurochs-office/pptx/domain/table/types";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { CellFormatting } from "@aurochs-ui/editor-controls/table";

/** Extract background color hex string from table cell properties */
function extractBackgroundColor(value: TableCellProperties): string | undefined {
  if (value.fill?.type === "solidFill") {
    const c = value.fill.color;
    return c.spec.type === "srgb" ? `#${c.spec.value}` : undefined;
  }
  return undefined;
}

export const pptxCellAdapter: FormattingAdapter<TableCellProperties, CellFormatting> = {
  toGeneric(value: TableCellProperties): CellFormatting {
    const backgroundColor = extractBackgroundColor(value);

    return {
      verticalAlignment: value.anchor,
      backgroundColor,
    };
  },

  applyUpdate(current: TableCellProperties, update: Partial<CellFormatting>): TableCellProperties {
    const result = { ...current };

    if ("verticalAlignment" in update && update.verticalAlignment) {
      result.anchor = update.verticalAlignment;
    }

    return result;
  },
};
