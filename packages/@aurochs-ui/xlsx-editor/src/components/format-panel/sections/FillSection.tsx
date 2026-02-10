/**
 * @file Fill section (format panel)
 *
 * Wraps the shared FillFormattingEditor with XLSX-specific adapter and slots.
 */

import { useCallback } from "react";
import { Accordion } from "@aurochs-ui/ui-components";
import { FillFormattingEditor } from "@aurochs-ui/editor-controls/surface";
import type { FillFormatting } from "@aurochs-ui/editor-controls/surface";
import { ColorPickerPopover } from "@aurochs-ui/color-editor";
import type { XlsxFill } from "@aurochs-office/xlsx/domain/style/fill";
import { xlsxFillAdapter } from "../../../adapters/editor-controls/xlsx-fill-adapter";

export type FillSectionProps = {
  readonly disabled: boolean;
  readonly fill: XlsxFill;
  readonly onFillChange: (fill: XlsxFill) => void;
};

/** Strip leading '#' for ColorPickerPopover (expects bare RRGGBB). */
function toBareHex(color: string): string {
  return color.startsWith("#") ? color.slice(1) : color;
}

/**
 * Format panel section for applying a solid fill color to the selection.
 *
 * Delegates to the shared FillFormattingEditor via xlsxFillAdapter.
 */
export function FillSection(props: FillSectionProps) {
  const generic = xlsxFillAdapter.toGeneric(props.fill);

  const handleChange = useCallback(
    (update: FillFormatting) => {
      props.onFillChange(xlsxFillAdapter.applyUpdate(props.fill, update));
    },
    [props.fill, props.onFillChange],
  );

  return (
    <Accordion title="Fill" defaultExpanded>
      <FillFormattingEditor
        value={generic}
        onChange={handleChange}
        disabled={props.disabled}
        renderColorPicker={({ value, onChange, disabled }) => (
          <ColorPickerPopover
            value={toBareHex(value)}
            onChange={(hex) => onChange(`#${hex}`)}
            disabled={disabled}
          />
        )}
      />
    </Accordion>
  );
}
