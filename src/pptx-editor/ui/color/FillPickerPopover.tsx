/**
 * @file FillPickerPopover component
 *
 * Popover for editing Fill values (NoFill, Solid, Gradient).
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import { Popover } from "../primitives/Popover";
import { Select } from "../primitives/Select";
import type { Fill } from "../../../pptx/domain/color/types";
import { FillPreview } from "./FillPreview";
import {
  fillTypeOptions,
  createDefaultFill,
  SolidFillEditor,
  GradientFillEditor,
  type FillType,
} from "./fill";

export type FillPickerPopoverProps = {
  /** Current fill value */
  readonly value: Fill;
  /** Called when fill changes */
  readonly onChange: (fill: Fill) => void;
  /** Disable interaction */
  readonly disabled?: boolean;
  /** Custom trigger element (parent controls size and interaction styling) */
  readonly trigger?: ReactNode;
};

const defaultTriggerStyle: CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: "4px",
  cursor: "pointer",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
  overflow: "hidden",
};

const popoverContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  width: "260px",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const noFillMessageStyle: CSSProperties = {
  textAlign: "center",
  color: "var(--text-tertiary)",
  fontSize: "12px",
  padding: "16px 0",
};

/**
 * A fill picker popover for editing Fill values.
 */
export function FillPickerPopover({
  value,
  onChange,
  disabled,
  trigger,
}: FillPickerPopoverProps) {
  const handleTypeChange = useCallback(
    (newType: string) => {
      onChange(createDefaultFill(newType as FillType));
    },
    [onChange]
  );

  const triggerElement = trigger ?? (
    <div style={{ ...defaultTriggerStyle, opacity: disabled ? 0.5 : 1 }}>
      <FillPreview fill={value} />
    </div>
  );

  return (
    <Popover trigger={triggerElement} align="start" side="bottom" disabled={disabled}>
      <div style={popoverContentStyle}>
        <div style={headerStyle}>
          <Select
            value={value.type}
            onChange={handleTypeChange}
            options={fillTypeOptions}
            style={{ flex: 1 }}
          />
        </div>

        {value.type === "noFill" && <div style={noFillMessageStyle}>No fill</div>}

        {value.type === "solidFill" && (
          <SolidFillEditor value={value} onChange={onChange} />
        )}

        {value.type === "gradientFill" && (
          <GradientFillEditor value={value} onChange={onChange} />
        )}
      </div>
    </Popover>
  );
}
