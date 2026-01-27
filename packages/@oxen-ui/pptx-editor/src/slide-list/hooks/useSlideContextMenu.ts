/**
 * @file Slide context menu hook
 *
 * Manages context menu state and actions for slides.
 */

import { useCallback, useState, useMemo } from "react";
import type { SlideId, SlideWithId } from "@oxen/pptx/app";
import type { SlideContextMenuState } from "../types";
import type { MenuEntry } from "../../ui/context-menu/types";

export type UseSlideContextMenuOptions = {
  /** Slides array */
  readonly slides: readonly SlideWithId[];
  /** Currently selected slide IDs */
  readonly selectedIds: readonly SlideId[];
  /** Called to delete slides */
  readonly onDeleteSlides?: (slideIds: readonly SlideId[]) => void;
  /** Called to duplicate slides */
  readonly onDuplicateSlides?: (slideIds: readonly SlideId[]) => void;
  /** Called to move slides */
  readonly onMoveSlides?: (
    slideIds: readonly SlideId[],
    toIndex: number
  ) => void;
};

export type UseSlideContextMenuResult = {
  /** Current context menu state */
  readonly contextMenu: SlideContextMenuState;
  /** Open context menu at position */
  readonly openContextMenu: (x: number, y: number, slideId: SlideId) => void;
  /** Close context menu */
  readonly closeContextMenu: () => void;
  /** Handle menu action */
  readonly handleMenuAction: (actionId: string) => void;
  /** Get menu items for current context */
  readonly getMenuItems: () => readonly MenuEntry[];
};

/** Action IDs for slide context menu */
export const SLIDE_LIST_MENU_ACTIONS = {
  DUPLICATE: "duplicate",
  MOVE_UP: "move-up",
  MOVE_DOWN: "move-down",
  DELETE: "delete",
} as const;

/**
 * Hook for managing slide context menu
 */
export function useSlideContextMenu(
  options: UseSlideContextMenuOptions
): UseSlideContextMenuResult {
  const { slides, selectedIds, onDeleteSlides, onDuplicateSlides, onMoveSlides } =
    options;

  const [contextMenu, setContextMenu] = useState<SlideContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    slideId: null,
  });

  const openContextMenu = useCallback(
    (x: number, y: number, slideId: SlideId) => {
      setContextMenu({ visible: true, x, y, slideId });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  // Get the effective selection (include right-clicked slide if not selected)
  const getEffectiveSelection = useCallback((): readonly SlideId[] => {
    if (!contextMenu.slideId) {return selectedIds;}

    if (selectedIds.includes(contextMenu.slideId)) {
      return selectedIds;
    }

    // Right-clicked slide is not in selection, use it alone
    return [contextMenu.slideId];
  }, [contextMenu.slideId, selectedIds]);

  const handleMenuAction = useCallback(
    (actionId: string) => {
      const effectiveIds = getEffectiveSelection();
      if (effectiveIds.length === 0) {return;}

      switch (actionId) {
        case SLIDE_LIST_MENU_ACTIONS.DUPLICATE:
          onDuplicateSlides?.(effectiveIds);
          break;

        case SLIDE_LIST_MENU_ACTIONS.DELETE:
          onDeleteSlides?.(effectiveIds);
          break;

        case SLIDE_LIST_MENU_ACTIONS.MOVE_UP: {
          const minIndex = Math.min(
            ...effectiveIds.map((id) => slides.findIndex((s) => s.id === id))
          );
          if (minIndex > 0) {
            onMoveSlides?.(effectiveIds, minIndex - 1);
          }
          break;
        }

        case SLIDE_LIST_MENU_ACTIONS.MOVE_DOWN: {
          const maxIndex = Math.max(
            ...effectiveIds.map((id) => slides.findIndex((s) => s.id === id))
          );
          if (maxIndex < slides.length - 1) {
            onMoveSlides?.(effectiveIds, maxIndex + 2 - effectiveIds.length);
          }
          break;
        }
      }

      closeContextMenu();
    },
    [
      getEffectiveSelection,
      slides,
      onDeleteSlides,
      onDuplicateSlides,
      onMoveSlides,
      closeContextMenu,
    ]
  );

  const getMenuItems = useCallback((): readonly MenuEntry[] => {
    const effectiveIds = getEffectiveSelection();
    const count = effectiveIds.length;
    const isMultiple = count > 1;

    // Calculate position constraints
    const indices = effectiveIds.map((id) =>
      slides.findIndex((s) => s.id === id)
    );
    const minIndex = Math.min(...indices);
    const maxIndex = Math.max(...indices);
    const canMoveUp = minIndex > 0;
    const canMoveDown = maxIndex < slides.length - 1;
    const canDelete = slides.length > count;

    const duplicateLabel = isMultiple
      ? `Duplicate ${count} Slides`
      : "Duplicate Slide";
    const deleteLabel = isMultiple
      ? `Delete ${count} Slides`
      : "Delete Slide";

    return [
      { id: SLIDE_LIST_MENU_ACTIONS.DUPLICATE, label: duplicateLabel },
      { type: "separator" },
      {
        id: SLIDE_LIST_MENU_ACTIONS.MOVE_UP,
        label: "Move Up",
        disabled: !canMoveUp,
      },
      {
        id: SLIDE_LIST_MENU_ACTIONS.MOVE_DOWN,
        label: "Move Down",
        disabled: !canMoveDown,
      },
      { type: "separator" },
      {
        id: SLIDE_LIST_MENU_ACTIONS.DELETE,
        label: deleteLabel,
        danger: true,
        disabled: !canDelete,
      },
    ];
  }, [getEffectiveSelection, slides]);

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu,
    handleMenuAction,
    getMenuItems,
  };
}
