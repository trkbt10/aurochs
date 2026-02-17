/**
 * @file Print Options section
 *
 * Section for print options configuration.
 */

import { useCallback, useMemo } from "react";
import { Accordion, Toggle, FieldGroup, FieldRow } from "@aurochs-ui/ui-components";
import type { XlsxPrintOptions } from "@aurochs-office/xlsx/domain/page-setup";

export type PrintOptionsSectionProps = {
  readonly disabled: boolean;
  readonly printOptions: XlsxPrintOptions | undefined;
  readonly onPrintOptionsChange: (printOptions: XlsxPrintOptions) => void;
};

/**
 * Print options configuration section.
 */
export function PrintOptionsSection({ disabled, printOptions, onPrintOptionsChange }: PrintOptionsSectionProps) {
  const current = useMemo(() => printOptions ?? {}, [printOptions]);

  const update = useCallback(
    (partial: Partial<XlsxPrintOptions>) => {
      onPrintOptionsChange({ ...current, ...partial });
    },
    [current, onPrintOptionsChange],
  );

  return (
    <Accordion title="Print Options" defaultExpanded={false}>
      <FieldRow>
        <FieldGroup label="Grid Lines" inline labelWidth={80}>
          <Toggle
            checked={current.gridLines ?? false}
            disabled={disabled}
            onChange={(checked) => update({ gridLines: checked })}
          />
        </FieldGroup>
        <FieldGroup label="Headings" inline labelWidth={70}>
          <Toggle
            checked={current.headings ?? false}
            disabled={disabled}
            onChange={(checked) => update({ headings: checked })}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Center H" inline labelWidth={80}>
          <Toggle
            checked={current.horizontalCentered ?? false}
            disabled={disabled}
            onChange={(checked) => update({ horizontalCentered: checked })}
          />
        </FieldGroup>
        <FieldGroup label="Center V" inline labelWidth={70}>
          <Toggle
            checked={current.verticalCentered ?? false}
            disabled={disabled}
            onChange={(checked) => update({ verticalCentered: checked })}
          />
        </FieldGroup>
      </FieldRow>
    </Accordion>
  );
}
