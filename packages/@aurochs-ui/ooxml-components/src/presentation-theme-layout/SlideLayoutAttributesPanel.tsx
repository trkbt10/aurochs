/**
 * @file SlideLayoutAttributesPanel — shared shell for p:sldLayout attribute editing
 *
 * Wraps `SlideLayoutEditor` and centralizes the empty state when `value` is undefined.
 * Consumed by PPTX `SlidePropertiesPanel` and the POTX layout tab (single source of truth).
 */

import type { CSSProperties } from "react";
import type { SlideLayoutAttributes } from "@aurochs-office/pptx/parser/slide/layout-parser";
import { SlideLayoutEditor, type SlideLayoutEditorProps } from "./SlideLayoutEditor";

// =============================================================================
// Types
// =============================================================================

export type SlideLayoutAttributesPanelProps = Omit<SlideLayoutEditorProps, "value"> & {
  readonly value: SlideLayoutAttributes | undefined;
  /** Shown when `value` is undefined */
  readonly emptyMessage?: string;
};

// =============================================================================
// Styles
// =============================================================================

const noLayoutStyle: CSSProperties = {
  padding: "12px",
  textAlign: "center",
  color: "var(--text-tertiary, #737373)",
  fontSize: "12px",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Renders `SlideLayoutEditor` when layout attributes exist; otherwise a short empty state.
 */
export function SlideLayoutAttributesPanel({
  value,
  emptyMessage = "No layout data available",
  ...slideLayoutEditorProps
}: SlideLayoutAttributesPanelProps) {
  if (value === undefined) {
    return <div style={noLayoutStyle}>{emptyMessage}</div>;
  }
  return <SlideLayoutEditor value={value} {...slideLayoutEditorProps} />;
}
