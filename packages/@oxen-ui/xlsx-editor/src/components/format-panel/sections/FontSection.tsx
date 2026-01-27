/**
 * @file Font section (format panel)
 *
 * UI controls for editing the selection font (name/size/color + bold/italic/underline/strike).
 */

import { Accordion, Button, FieldGroup, FieldRow, Input, Select, ToggleButton, type SelectOption } from "@oxen-ui/ui-components";
import type { XlsxFont } from "@oxen/xlsx/domain/style/font";

export type FontSectionProps = {
  readonly disabled: boolean;
  readonly font: XlsxFont;
  readonly fontNameOptions: readonly SelectOption<string>[];
  readonly mixed: {
    readonly bold: boolean;
    readonly italic: boolean;
    readonly underline: boolean;
    readonly strikethrough: boolean;
  };

  readonly fontSizeDraft: number;
  readonly onFontSizeDraftChange: (size: number) => void;
  readonly onApplyFontSize: () => void;

  readonly fontColorDraft: string;
  readonly onFontColorDraftChange: (hex: string) => void;
  readonly onApplyFontColor: () => void;
  readonly onClearFontColor: () => void;

  readonly onFontNameChange: (name: string) => void;
  readonly onToggleBold: (pressed: boolean) => void;
  readonly onToggleItalic: (pressed: boolean) => void;
  readonly onToggleUnderline: (pressed: boolean) => void;
  readonly onToggleStrikethrough: (pressed: boolean) => void;
};

/**
 * Format panel section for font attributes.
 */
export function FontSection(props: FontSectionProps) {
  const font = props.font;

  return (
    <Accordion title="Font" defaultExpanded>
      <FieldGroup label="Family">
        <Select value={font.name} options={props.fontNameOptions} disabled={props.disabled} onChange={props.onFontNameChange} />
      </FieldGroup>

      <FieldRow>
        <FieldGroup label="Size">
          <Input
            type="number"
            value={props.fontSizeDraft}
            disabled={props.disabled}
            min={1}
            max={200}
            onChange={(value) => props.onFontSizeDraftChange(Number(value))}
            suffix="pt"
            width={120}
          />
        </FieldGroup>
        <Button size="sm" disabled={props.disabled} onClick={props.onApplyFontSize}>
          Apply
        </Button>
      </FieldRow>

      <FieldRow>
        <ToggleButton
          label="B"
          pressed={font.bold === true}
          mixed={props.mixed.bold}
          disabled={props.disabled}
          onChange={props.onToggleBold}
        />
        <ToggleButton
          label="I"
          pressed={font.italic === true}
          mixed={props.mixed.italic}
          disabled={props.disabled}
          onChange={props.onToggleItalic}
        />
        <ToggleButton
          label="U"
          pressed={font.underline !== undefined && font.underline !== "none"}
          mixed={props.mixed.underline}
          disabled={props.disabled}
          onChange={props.onToggleUnderline}
        />
        <ToggleButton
          label="S"
          ariaLabel="Strikethrough"
          pressed={font.strikethrough === true}
          mixed={props.mixed.strikethrough}
          disabled={props.disabled}
          onChange={props.onToggleStrikethrough}
        />
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Color">
          <Input
            value={props.fontColorDraft}
            placeholder="#RRGGBB"
            disabled={props.disabled}
            onChange={(value) => props.onFontColorDraftChange(String(value))}
            width={160}
          />
        </FieldGroup>
        <Button size="sm" disabled={props.disabled} onClick={props.onApplyFontColor}>
          Apply
        </Button>
        <Button size="sm" disabled={props.disabled} onClick={props.onClearFontColor}>
          Clear
        </Button>
      </FieldRow>
    </Accordion>
  );
}
