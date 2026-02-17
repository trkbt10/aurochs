/**
 * @file Workbook Protection section
 *
 * Section for workbook-level protection settings.
 * Controls whether workbook structure and windows can be modified.
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import { Accordion, Toggle, FieldGroup, FieldRow, Button } from "@aurochs-ui/ui-components";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { XlsxWorkbookProtection } from "@aurochs-office/xlsx/domain/protection";

export type WorkbookProtectionSectionProps = {
  readonly disabled: boolean;
  readonly protection: XlsxWorkbookProtection | undefined;
  readonly onProtectionChange: (protection: XlsxWorkbookProtection | undefined) => void;
};

const descriptionStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
  marginBottom: spacingTokens.sm,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.sm,
  marginTop: spacingTokens.md,
};

/**
 * Workbook protection settings section.
 */
export function WorkbookProtectionSection({
  disabled,
  protection,
  onProtectionChange,
}: WorkbookProtectionSectionProps) {
  const isProtected = protection?.lockStructure === true || protection?.lockWindows === true;
  const current = useMemo(() => protection ?? {}, [protection]);

  const update = useCallback(
    (partial: Partial<XlsxWorkbookProtection>) => {
      const next = { ...current, ...partial };
      // If no protection options are set, clear protection
      const hasAnyOption = next.lockStructure === true || next.lockWindows === true;
      onProtectionChange(hasAnyOption ? next : undefined);
    },
    [current, onProtectionChange],
  );

  const toggleProtection = useCallback(() => {
    if (isProtected) {
      onProtectionChange(undefined);
    } else {
      onProtectionChange({ lockStructure: true });
    }
  }, [isProtected, onProtectionChange]);

  const clearProtection = useCallback(() => {
    onProtectionChange(undefined);
  }, [onProtectionChange]);

  return (
    <Accordion title="Workbook Protection" defaultExpanded={isProtected}>
      <div style={descriptionStyle}>
        Protect the workbook structure to prevent adding, deleting, or moving sheets.
      </div>

      <FieldGroup label="Protect Workbook" inline labelWidth={120}>
        <Toggle
          checked={isProtected}
          disabled={disabled}
          onChange={toggleProtection}
        />
      </FieldGroup>

      {isProtected && (
        <>
          <FieldRow>
            <FieldGroup label="Lock structure" inline labelWidth={100}>
              <Toggle
                checked={current.lockStructure ?? false}
                disabled={disabled}
                onChange={(checked) => update({ lockStructure: checked })}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Lock windows" inline labelWidth={100}>
              <Toggle
                checked={current.lockWindows ?? false}
                disabled={disabled}
                onChange={(checked) => update({ lockWindows: checked })}
              />
            </FieldGroup>
          </FieldRow>

          <div style={buttonRowStyle}>
            <Button size="sm" disabled={disabled} onClick={clearProtection}>
              Remove Protection
            </Button>
          </div>
        </>
      )}
    </Accordion>
  );
}
