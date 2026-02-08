/**
 * @file LineSpacingEditor - Editor for line spacing
 *
 * Handles both percent-based and points-based line spacing.
 */

import { useCallback, type CSSProperties } from "react";
import { Select } from "@aurochs-ui/ui-components/primitives";
import { FieldRow } from "@aurochs-ui/ui-components/layout";
import { PercentEditor, PointsEditor } from "../primitives";
import type { LineSpacing } from "@aurochs-office/pptx/domain/text";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";
import { pct, pt, type Percent, type Points } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Types
// =============================================================================

type LineSpacingType = "percent" | "points";

export type LineSpacingEditorProps = EditorProps<LineSpacing | undefined> & {
  readonly style?: CSSProperties;
  /** Label for the empty option */
  readonly emptyLabel?: string;
  /** Allow undefined (no spacing) */
  readonly allowEmpty?: boolean;
};

// =============================================================================
// Options
// =============================================================================

const typeOptions: readonly SelectOption<LineSpacingType | "">[] = [
  { value: "", label: "Default" },
  { value: "percent", label: "Percent" },
  { value: "points", label: "Points" },
];

const typeOptionsRequired: readonly SelectOption<LineSpacingType>[] = [
  { value: "percent", label: "Percent" },
  { value: "points", label: "Points" },
];

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const selectStyle: CSSProperties = {
  minWidth: "100px",
};

const valueStyle: CSSProperties = {
  flex: 1,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for line spacing (percent or points based)
 */
export function LineSpacingEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  allowEmpty = true,
}: LineSpacingEditorProps) {
  const handleTypeChange = useCallback(
    (newType: string) => {
      if (newType === "") {
        onChange(undefined);
        return;
      }

      const type = newType as LineSpacingType;
      if (type === "percent") {
        onChange({ type: "percent", value: pct(100) });
      } else {
        onChange({ type: "points", value: pt(12) });
      }
    },
    [onChange],
  );

  const handlePercentChange = useCallback(
    (newValue: Percent) => {
      onChange({ type: "percent", value: newValue });
    },
    [onChange],
  );

  const handlePointsChange = useCallback(
    (newValue: Points) => {
      onChange({ type: "points", value: newValue });
    },
    [onChange],
  );

  const currentType = value?.type ?? "";
  const options = allowEmpty ? typeOptions : typeOptionsRequired;

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <FieldRow>
        <Select
          value={currentType}
          onChange={handleTypeChange}
          options={options}
          disabled={disabled}
          style={selectStyle}
        />
        {value?.type === "percent" && (
          <div style={valueStyle}>
            <PercentEditor value={value.value} onChange={handlePercentChange} disabled={disabled} min={0} max={1000} />
          </div>
        )}
        {value?.type === "points" && (
          <div style={valueStyle}>
            <PointsEditor value={value.value} onChange={handlePointsChange} disabled={disabled} min={0} max={999} />
          </div>
        )}
      </FieldRow>
    </div>
  );
}

/**
 * Create default percent-based line spacing
 */
export function createDefaultLineSpacing(): LineSpacing {
  return { type: "percent", value: pct(100) };
}
