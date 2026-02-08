/**
 * @file Circular delete button component
 *
 * Appears on hover over slide thumbnail.
 */

import type { DeleteButtonProps } from "./types";
import { getDeleteButtonStyle } from "./styles";

/**
 * Circular delete button for slide items
 */
export function DeleteButton({ visible, onClick }: DeleteButtonProps) {
  return (
    <button
      type="button"
      style={getDeleteButtonStyle(visible)}
      onClick={onClick}
      aria-label="Delete slide"
      tabIndex={visible ? 0 : -1}
    >
      ×
    </button>
  );
}
