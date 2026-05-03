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
  PenIcon,
  StarIcon,
  DiamondIcon,
  DownloadIcon,
  UndoIcon,
  RedoIcon,
} from "@aurochs-ui/ui-components/icons";
import { colorTokens, iconTokens } from "@aurochs-ui/ui-components/design-tokens";
import { useFigEditor } from "../context/FigEditorContext";
import type { FigCreationMode } from "../context/fig-editor/types";
import { useExportFig } from "../hooks/use-export-fig";
import { downloadFigExport, resolveFigExportFilename } from "../hooks/fig-export-download";
import { allowsFigUserOperation } from "../context/fig-editor/user-operation";
import { useFigOperationDomain } from "../context/use-fig-operation-domain";

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
  { mode: { type: "pen" }, label: "Vector Edit", shortcut: "P", icon: <PenIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} /> },
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
  const { dispatch, canUndo, canRedo, creationMode, document: figDocument } = useFigEditor();
  const { exportDocument, isExporting, lastResult, error } = useExportFig();
  const operationDomain = useFigOperationDomain();

  const handleToolClick = useCallback(
    (mode: FigCreationMode) => {
      if (!allowsFigUserOperation(operationDomain, "set-tool")) {
        return;
      }
      dispatch({ type: "SET_CREATION_MODE", mode });
    },
    [dispatch, operationDomain],
  );

  const handleExportClick = useCallback(() => {
    void exportDocument().then((result) => {
      downloadFigExport(result, resolveFigExportFilename(figDocument.metadata), { document, url: URL });
    });
  }, [exportDocument, figDocument.metadata]);

  const exportStatus = error?.message ?? formatExportStatus(lastResult?.size);

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
          disabled={!allowsFigUserOperation(operationDomain, "set-tool")}
          size="sm"
        />
      ))}

      <ToolbarSeparator />

      {/* Undo/Redo */}
      <ToolbarButton
        icon={<UndoIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
        label="Undo"
        onClick={() => {
          if (allowsFigUserOperation(operationDomain, "undo")) {
            dispatch({ type: "UNDO" });
          }
        }}
        disabled={!canUndo || !allowsFigUserOperation(operationDomain, "undo")}
        size="sm"
      />
      <ToolbarButton
        icon={<RedoIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
        label="Redo"
        onClick={() => {
          if (allowsFigUserOperation(operationDomain, "redo")) {
            dispatch({ type: "REDO" });
          }
        }}
        disabled={!canRedo || !allowsFigUserOperation(operationDomain, "redo")}
        size="sm"
      />

      <ToolbarSeparator />

      <ToolbarButton
        icon={<DownloadIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
        label="Export .fig"
        onClick={handleExportClick}
        disabled={isExporting}
        size="sm"
      />
      {exportStatus && (
        <span
          aria-live="polite"
          style={{
            color: getExportStatusColor(Boolean(error)),
            fontSize: 11,
            marginLeft: 4,
            maxWidth: 180,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {exportStatus}
        </span>
      )}
    </div>
  );
}

function formatExportStatus(size: number | undefined): string | undefined {
  if (size === undefined) {
    return undefined;
  }
  return `Exported ${size.toLocaleString()} bytes`;
}

function getExportStatusColor(hasError: boolean): string {
  if (hasError) {
    return colorTokens.accent.danger;
  }
  return colorTokens.text.secondary;
}
