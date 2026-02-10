/**
 * @file Font section (format panel)
 *
 * Wraps the shared TextFormattingEditor with XLSX-specific adapter and slots.
 */

import { useCallback } from "react";
import { Accordion, Select, type SelectOption } from "@aurochs-ui/ui-components";
import { TextFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";
import type { MixedContext } from "@aurochs-ui/editor-controls/mixed-state";
import { ColorPickerPopover } from "@aurochs-ui/color-editor";
import type { XlsxFont } from "@aurochs-office/xlsx/domain/style/font";
import { xlsxTextAdapter } from "../../../adapters/editor-controls/xlsx-text-adapter";

export type FontSectionProps = {
  readonly disabled: boolean;
  readonly font: XlsxFont;
  readonly fontNameOptions: readonly SelectOption<string>[];
  readonly selectionFormatFlags: MixedContext | undefined;
  readonly onFontChange: (font: XlsxFont) => void;
};

/** Strip leading '#' for ColorPickerPopover (expects bare RRGGBB). */
function toBareHex(color: string | undefined): string {
  if (!color) {
    return "000000";
  }
  return color.startsWith("#") ? color.slice(1) : color;
}

/**
 * Format panel section for font attributes.
 *
 * Delegates to the shared TextFormattingEditor via xlsxTextAdapter.
 */
export function FontSection(props: FontSectionProps) {
  const generic = xlsxTextAdapter.toGeneric(props.font);

  const handleChange = useCallback(
    (update: Partial<TextFormatting>) => {
      const nextFont = xlsxTextAdapter.applyUpdate(props.font, update);
      props.onFontChange(nextFont);
    },
    [props.font, props.onFontChange],
  );

  return (
    <Accordion title="Font" defaultExpanded>
      <TextFormattingEditor
        value={generic}
        onChange={handleChange}
        disabled={props.disabled}
        mixed={props.selectionFormatFlags}
        features={{ showHighlight: false, showSuperSubscript: false }}
        renderFontFamilySelect={({ value, onChange, disabled, placeholder }) => (
          <Select
            value={value ?? ""}
            options={props.fontNameOptions}
            disabled={disabled}
            onChange={onChange}
            placeholder={placeholder}
          />
        )}
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
