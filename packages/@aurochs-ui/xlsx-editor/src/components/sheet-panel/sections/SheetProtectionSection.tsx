/**
 * @file Sheet Protection section
 *
 * Section for sheet protection settings.
 * Controls which operations are allowed when the sheet is protected.
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import { Accordion, Toggle, FieldGroup, FieldRow, Button } from "@aurochs-ui/ui-components";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { XlsxSheetProtection } from "@aurochs-office/xlsx/domain/protection";

export type SheetProtectionSectionProps = {
  readonly disabled: boolean;
  readonly protection: XlsxSheetProtection | undefined;
  readonly onProtectionChange: (protection: XlsxSheetProtection | undefined) => void;
};

const descriptionStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
  marginBottom: spacingTokens.sm,
};

const groupTitleStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
  color: colorTokens.text.secondary,
  marginTop: spacingTokens.sm,
  marginBottom: spacingTokens.xs,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.sm,
  marginTop: spacingTokens.md,
};

/**
 * Sheet protection settings section.
 */
export function SheetProtectionSection({
  disabled,
  protection,
  onProtectionChange,
}: SheetProtectionSectionProps) {
  const isProtected = protection?.sheet === true;
  const current = useMemo(() => protection ?? {}, [protection]);

  const update = useCallback(
    (partial: Partial<XlsxSheetProtection>) => {
      const next = { ...current, ...partial };
      // If all options are off, clear protection
      const hasAnyOption = Object.values(next).some((v) => v === true);
      onProtectionChange(hasAnyOption ? next : undefined);
    },
    [current, onProtectionChange],
  );

  const toggleProtection = useCallback(() => {
    if (isProtected) {
      // Turn off protection
      onProtectionChange(undefined);
    } else {
      // Turn on protection with defaults
      onProtectionChange({
        sheet: true,
        selectLockedCells: true,
        selectUnlockedCells: true,
      });
    }
  }, [isProtected, onProtectionChange]);

  const clearProtection = useCallback(() => {
    onProtectionChange(undefined);
  }, [onProtectionChange]);

  return (
    <Accordion title="Sheet Protection" defaultExpanded={isProtected}>
      <div style={descriptionStyle}>
        When protected, only allowed operations can be performed on this sheet.
      </div>

      <FieldGroup label="Protect Sheet" inline labelWidth={100}>
        <Toggle
          checked={isProtected}
          disabled={disabled}
          onChange={toggleProtection}
        />
      </FieldGroup>

      {isProtected && (
        <>
          <div style={groupTitleStyle}>Allow users to:</div>

          {/* Selection options */}
          <FieldRow>
            <FieldGroup label="Select locked" inline labelWidth={95}>
              <Toggle
                checked={current.selectLockedCells ?? false}
                disabled={disabled}
                onChange={(checked) => update({ selectLockedCells: checked })}
              />
            </FieldGroup>
            <FieldGroup label="Select unlocked" inline labelWidth={110}>
              <Toggle
                checked={current.selectUnlockedCells ?? false}
                disabled={disabled}
                onChange={(checked) => update({ selectUnlockedCells: checked })}
              />
            </FieldGroup>
          </FieldRow>

          {/* Formatting options */}
          <FieldRow>
            <FieldGroup label="Format cells" inline labelWidth={95}>
              <Toggle
                checked={current.formatCells ?? false}
                disabled={disabled}
                onChange={(checked) => update({ formatCells: checked })}
              />
            </FieldGroup>
            <FieldGroup label="Format cols" inline labelWidth={110}>
              <Toggle
                checked={current.formatColumns ?? false}
                disabled={disabled}
                onChange={(checked) => update({ formatColumns: checked })}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Format rows" inline labelWidth={95}>
              <Toggle
                checked={current.formatRows ?? false}
                disabled={disabled}
                onChange={(checked) => update({ formatRows: checked })}
              />
            </FieldGroup>
          </FieldRow>

          {/* Insertion options */}
          <FieldRow>
            <FieldGroup label="Insert cols" inline labelWidth={95}>
              <Toggle
                checked={current.insertColumns ?? false}
                disabled={disabled}
                onChange={(checked) => update({ insertColumns: checked })}
              />
            </FieldGroup>
            <FieldGroup label="Insert rows" inline labelWidth={110}>
              <Toggle
                checked={current.insertRows ?? false}
                disabled={disabled}
                onChange={(checked) => update({ insertRows: checked })}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Insert links" inline labelWidth={95}>
              <Toggle
                checked={current.insertHyperlinks ?? false}
                disabled={disabled}
                onChange={(checked) => update({ insertHyperlinks: checked })}
              />
            </FieldGroup>
          </FieldRow>

          {/* Deletion options */}
          <FieldRow>
            <FieldGroup label="Delete cols" inline labelWidth={95}>
              <Toggle
                checked={current.deleteColumns ?? false}
                disabled={disabled}
                onChange={(checked) => update({ deleteColumns: checked })}
              />
            </FieldGroup>
            <FieldGroup label="Delete rows" inline labelWidth={110}>
              <Toggle
                checked={current.deleteRows ?? false}
                disabled={disabled}
                onChange={(checked) => update({ deleteRows: checked })}
              />
            </FieldGroup>
          </FieldRow>

          {/* Data features */}
          <FieldRow>
            <FieldGroup label="Sort" inline labelWidth={95}>
              <Toggle
                checked={current.sort ?? false}
                disabled={disabled}
                onChange={(checked) => update({ sort: checked })}
              />
            </FieldGroup>
            <FieldGroup label="Auto filter" inline labelWidth={110}>
              <Toggle
                checked={current.autoFilter ?? false}
                disabled={disabled}
                onChange={(checked) => update({ autoFilter: checked })}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Pivot tables" inline labelWidth={95}>
              <Toggle
                checked={current.pivotTables ?? false}
                disabled={disabled}
                onChange={(checked) => update({ pivotTables: checked })}
              />
            </FieldGroup>
          </FieldRow>

          {/* Other options */}
          <FieldRow>
            <FieldGroup label="Objects" inline labelWidth={95}>
              <Toggle
                checked={current.objects ?? false}
                disabled={disabled}
                onChange={(checked) => update({ objects: checked })}
              />
            </FieldGroup>
            <FieldGroup label="Scenarios" inline labelWidth={110}>
              <Toggle
                checked={current.scenarios ?? false}
                disabled={disabled}
                onChange={(checked) => update({ scenarios: checked })}
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
