/**
 * @file Fig editor toolbar
 *
 * Top toolbar with creation tools, undo/redo, and zoom controls.
 */

import { useCallback } from "react";
import { useFigEditor } from "../context/FigEditorContext";
import type { FigCreationMode } from "../context/fig-editor/types";

type ToolDef = {
  readonly mode: FigCreationMode;
  readonly label: string;
  readonly shortcut: string;
};

const TOOLS: readonly ToolDef[] = [
  { mode: { type: "select" }, label: "Select", shortcut: "V" },
  { mode: { type: "frame" }, label: "Frame", shortcut: "F" },
  { mode: { type: "rectangle" }, label: "Rectangle", shortcut: "R" },
  { mode: { type: "ellipse" }, label: "Ellipse", shortcut: "O" },
  { mode: { type: "line" }, label: "Line", shortcut: "L" },
  { mode: { type: "text" }, label: "Text", shortcut: "T" },
];

/**
 * Fig editor toolbar component.
 */
export function FigEditorToolbar() {
  const { dispatch, canUndo, canRedo, creationMode } = useFigEditor();

  const handleToolClick = useCallback(
    (mode: FigCreationMode) => {
      dispatch({ type: "SET_CREATION_MODE", mode });
    },
    [dispatch],
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        borderBottom: "1px solid #eee",
        backgroundColor: "#fafafa",
      }}
    >
      {/* Tools */}
      {TOOLS.map((tool) => (
        <button
          key={tool.mode.type}
          onClick={() => handleToolClick(tool.mode)}
          title={`${tool.label} (${tool.shortcut})`}
          style={{
            padding: "4px 8px",
            fontSize: 12,
            border: "1px solid",
            borderColor: creationMode.type === tool.mode.type ? "#4444ff" : "#ddd",
            borderRadius: 4,
            backgroundColor: creationMode.type === tool.mode.type ? "#eeeeff" : "white",
            cursor: "pointer",
          }}
        >
          {tool.label}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Undo/Redo */}
      <button
        onClick={() => dispatch({ type: "UNDO" })}
        disabled={!canUndo}
        style={{
          padding: "4px 8px",
          fontSize: 12,
          border: "1px solid #ddd",
          borderRadius: 4,
          cursor: canUndo ? "pointer" : "default",
          opacity: canUndo ? 1 : 0.3,
          backgroundColor: "white",
        }}
      >
        Undo
      </button>
      <button
        onClick={() => dispatch({ type: "REDO" })}
        disabled={!canRedo}
        style={{
          padding: "4px 8px",
          fontSize: 12,
          border: "1px solid #ddd",
          borderRadius: 4,
          cursor: canRedo ? "pointer" : "default",
          opacity: canRedo ? 1 : 0.3,
          backgroundColor: "white",
        }}
      >
        Redo
      </button>
    </div>
  );
}
