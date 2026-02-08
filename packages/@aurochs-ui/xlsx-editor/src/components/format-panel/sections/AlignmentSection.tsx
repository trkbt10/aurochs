/**
 * @file Alignment section (format panel)
 *
 * UI controls for editing cell alignment and wrap settings in the selection format panel.
 */

import { Accordion, Button, FieldGroup, FieldRow, Select, ToggleButton } from "@aurochs-ui/ui-components";
import type { XlsxAlignment } from "@aurochs-office/xlsx/domain/style/types";
import { HORIZONTAL_OPTIONS, VERTICAL_OPTIONS } from "../options";
import { parseHorizontalAlignment, parseVerticalAlignment } from "../alignment";

export type AlignmentSectionProps = {
  readonly disabled: boolean;
  readonly alignment: XlsxAlignment | undefined;
  readonly wrapText: { readonly pressed: boolean; readonly mixed: boolean };
  readonly onAlignmentChange: (alignment: XlsxAlignment) => void;
  readonly onClearAlignment: () => void;
  readonly onWrapTextChange: (wrapText: boolean) => void;
};

/**
 * Format panel section for alignment controls (horizontal/vertical + wrap).
 */
export function AlignmentSection(props: AlignmentSectionProps) {
  const alignment = props.alignment;

  return (
    <Accordion title="Alignment">
      <FieldGroup label="Horizontal">
        <Select
          value={alignment?.horizontal ?? ""}
          options={HORIZONTAL_OPTIONS}
          disabled={props.disabled}
          onChange={(horizontal) => {
            const base: XlsxAlignment = { ...(alignment ?? {}) };
            if (horizontal === "") {
              const { horizontal: removed, ...rest } = base;
              void removed;
              props.onAlignmentChange(rest);
              return;
            }
            props.onAlignmentChange({ ...base, horizontal: parseHorizontalAlignment(horizontal) });
          }}
        />
      </FieldGroup>

      <FieldGroup label="Vertical">
        <Select
          value={alignment?.vertical ?? ""}
          options={VERTICAL_OPTIONS}
          disabled={props.disabled}
          onChange={(vertical) => {
            const base: XlsxAlignment = { ...(alignment ?? {}) };
            if (vertical === "") {
              const { vertical: removed, ...rest } = base;
              void removed;
              props.onAlignmentChange(rest);
              return;
            }
            props.onAlignmentChange({ ...base, vertical: parseVerticalAlignment(vertical) });
          }}
        />
      </FieldGroup>

      <FieldRow>
        <ToggleButton
          label="Wrap"
          pressed={props.wrapText.pressed}
          mixed={props.wrapText.mixed}
          disabled={props.disabled}
          onChange={(pressed) => props.onWrapTextChange(pressed)}
        />
        <Button size="sm" disabled={props.disabled} onClick={props.onClearAlignment}>
          Clear
        </Button>
      </FieldRow>
    </Accordion>
  );
}
