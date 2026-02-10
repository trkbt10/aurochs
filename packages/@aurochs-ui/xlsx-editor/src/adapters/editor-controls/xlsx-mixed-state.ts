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
 * Maps the XLSX-specific MixedBoolean flags to a generic set of mixed field names.
 */
export function xlsxSelectionToMixedContext(flags: SelectionFormatFlags | undefined): MixedContext | undefined {
  if (!flags) {
    return undefined;
  }
  const fields = new Set<string>();
  if (flags.bold.mixed) {
    fields.add("bold");
  }
  if (flags.italic.mixed) {
    fields.add("italic");
  }
  if (flags.underline.mixed) {
    fields.add("underline");
  }
  if (flags.strikethrough.mixed) {
    fields.add("strikethrough");
  }
  return fields.size > 0 ? { mixedFields: fields } : undefined;
}
