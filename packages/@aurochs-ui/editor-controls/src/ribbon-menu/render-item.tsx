/**
 * @file Default renderer for ribbon menu items.
 * Uses item.renderWidget if provided, otherwise falls back to ToolbarButton.
 */

import type { ReactNode } from "react";
import { ToolbarButton } from "@aurochs-ui/ui-components/primitives/ToolbarButton";
import type { RibbonMenuItemDef } from "./types";

/** Render a ribbon item. Custom widgets take precedence over default button. */
export function renderRibbonItem(item: RibbonMenuItemDef, onExecute: (id: string) => void): ReactNode {
  if (item.renderWidget) {
    return item.renderWidget(onExecute);
  }
  return <ToolbarButton icon={item.icon} label={item.label} onClick={() => onExecute(item.id)} size="sm" />;
}
