/**
 * @file Editor mode pivot
 *
 * Tab-based mode switch between Slide editing and Theme editing.
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import { Tabs, type TabItem } from "@aurochs-ui/ui-components/primitives/Tabs";

// =============================================================================
// Types
// =============================================================================

export type EditorMode = "slide" | "theme";

export type EditorModePivotProps = {
  readonly mode: EditorMode;
  readonly onModeChange: (mode: EditorMode) => void;
  readonly style?: CSSProperties;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Pivot tabs for switching between Slide and Theme editor modes.
 */
export function EditorModePivot({ mode, onModeChange, style }: EditorModePivotProps) {
  const handleChange = useCallback(
    (value: EditorMode) => {
      onModeChange(value);
    },
    [onModeChange],
  );

  const tabItems = useMemo<TabItem<EditorMode>[]>(
    () => [
      { id: "slide", label: "スライド", content: null },
      { id: "theme", label: "テーマ", content: null },
    ],
    [],
  );

  return (
    <div style={style}>
      <Tabs items={tabItems} value={mode} onChange={handleChange} size="sm" />
    </div>
  );
}
