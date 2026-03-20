/**
 * @file XLSX mixed state conversion
 *
 * Converts XLSX SelectionFormatFlags to the generic MixedContext used by shared editors.
 */

import type { MixedContext } from "@aurochs-ui/editor-controls/mixed-state";
import type { SelectionFormatFlags } from "../../selectors/selection-format-flags";

/**
 * Convert XLSX SelectionFormatFlags to a MixedContext for TextFormattingEditor.
 *
 * Flags that are arrays (multiple differing values) are added as mixed fields.
 */
export function xlsxSelectionToMixedContext(flags: SelectionFormatFlags | undefined): MixedContext | undefined {
  if (!flags) {
    return undefined;
  }
  const fields = new Set<string>();
  if (Array.isArray(flags.bold)) {
    fields.add("bold");
  }
  if (Array.isArray(flags.italic)) {
    fields.add("italic");
  }
  if (Array.isArray(flags.underline)) {
    fields.add("underline");
  }
  if (Array.isArray(flags.strikethrough)) {
    fields.add("strikethrough");
  }
  return fields.size > 0 ? { mixedFields: fields } : undefined;
}
