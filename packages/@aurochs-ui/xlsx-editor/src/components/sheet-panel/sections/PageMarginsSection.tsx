/**
 * @file Page Margins section
 *
 * Section for page margin configuration.
 */

import { useCallback, useMemo } from "react";
import { Accordion, Input, FieldGroup, FieldRow } from "@aurochs-ui/ui-components";
import type { XlsxPageMargins } from "@aurochs-office/xlsx/domain/page-setup";

export type PageMarginsSectionProps = {
  readonly disabled: boolean;
  readonly pageMargins: XlsxPageMargins | undefined;
  readonly onPageMarginsChange: (pageMargins: XlsxPageMargins) => void;
};

/**
 * Page margins configuration section.
 */
export function PageMarginsSection({ disabled, pageMargins, onPageMarginsChange }: PageMarginsSectionProps) {
  const current = useMemo(() => pageMargins ?? {}, [pageMargins]);

  const update = useCallback(
    (partial: Partial<XlsxPageMargins>) => {
      onPageMarginsChange({ ...current, ...partial });
    },
    [current, onPageMarginsChange],
  );

  return (
    <Accordion title="Margins" defaultExpanded={false}>
      <FieldRow>
        <FieldGroup label="Top" inline labelWidth={50}>
          <Input
            type="number"
            value={current.top ?? 0.75}
            min={0}
            step={0.1}
            suffix="in"
            disabled={disabled}
            onChange={(value) => update({ top: Number(value) })}
          />
        </FieldGroup>
        <FieldGroup label="Bottom" inline labelWidth={50}>
          <Input
            type="number"
            value={current.bottom ?? 0.75}
            min={0}
            step={0.1}
            suffix="in"
            disabled={disabled}
            onChange={(value) => update({ bottom: Number(value) })}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Left" inline labelWidth={50}>
          <Input
            type="number"
            value={current.left ?? 0.7}
            min={0}
            step={0.1}
            suffix="in"
            disabled={disabled}
            onChange={(value) => update({ left: Number(value) })}
          />
        </FieldGroup>
        <FieldGroup label="Right" inline labelWidth={50}>
          <Input
            type="number"
            value={current.right ?? 0.7}
            min={0}
            step={0.1}
            suffix="in"
            disabled={disabled}
            onChange={(value) => update({ right: Number(value) })}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Header" inline labelWidth={50}>
          <Input
            type="number"
            value={current.header ?? 0.3}
            min={0}
            step={0.1}
            suffix="in"
            disabled={disabled}
            onChange={(value) => update({ header: Number(value) })}
          />
        </FieldGroup>
        <FieldGroup label="Footer" inline labelWidth={50}>
          <Input
            type="number"
            value={current.footer ?? 0.3}
            min={0}
            step={0.1}
            suffix="in"
            disabled={disabled}
            onChange={(value) => update({ footer: Number(value) })}
          />
        </FieldGroup>
      </FieldRow>
    </Accordion>
  );
}
