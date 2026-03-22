/**
 * @file VerticalAlignmentGroup - Vertical alignment toggle buttons (top/center/bottom)
 */

import { ToolbarButton, TOOLBAR_BUTTON_ICON_SIZE } from "@aurochs-ui/ui-components/primitives/ToolbarButton";
import { AlignTopIcon, AlignMiddleIcon, AlignBottomIcon } from "@aurochs-ui/ui-components/icons";
import { iconTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { VerticalAlignmentGroupProps, VerticalAlignmentValue } from "./types";

const iconSize = TOOLBAR_BUTTON_ICON_SIZE.sm.icon;
const strokeWidth = iconTokens.strokeWidth;

const VERTICAL_ALIGNMENT_ITEMS: readonly {
  readonly value: VerticalAlignmentValue;
  readonly label: string;
  readonly icon: React.ReactNode;
}[] = [
  { value: "top", label: "Align top", icon: <AlignTopIcon size={iconSize} strokeWidth={strokeWidth} /> },
  { value: "center", label: "Align middle", icon: <AlignMiddleIcon size={iconSize} strokeWidth={strokeWidth} /> },
  { value: "bottom", label: "Align bottom", icon: <AlignBottomIcon size={iconSize} strokeWidth={strokeWidth} /> },
];






/** Vertical text alignment toggle button group */
export function VerticalAlignmentGroup({ value, onChange, disabled }: VerticalAlignmentGroupProps) {
  const isDisabled = disabled ?? false;
  const isMixed = Array.isArray(value);
  return (
    <>
      {VERTICAL_ALIGNMENT_ITEMS.map((item) => (
        <ToolbarButton
          key={item.value}
          label={item.label}
          icon={item.icon}
          active={isMixed ? "mixed" : value === item.value}
          disabled={isDisabled}
          size="sm"
          onClick={() => {
            const nextPressed = isMixed || value !== item.value;
            onChange(nextPressed ? item.value : undefined);
          }}
        />
      ))}
    </>
  );
}
