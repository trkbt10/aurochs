/**
 * @file Unknown shape type panel component
 *
 * Displays a fallback message for unrecognized shape types.
 */

import type { Shape } from "@oxen/pptx/domain/index";

// =============================================================================
// Types
// =============================================================================

export type UnknownShapePanelProps = {
  readonly shape: Shape;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Unknown shape type panel.
 *
 * Displays a message indicating the shape type is not recognized.
 */
export function UnknownShapePanel({ shape }: UnknownShapePanelProps) {
  return (
    <div
      style={{
        padding: "16px",
        color: "var(--editor-text-secondary, #888)",
        fontSize: "12px",
      }}
    >
      Unknown shape type: {shape.type}
    </div>
  );
}
