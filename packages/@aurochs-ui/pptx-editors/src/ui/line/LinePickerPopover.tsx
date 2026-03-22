/**
 * @file LinePickerPopover component
 *
 * Adobe/Figma-style line picker that opens in a popover.
 * Uses shared ToolbarPopoverButton as the trigger/popover foundation.
 */

import type { ReactNode } from "react";
import { ToolbarPopoverButton } from "@aurochs-ui/editor-controls/toolbar";
import { LineSwatch, type LineSwatchSize } from "./LineSwatch";
import { LineEditor } from "./LineEditor";
import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";

export type LinePickerPopoverProps = {
  /** Current line value */
  readonly value: BaseLine;
  /** Called when line changes */
  readonly onChange: (line: BaseLine) => void;
  /** Size of the trigger swatch */
  readonly size?: LineSwatchSize;
  /** Disable interaction */
  readonly disabled?: boolean;
  /** Custom trigger element */
  readonly trigger?: ReactNode;
  /** Show line ends section */
  readonly showEnds?: boolean;
};

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
  const swatchElement = trigger ?? <LineSwatch line={value} size={size} disabled={disabled} />;

  return (
    <ToolbarPopoverButton
      icon={swatchElement}
      label="Line style"
      disabled={disabled}
      swatch
      panelWidth={260}
    >
      <LineEditor
        value={value}
        onChange={onChange}
        disabled={disabled}
        showEnds={showEnds}
      />
    </ToolbarPopoverButton>
  );
}
