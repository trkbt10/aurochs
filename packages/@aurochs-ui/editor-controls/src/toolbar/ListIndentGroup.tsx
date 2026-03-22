/**
 * @file ListIndentGroup - Bullet/Numbered list toggles + Indent increase/decrease
 */

import { ToolbarButton, TOOLBAR_BUTTON_ICON_SIZE } from "@aurochs-ui/ui-components/primitives/ToolbarButton";
import { ListIcon, ListOrderedIcon, IndentIncreaseIcon, IndentDecreaseIcon } from "@aurochs-ui/ui-components/icons";
import { iconTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { ListIndentGroupProps } from "./types";

const iconSize = TOOLBAR_BUTTON_ICON_SIZE.sm.icon;
const strokeWidth = iconTokens.strokeWidth;






/** List type and indent level control button group */
export function ListIndentGroup({ bullet, numbered, onIncreaseIndent, onDecreaseIndent, disabled }: ListIndentGroupProps) {
  const isDisabled = disabled ?? false;
  return (
    <>
      {bullet && (
        <ToolbarButton
          label="Bulleted list"
          icon={<ListIcon size={iconSize} strokeWidth={strokeWidth} />}
          active={bullet.pressed}
          disabled={isDisabled}
          size="sm"
          onClick={() => bullet.onToggle()}
        />
      )}
      {numbered && (
        <ToolbarButton
          label="Numbered list"
          icon={<ListOrderedIcon size={iconSize} strokeWidth={strokeWidth} />}
          active={numbered.pressed}
          disabled={isDisabled}
          size="sm"
          onClick={() => numbered.onToggle()}
        />
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
