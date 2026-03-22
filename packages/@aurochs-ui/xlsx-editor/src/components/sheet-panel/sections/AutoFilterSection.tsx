/**
 * @file Auto Filter section
 *
 * Section for auto filter settings.
 * Allows enabling/disabling auto filter on the current selection.
 */

import { useCallback, type CSSProperties } from "react";
import { Button, FieldGroup } from "@aurochs-ui/ui-components";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { XlsxAutoFilter } from "@aurochs-office/xlsx/domain/auto-filter";
import { formatRange, type CellRange } from "@aurochs-office/xlsx/domain/cell/address";

export type AutoFilterSectionProps = {
  readonly disabled: boolean;
  readonly autoFilter: XlsxAutoFilter | undefined;
  readonly selectedRange: CellRange | undefined;
  readonly onAutoFilterChange: (autoFilter: XlsxAutoFilter | undefined) => void;
};

const descriptionStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
  marginBottom: spacingTokens.sm,
};

const statusStyle: CSSProperties = {
  fontSize: fontTokens.size.md,
  marginBottom: spacingTokens.sm,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.sm,
  marginTop: spacingTokens.sm,
};

const infoStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.secondary,
  marginTop: spacingTokens.xs,
};

/**
 * Auto filter settings section.
 */
export function AutoFilterSection({
  disabled,
  autoFilter,
  selectedRange,
  onAutoFilterChange,
}: AutoFilterSectionProps) {
  const hasFilter = autoFilter !== undefined;

  const handleApplyFilter = useCallback(() => {
    if (!selectedRange) {
      return;
    }
    onAutoFilterChange({
      ref: selectedRange,
    });
  }, [selectedRange, onAutoFilterChange]);

  const handleClearFilter = useCallback(() => {
    onAutoFilterChange(undefined);
  }, [onAutoFilterChange]);

  const filterColumnCount = autoFilter?.filterColumns?.length ?? 0;
  const activeFiltersCount = autoFilter?.filterColumns?.filter((c) => c.filter !== undefined).length ?? 0;

  const renderFilterStatus = () => {
    if (activeFiltersCount > 0) {
      return `${activeFiltersCount} column(s) with active filters`;
    }
    return `${filterColumnCount} filterable column(s)`;
  };

  const renderContent = () => {
    if (hasFilter) {
      return (
        <>
          <FieldGroup label="Filter Range">
            <div style={statusStyle}>{formatRange(autoFilter.ref)}</div>
          </FieldGroup>

          {filterColumnCount > 0 && (
            <div style={infoStyle}>
              {renderFilterStatus()}
            </div>
          )}

          {autoFilter.sortState && (
            <div style={infoStyle}>
              Sort applied: {autoFilter.sortState.ref}
            </div>
          )}

          <div style={buttonRowStyle}>
            <Button size="sm" disabled={disabled} onClick={handleClearFilter}>
              Remove Auto Filter
            </Button>
            {selectedRange && (
              <Button size="sm" disabled={disabled} onClick={handleApplyFilter}>
                Change Range
              </Button>
            )}
          </div>
        </>
      );
    }
    if (selectedRange) {
      return (
        <>
          <div style={statusStyle}>
            Apply auto filter to: {formatRange(selectedRange)}
          </div>
          <div style={buttonRowStyle}>
            <Button size="sm" disabled={disabled} onClick={handleApplyFilter}>
              Apply Auto Filter
            </Button>
          </div>
        </>
      );
    }
    return (
      <div style={{ ...descriptionStyle, fontStyle: "italic" }}>
        Select a range to apply auto filter.
      </div>
    );
  };

  return (
    <OptionalPropertySection title="Auto Filter" defaultExpanded={hasFilter}>
      <div style={descriptionStyle}>
        Auto filter adds dropdown filters to column headers for quick data filtering.
      </div>
      {renderContent()}
    </OptionalPropertySection>
  );
}
