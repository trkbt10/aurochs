/**
 * @file LinePickerPopover component
 *
 * Adobe/Figma-style line picker that opens in a popover.
 * Provides a visual preview and controls for all line properties.
 */

import { type CSSProperties, type ReactNode } from "react";
import { Popover } from "../primitives/Popover";
import { LineSwatch, type LineSwatchSize } from "./LineSwatch";
import { LineEditor } from "./LineEditor";
import type { Line } from "../../../pptx/domain/color/types";

export type LinePickerPopoverProps = {
  /** Current line value */
  readonly value: Line;
  /** Called when line changes */
  readonly onChange: (line: Line) => void;
  /** Size of the trigger swatch */
  readonly size?: LineSwatchSize;
  /** Disable interaction */
  readonly disabled?: boolean;
  /** Custom trigger element */
  readonly trigger?: ReactNode;
  /** Show line ends section */
  readonly showEnds?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const popoverContentStyle: CSSProperties = {
  width: "260px",
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * A line picker popover for editing Line values.
 */
export function LinePickerPopover({
  value,
  onChange,
  size = "md",
  disabled,
  trigger,
  showEnds = true,
}: LinePickerPopoverProps) {
  const triggerElement = trigger ?? <LineSwatch line={value} size={size} disabled={disabled} />;

  return (
    <Popover trigger={triggerElement} align="start" side="bottom" disabled={disabled}>
      <LineEditor
        value={value}
        onChange={onChange}
        disabled={disabled}
        showEnds={showEnds}
        style={popoverContentStyle}
      />
    </Popover>
  );
}
