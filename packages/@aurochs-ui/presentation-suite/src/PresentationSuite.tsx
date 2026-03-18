/**
 * @file PresentationSuite
 *
 * Integrates PptxEditor (slide editing) and PotxEditor (theme editing)
 * with a mode pivot for switching between them.
 */

import { useState, useCallback, type ReactNode, type CSSProperties } from "react";
import { EditorModePivot, type EditorMode } from "./EditorModePivot";

// =============================================================================
// Types
// =============================================================================

export type PresentationSuiteProps = {
  /** Content for slide editing mode (typically PptxEditor) */
  readonly slideEditor: ReactNode;
  /** Content for theme editing mode (typically PotxEditor wrapped in ThemeEditorProvider) */
  readonly themeEditor: ReactNode;
  /** Initial mode (default: "slide") */
  readonly initialMode?: EditorMode;
  /** External mode control (optional) */
  readonly mode?: EditorMode;
  /** Callback when mode changes */
  readonly onModeChange?: (mode: EditorMode) => void;
  /** Additional CSS class */
  readonly className?: string;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  overflow: "hidden",
};

const pivotContainerStyle: CSSProperties = {
  flexShrink: 0,
  borderBottom: "1px solid var(--border-subtle, #e0e0e0)",
  padding: "0 8px",
};

const editorContainerStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
};

// =============================================================================
// Component
// =============================================================================

/**
 * PresentationSuite - combines slide and theme editors with mode switching.
 *
 * Renders a pivot tab at the top to switch between "slide" and "theme" modes.
 * Each mode renders its respective editor component.
 *
 * Can be controlled (mode + onModeChange) or uncontrolled (initialMode).
 */
export function PresentationSuite({
  slideEditor,
  themeEditor,
  initialMode = "slide",
  mode: controlledMode,
  onModeChange: onModeChangeExternal,
  className,
}: PresentationSuiteProps) {
  const [internalMode, setInternalMode] = useState<EditorMode>(initialMode);

  const mode = controlledMode ?? internalMode;

  const handleModeChange = useCallback(
    (newMode: EditorMode) => {
      if (controlledMode === undefined) {
        setInternalMode(newMode);
      }
      onModeChangeExternal?.(newMode);
    },
    [controlledMode, onModeChangeExternal],
  );

  return (
    <div className={className} style={containerStyle}>
      <div style={pivotContainerStyle}>
        <EditorModePivot mode={mode} onModeChange={handleModeChange} />
      </div>
      <div style={editorContainerStyle}>
        {mode === "slide" ? slideEditor : themeEditor}
      </div>
    </div>
  );
}
