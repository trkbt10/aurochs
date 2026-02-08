/**
 * @file Number section (format panel)
 *
 * UI controls for editing number format (built-in numFmtId selection + custom format code helpers).
 */

import { Accordion, Button, FieldGroup, FieldRow, Input, Select, Toggle } from "@aurochs-ui/ui-components";
import { BUILTIN_FORMAT_OPTIONS } from "../options";

export type NumberSectionProps = {
  readonly disabled: boolean;
  readonly selectedNumFmtId: number;

  readonly decimalPlaces: number;
  readonly onDecimalPlacesChange: (value: number) => void;
  readonly useThousands: boolean;
  readonly onUseThousandsChange: (value: boolean) => void;
  readonly onApplyDecimalFormat: () => void;

  readonly scientificDigits: number;
  readonly onScientificDigitsChange: (value: number) => void;
  readonly onApplyScientificFormat: () => void;

  readonly customFormatDraft: string;
  readonly onCustomFormatDraftChange: (value: string) => void;
  readonly onApplyCustomFormat: () => void;

  readonly onBuiltinFormatChange: (numFmtId: number) => void;
};

/**
 * Format panel section for number formats.
 */
export function NumberSection(props: NumberSectionProps) {
  return (
    <Accordion title="Number">
      <FieldGroup label="Built-in">
        <Select
          value={String(props.selectedNumFmtId)}
          options={BUILTIN_FORMAT_OPTIONS}
          disabled={props.disabled}
          onChange={(value) => props.onBuiltinFormatChange(Number.parseInt(value, 10))}
        />
      </FieldGroup>

      <FieldRow>
        <FieldGroup label="Decimals">
          <Input
            type="number"
            value={props.decimalPlaces}
            min={0}
            max={20}
            disabled={props.disabled}
            onChange={(value) => props.onDecimalPlacesChange(Number(value))}
            width={120}
          />
        </FieldGroup>
        <Toggle
          label="Thousands"
          checked={props.useThousands}
          disabled={props.disabled}
          onChange={props.onUseThousandsChange}
        />
        <Button size="sm" disabled={props.disabled} onClick={props.onApplyDecimalFormat}>
          Apply
        </Button>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Scientific" hint="sig digits">
          <Input
            type="number"
            value={props.scientificDigits}
            min={1}
            max={15}
            disabled={props.disabled}
            onChange={(value) => props.onScientificDigitsChange(Number(value))}
            width={120}
          />
        </FieldGroup>
        <Button size="sm" disabled={props.disabled} onClick={props.onApplyScientificFormat}>
          Apply
        </Button>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Format code">
          <Input
            value={props.customFormatDraft}
            disabled={props.disabled}
            onChange={(value) => props.onCustomFormatDraftChange(String(value))}
            width={220}
          />
        </FieldGroup>
        <Button size="sm" disabled={props.disabled} onClick={props.onApplyCustomFormat}>
          Apply
        </Button>
      </FieldRow>
    </Accordion>
  );
}
