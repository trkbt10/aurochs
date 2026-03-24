/**
 * @file FillPickerPopover component
 *
 * Popover for editing Fill values.
 * Uses react-editor-ui's FillPanel internally while maintaining API compatibility.
 */

import type { CSSProperties, ReactNode } from "react";
import { Popover } from "@aurochs-ui/ui-components/primitives";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import { colorTokens, radiusTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { FillPreview } from "./FillPreview";
import { AdaptedFillPanel } from "./composed/AdaptedFillPanel";

export type FillPickerPopoverProps = {
  /** Current fill value */
  readonly value: BaseFill;
  /** Called when fill changes */
  readonly onChange: (fill: BaseFill) => void;
  /** Disable interaction */
  readonly disabled?: boolean;
  /** Custom trigger element (parent controls size and interaction styling) */
  readonly trigger?: ReactNode;
};

const defaultTriggerStyle: CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: radiusTokens.sm,
  cursor: "pointer",
  border: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  overflow: "hidden",
};

const popoverContentStyle: CSSProperties = {
  padding: spacingTokens.md,
  width: "260px",
};

/**
 * A fill picker popover for editing Fill values.
 * Internally delegates to react-editor-ui's FillPanel via AdaptedFillPanel.
 */
export function FillPickerPopover({ value, onChange, disabled, trigger }: FillPickerPopoverProps) {
  const triggerElement = trigger ?? (
    <div style={{ ...defaultTriggerStyle, opacity: disabled ? 0.5 : 1 }}>
      <FillPreview fill={value} />
    </div>
  );

  return (
    <Popover trigger={triggerElement} align="start" side="bottom" disabled={disabled}>
      <div style={popoverContentStyle}>
        <AdaptedFillPanel value={value} onChange={onChange} disabled={disabled} />
      </div>
    </Popover>
  );
}
