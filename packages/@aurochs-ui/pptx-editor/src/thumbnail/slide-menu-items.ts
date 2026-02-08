/**
 * @file Slide context menu items
 *
 * Configuration for the slide thumbnail context menu.
 * Uses the shared context menu types.
 */

import type { MenuEntry } from "@aurochs-ui/ui-components";

/** Action IDs for slide context menu */
export const SLIDE_MENU_ACTIONS = {
  DUPLICATE: "duplicate",
  MOVE_UP: "move-up",
  MOVE_DOWN: "move-down",
  DELETE: "delete",
} as const;

export type SlideMenuAction = (typeof SLIDE_MENU_ACTIONS)[keyof typeof SLIDE_MENU_ACTIONS];

/**
 * Build context menu items for a slide
 */
export function buildSlideMenuItems(options: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
}): readonly MenuEntry[] {
  return [
    {
      id: SLIDE_MENU_ACTIONS.DUPLICATE,
      label: "Duplicate Slide",
    },
    { type: "separator" },
    {
      id: SLIDE_MENU_ACTIONS.MOVE_UP,
      label: "Move Up",
      disabled: !options.canMoveUp,
    },
    {
      id: SLIDE_MENU_ACTIONS.MOVE_DOWN,
      label: "Move Down",
      disabled: !options.canMoveDown,
    },
    { type: "separator" },
    {
      id: SLIDE_MENU_ACTIONS.DELETE,
      label: "Delete Slide",
      danger: true,
      disabled: !options.canDelete,
    },
  ];
}
