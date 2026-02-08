/**
 * @file PPTX cell formatting adapter
 *
 * Converts between PPTX TableCellProperties and the generic CellFormatting.
 */

import type { TableCellProperties } from "@aurochs-office/pptx/domain/table/types";
import type { FormattingAdapter, CellFormatting } from "@aurochs-ui/editor-controls/types";

export const pptxCellAdapter: FormattingAdapter<TableCellProperties, CellFormatting> = {
  toGeneric(value: TableCellProperties): CellFormatting {
    let backgroundColor: string | undefined;
    if (value.fill?.type === "solidFill") {
      const c = value.fill.color;
      backgroundColor = c.spec.type === "srgb" ? `#${c.spec.value}` : undefined;
    }

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
