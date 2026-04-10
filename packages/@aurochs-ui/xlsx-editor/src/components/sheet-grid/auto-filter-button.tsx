/**
 * @file AutoFilter dropdown button
 *
 * Renders a small dropdown arrow button overlaid on an autoFilter header row cell.
 * In Excel, these buttons appear on the data cells of the header row (the first row
 * of the autoFilter range), not on the column headers (A, B, C...).
 *
 * The icon changes based on filter/sort state.
 *
 * @see ECMA-376 Part 4, Section 18.3.2.5 (filterColumn)
 */

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { colorTokens, radiusTokens } from "@aurochs-ui/ui-components";

export type AutoFilterButtonProps = {
  /** Whether this column has an active filter applied */
  readonly hasActiveFilter: boolean;
  /** Current sort direction for this column, if any */
  readonly sortDirection: "ascending" | "descending" | undefined;
  /** Called when the button is clicked, with the button element for positioning */
  readonly onClick: (buttonElement: HTMLElement) => void;
};

/**
 * Button size matches the Excel convention: a small square in the bottom-right
 * corner of the header row cell.
 *
 * 18px is chosen to fit within a standard row height (~20px) while remaining
 * large enough to be a comfortable click target.
 */
const BUTTON_SIZE_PX = 18;

const buttonStyle: CSSProperties = {
  position: "absolute",
  right: 2,
  bottom: 2,
  width: BUTTON_SIZE_PX,
  height: BUTTON_SIZE_PX,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  borderRadius: radiusTokens.xs,
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  cursor: "pointer",
  padding: 0,
  lineHeight: 1,
  fontSize: 9,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  boxSizing: "border-box",
  pointerEvents: "auto",
};

const activeFilterStyle: CSSProperties = {
  color: `var(--accent, ${colorTokens.accent.primary})`,
};

/**
 * Dropdown arrow button for autoFilter header row cells.
 *
 * State indicators:
 * - Default: ▼ (down arrow)
 * - Active filter: ▼ with accent color
 * - Sort ascending: ▲
 * - Sort descending: ▼
 */
export function AutoFilterButton({ hasActiveFilter, sortDirection, onClick }: AutoFilterButtonProps) {
  const icon = sortDirection === "ascending" ? "▲" : "▼";

  return (
    <div
      role="button"
      data-testid="auto-filter-button"
      style={{ ...buttonStyle, ...(hasActiveFilter ? activeFilterStyle : {}) }}
      onPointerEnter={(e) => {
        e.currentTarget.style.backgroundColor = `var(--bg-secondary, ${colorTokens.background.secondary})`;
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.backgroundColor = `var(--bg-primary, ${colorTokens.background.primary})`;
      }}
      onPointerDown={(e: ReactPointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
        onClick(e.currentTarget);
      }}
    >
      {icon}
    </div>
  );
}
