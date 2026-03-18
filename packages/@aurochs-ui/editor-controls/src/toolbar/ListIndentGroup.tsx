/**
 * @file ListIndentGroup - Bullet/Numbered list toggles + Indent increase/decrease
 */

import { ToggleButton } from "@aurochs-ui/ui-components/primitives";
import { ToolbarButton, TOOLBAR_BUTTON_ICON_SIZE } from "@aurochs-ui/ui-components/primitives/ToolbarButton";
import { ListIcon, ListOrderedIcon, IndentIncreaseIcon, IndentDecreaseIcon } from "@aurochs-ui/ui-components/icons";
import { iconTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { ListIndentGroupProps } from "./types";

const iconSize = TOOLBAR_BUTTON_ICON_SIZE.sm.icon;
const strokeWidth = iconTokens.strokeWidth;

export function ListIndentGroup({ bullet, numbered, onIncreaseIndent, onDecreaseIndent, disabled }: ListIndentGroupProps) {
  const isDisabled = disabled ?? false;
  return (
    <>
      {bullet && (
        <ToggleButton
          label="Bulleted list"
          pressed={bullet.pressed}
          disabled={isDisabled}
          onChange={() => bullet.onToggle()}
        >
          <ListIcon size={iconSize} strokeWidth={strokeWidth} />
        </ToggleButton>
      )}
      {numbered && (
        <ToggleButton
          label="Numbered list"
          pressed={numbered.pressed}
          disabled={isDisabled}
          onChange={() => numbered.onToggle()}
        >
          <ListOrderedIcon size={iconSize} strokeWidth={strokeWidth} />
        </ToggleButton>
      )}
      {onIncreaseIndent && (
        <ToolbarButton
          icon={<IndentIncreaseIcon size={iconSize} strokeWidth={strokeWidth} />}
          label="Increase indent"
          onClick={onIncreaseIndent}
          disabled={isDisabled}
          size="sm"
        />
      )}
      {onDecreaseIndent && (
        <ToolbarButton
          icon={<IndentDecreaseIcon size={iconSize} strokeWidth={strokeWidth} />}
          label="Decrease indent"
          onClick={onDecreaseIndent}
          disabled={isDisabled}
          size="sm"
        />
      )}
    </>
  );
}
