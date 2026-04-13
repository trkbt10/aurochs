/**
 * @file Fig editor toolbar
 *
 * Top toolbar with creation tools, undo/redo, and zoom controls.
 * Uses ToolbarButton from ui-components and shared icons.
 */

import { useCallback, type ReactNode } from "react";
import { ToolbarButton } from "@aurochs-ui/ui-components/primitives/ToolbarButton";
import { ToolbarSeparator } from "@aurochs-ui/ui-components/primitives/ToolbarSeparator";
import {
  SelectIcon,
  FrameIcon,
  RectIcon,
  EllipseIcon,
  LineIcon,
  TextBoxIcon,
  StarIcon,
  DiamondIcon,
  UndoIcon,
  RedoIcon,
} from "@aurochs-ui/ui-components/icons";
import { iconTokens } from "@aurochs-ui/ui-components/design-tokens";
import { useFigEditor } from "../context/FigEditorContext";
import type { FigCreationMode } from "../context/fig-editor/types";

// =============================================================================
// Tool definitions
// =============================================================================

type ToolDef = {
  readonly mode: FigCreationMode;
  readonly label: string;
  readonly shortcut: string;
  readonly icon: ReactNode;
};

const ICON_SIZE = iconTokens.size.sm;
const ICON_STROKE = iconTokens.strokeWidth;

const TOOLS: readonly ToolDef[] = [
  { mode: { type: "select" }, label: "Select", shortcut: "V", icon: <SelectIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} /> },
  { mode: { type: "frame" }, label: "Frame", shortcut: "F", icon: <FrameIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} /> },
  { mode: { type: "rectangle" }, label: "Rectangle", shortcut: "R", icon: <RectIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} /> },
  { mode: { type: "ellipse" }, label: "Ellipse", shortcut: "O", icon: <EllipseIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} /> },
  { mode: { type: "line" }, label: "Line", shortcut: "L", icon: <LineIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} /> },
  { mode: { type: "star" }, label: "Star", shortcut: "", icon: <StarIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} /> },
  { mode: { type: "polygon" }, label: "Polygon", shortcut: "", icon: <DiamondIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} /> },
  { mode: { type: "text" }, label: "Text", shortcut: "T", icon: <TextBoxIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} /> },
];

// =============================================================================
// Component
// =============================================================================

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
    <div style={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
      {/* Creation tools */}
      {TOOLS.map((tool) => (
        <ToolbarButton
          key={tool.mode.type}
          icon={tool.icon}
          label={`${tool.label} (${tool.shortcut})`}
          active={creationMode.type === tool.mode.type}
          onClick={() => handleToolClick(tool.mode)}
          size="sm"
        />
      ))}

      <ToolbarSeparator />

      {/* Undo/Redo */}
      <ToolbarButton
        icon={<UndoIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
        label="Undo"
        onClick={() => dispatch({ type: "UNDO" })}
        disabled={!canUndo}
        size="sm"
      />
      <ToolbarButton
        icon={<RedoIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
        label="Redo"
        onClick={() => dispatch({ type: "REDO" })}
        disabled={!canRedo}
        size="sm"
      />
    </div>
  );
}
