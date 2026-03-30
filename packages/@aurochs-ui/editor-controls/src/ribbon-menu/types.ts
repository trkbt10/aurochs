/**
 * @file Ribbon menu type definitions.
 */

import type { ReactNode } from "react";

/**
 * An item that can appear in a ribbon group.
 *
 * Two rendering modes:
 * - Default (icon + label as ToolbarButton): omit `renderWidget`
 * - Custom widget (font picker, color picker, formula bar, etc.): provide `renderWidget`
 */
export type RibbonMenuItemDef = {
  readonly id: string;
  readonly label: string;
  readonly icon: ReactNode;
  /**
   * Custom widget renderer. When provided, this is used instead of the default ToolbarButton.
   * Receives the execute callback so the widget can trigger commands.
   */
  readonly renderWidget?: (onExecute: (id: string) => void) => ReactNode;
};

/** A group of items within a ribbon tab. */
export type RibbonGroupDef = {
  readonly id: string;
  readonly label: string;
  readonly items: readonly RibbonMenuItemDef[];
};

/** A tab in the ribbon menu. */
export type RibbonTabDef = {
  readonly id: string;
  readonly label: string;
  readonly groups: readonly RibbonGroupDef[];
};
