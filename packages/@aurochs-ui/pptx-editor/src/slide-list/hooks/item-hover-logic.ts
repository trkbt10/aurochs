/**
 * @file Item hover state logic (pure functions)
 *
 * Pure logic for hover state management, separated for testability.
 */

export type ItemHoverState = {
  isHovered: boolean;
};

export type ItemHoverAction =
  | { type: "mouseEnter" }
  | { type: "mouseLeave" }
  | { type: "dragStart" }
  | { type: "clearHover" }
  | { type: "dragStateChanged"; isDragging: boolean };

/**
 * Initial hover state
 */
export function createInitialHoverState(): ItemHoverState {
  return { isHovered: false };
}

/**
 * Reducer for hover state
 */
export function hoverReducer(
  state: ItemHoverState,
  action: ItemHoverAction
): ItemHoverState {
  switch (action.type) {
    case "mouseEnter":
      return { isHovered: true };

    case "mouseLeave":
      return { isHovered: false };

    case "dragStart":
      // Always clear hover when drag starts
      return { isHovered: false };

    case "clearHover":
      return { isHovered: false };

    case "dragStateChanged":
      // Clear hover when dragging becomes true
      if (action.isDragging) {
        return { isHovered: false };
      }
      // Keep current state when dragging ends
      return state;

    default:
      return state;
  }
}

/**
 * Determine if hover should show based on state and dragging
 */
export function shouldShowHover(
  state: ItemHoverState,
  isDragging: boolean
): boolean {
  return state.isHovered && !isDragging;
}
