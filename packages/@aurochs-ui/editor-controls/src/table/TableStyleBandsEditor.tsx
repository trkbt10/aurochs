/**
 * @file TableStyleBandsEditor - Shared table style band toggle grid
 *
 * Renders a 2x3 grid of toggles for table style band options.
 * Uses positive semantics; DOCX adapter inverts noHBand/noVBand.
 */

import { useCallback, type CSSProperties } from "react";
import { Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import type { TableStyleBands, TableBandFeatures } from "./types";

// =============================================================================
// Types
// =============================================================================

export type TableStyleBandsEditorProps = {
  readonly value: TableStyleBands;
  readonly onChange: (update: Partial<TableStyleBands>) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly features?: TableBandFeatures;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
};

const toggleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const labelStyle: CSSProperties = {
  fontSize: "12px",
  userSelect: "none",
};

// =============================================================================
// Component
// =============================================================================

type BandKey = keyof TableStyleBands;

const BAND_ENTRIES: readonly { key: BandKey; label: string; featureKey: keyof TableBandFeatures }[] = [
  { key: "headerRow", label: "Header Row", featureKey: "showHeaderRow" },
  { key: "totalRow", label: "Total Row", featureKey: "showTotalRow" },
  { key: "firstColumn", label: "First Column", featureKey: "showFirstColumn" },
  { key: "lastColumn", label: "Last Column", featureKey: "showLastColumn" },
  { key: "bandedRows", label: "Banded Rows", featureKey: "showBandedRows" },
  { key: "bandedColumns", label: "Banded Columns", featureKey: "showBandedColumns" },
];

/** Shared table style band toggle grid for header/total/banded options. */
export function TableStyleBandsEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  features,
}: TableStyleBandsEditorProps) {
  const handleToggle = useCallback(
    (key: BandKey, checked: boolean) => {
      onChange({ [key]: checked });
    },
    [onChange],
  );

  const visibleEntries = BAND_ENTRIES.filter(({ featureKey }) => features?.[featureKey] !== false);

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      <FieldGroup label="Style Options">
        <div style={gridStyle}>
          {visibleEntries.map(({ key, label }) => (
            <div key={key} style={toggleRowStyle}>
              <Toggle
                checked={value[key] ?? false}
                onChange={(checked) => handleToggle(key, checked)}
                disabled={disabled}
              />
              <span style={labelStyle}>{label}</span>
            </div>
          ))}
        </div>
      </FieldGroup>
    </div>
  );
}
