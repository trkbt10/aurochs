/**
 * @file DOCX cell formatting adapter
 *
 * Converts between DOCX DocxTableCellProperties and the generic CellFormatting.
 */

import type { DocxTableCellProperties } from "@aurochs-office/docx/domain/table";
import type { FormattingAdapter, CellFormatting, VerticalAlignment } from "@aurochs-ui/editor-controls/types";

/** Map DOCX vAlign to generic VerticalAlignment. */
function toGenericVAlign(vAlign: string | undefined): VerticalAlignment | undefined {
  switch (vAlign) {
    case "top":
      return "top";
    case "center":
      return "center";
    case "bottom":
      return "bottom";
    default:
      return undefined;
  }
}

export const docxCellAdapter: FormattingAdapter<DocxTableCellProperties, CellFormatting> = {
  toGeneric(value: DocxTableCellProperties): CellFormatting {
    return {
      verticalAlignment: toGenericVAlign(value.vAlign),
      backgroundColor: value.shd?.fill ? `#${value.shd.fill}` : undefined,
      wrapText: value.noWrap !== undefined ? !value.noWrap : undefined,
    };
  },

  applyUpdate(current: DocxTableCellProperties, update: Partial<CellFormatting>): DocxTableCellProperties {
    const parts: Partial<DocxTableCellProperties>[] = [current];

    if ("verticalAlignment" in update && update.verticalAlignment) {
      parts.push({ vAlign: update.verticalAlignment as DocxTableCellProperties["vAlign"] });
    }
    if ("backgroundColor" in update) {
      const hex = update.backgroundColor?.replace(/^#/, "");
      parts.push({ shd: { ...current.shd, fill: hex || undefined } });
    }
    if ("wrapText" in update) {
      parts.push({ noWrap: update.wrapText !== undefined ? !update.wrapText : undefined });
    }

    return Object.assign({}, ...parts) as DocxTableCellProperties;
  },
};
