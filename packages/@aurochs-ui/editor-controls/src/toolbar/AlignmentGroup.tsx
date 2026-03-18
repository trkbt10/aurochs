/**
 * @file AlignmentGroup - Paragraph alignment toggle buttons (L/C/R/J)
 */

import { ToggleButton } from "@aurochs-ui/ui-components/primitives";
import { TOOLBAR_BUTTON_ICON_SIZE } from "@aurochs-ui/ui-components/primitives/ToolbarButton";
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon } from "@aurochs-ui/ui-components/icons";
import { iconTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { AlignmentGroupProps, AlignmentValue } from "./types";

const iconSize = TOOLBAR_BUTTON_ICON_SIZE.sm.icon;
const strokeWidth = iconTokens.strokeWidth;

const ALIGNMENT_ITEMS: readonly {
  readonly value: AlignmentValue;
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly requiresJustify?: boolean;
}[] = [
  { value: "left", label: "Align left", icon: <AlignLeftIcon size={iconSize} strokeWidth={strokeWidth} /> },
  { value: "center", label: "Align center", icon: <AlignCenterIcon size={iconSize} strokeWidth={strokeWidth} /> },
  { value: "right", label: "Align right", icon: <AlignRightIcon size={iconSize} strokeWidth={strokeWidth} /> },
  { value: "justify", label: "Align justify", icon: <AlignJustifyIcon size={iconSize} strokeWidth={strokeWidth} />, requiresJustify: true },
];

export function AlignmentGroup({ value, onChange, showJustify, mixed, disabled }: AlignmentGroupProps) {
  const isDisabled = disabled ?? false;
  return (
    <>
      {ALIGNMENT_ITEMS.map((item) => {
        if (item.requiresJustify && !showJustify) {
          return null;
        }
        return (
          <ToggleButton
            key={item.value}
            label={item.label}
            pressed={!mixed && value === item.value}
            mixed={mixed}
            disabled={isDisabled}
            onChange={(pressed) => {
              onChange(pressed ? item.value : undefined);
            }}
          >
            {item.icon}
          </ToggleButton>
        );
      })}
    </>
  );
}
