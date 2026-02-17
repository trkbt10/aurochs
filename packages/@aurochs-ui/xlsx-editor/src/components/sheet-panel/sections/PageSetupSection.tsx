/**
 * @file Page Setup section
 *
 * Section for page setup configuration (paper size, orientation, scale).
 */

import { useCallback, useMemo } from "react";
import { Accordion, Select, Input, Toggle, FieldGroup, FieldRow, type SelectOption } from "@aurochs-ui/ui-components";
import type { XlsxPageSetup } from "@aurochs-office/xlsx/domain/page-setup";

export type PageSetupSectionProps = {
  readonly disabled: boolean;
  readonly pageSetup: XlsxPageSetup | undefined;
  readonly onPageSetupChange: (pageSetup: XlsxPageSetup) => void;
};

const PAPER_SIZE_OPTIONS: readonly SelectOption<string>[] = [
  { value: "1", label: "Letter (8.5\" x 11\")" },
  { value: "9", label: "A4 (210mm x 297mm)" },
  { value: "8", label: "A3 (297mm x 420mm)" },
  { value: "11", label: "A5 (148mm x 210mm)" },
  { value: "5", label: "Legal (8.5\" x 14\")" },
];

const ORIENTATION_OPTIONS: readonly SelectOption<string>[] = [
  { value: "default", label: "Default" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

const PAGE_ORDER_OPTIONS: readonly SelectOption<string>[] = [
  { value: "downThenOver", label: "Down, then over" },
  { value: "overThenDown", label: "Over, then down" },
];

/**
 * Page setup configuration section.
 */
export function PageSetupSection({ disabled, pageSetup, onPageSetupChange }: PageSetupSectionProps) {
  const current = useMemo(() => pageSetup ?? {}, [pageSetup]);

  const update = useCallback(
    (partial: Partial<XlsxPageSetup>) => {
      onPageSetupChange({ ...current, ...partial });
    },
    [current, onPageSetupChange],
  );

  return (
    <Accordion title="Page Setup" defaultExpanded>
      <FieldGroup label="Paper Size">
        <Select
          value={String(current.paperSize ?? 9)}
          options={PAPER_SIZE_OPTIONS}
          disabled={disabled}
          onChange={(value) => update({ paperSize: Number(value) })}
        />
      </FieldGroup>

      <FieldGroup label="Orientation">
        <Select
          value={current.orientation ?? "default"}
          options={ORIENTATION_OPTIONS}
          disabled={disabled}
          onChange={(value) => update({ orientation: value as XlsxPageSetup["orientation"] })}
        />
      </FieldGroup>

      <FieldGroup label="Scale">
        <Input
          type="number"
          value={current.scale ?? 100}
          min={10}
          max={400}
          suffix="%"
          disabled={disabled}
          onChange={(value) => update({ scale: Number(value) })}
        />
      </FieldGroup>

      <FieldRow>
        <FieldGroup label="Fit to Width" inline labelWidth={80}>
          <Input
            type="number"
            value={current.fitToWidth ?? 0}
            min={0}
            disabled={disabled}
            onChange={(value) => update({ fitToWidth: Number(value) })}
          />
        </FieldGroup>
        <FieldGroup label="Height" inline labelWidth={50}>
          <Input
            type="number"
            value={current.fitToHeight ?? 0}
            min={0}
            disabled={disabled}
            onChange={(value) => update({ fitToHeight: Number(value) })}
          />
        </FieldGroup>
      </FieldRow>

      <FieldGroup label="Page Order">
        <Select
          value={current.pageOrder ?? "downThenOver"}
          options={PAGE_ORDER_OPTIONS}
          disabled={disabled}
          onChange={(value) => update({ pageOrder: value as XlsxPageSetup["pageOrder"] })}
        />
      </FieldGroup>

      <FieldRow>
        <FieldGroup label="B&W" inline labelWidth={40}>
          <Toggle
            checked={current.blackAndWhite ?? false}
            disabled={disabled}
            onChange={(checked) => update({ blackAndWhite: checked })}
          />
        </FieldGroup>
        <FieldGroup label="Draft" inline labelWidth={40}>
          <Toggle
            checked={current.draft ?? false}
            disabled={disabled}
            onChange={(checked) => update({ draft: checked })}
          />
        </FieldGroup>
      </FieldRow>
    </Accordion>
  );
}
