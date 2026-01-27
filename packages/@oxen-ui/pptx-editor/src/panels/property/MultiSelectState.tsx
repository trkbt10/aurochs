/**
 * @file Multi-selection state display component
 *
 * Displays a message when multiple shapes are selected.
 */

// =============================================================================
// Types
// =============================================================================

export type MultiSelectStateProps = {
  readonly count: number;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Multiple selection state display.
 *
 * Shows the number of selected shapes and a hint to select a single shape
 * to edit properties.
 */
export function MultiSelectState({ count }: MultiSelectStateProps) {
  return (
    <div
      style={{
        padding: "24px 16px",
        textAlign: "center",
        color: "var(--editor-text-secondary, #888)",
        fontSize: "13px",
      }}
    >
      {count} shapes selected
      <br />
      <span style={{ fontSize: "12px" }}>
        Select a single shape to edit properties
      </span>
    </div>
  );
}
