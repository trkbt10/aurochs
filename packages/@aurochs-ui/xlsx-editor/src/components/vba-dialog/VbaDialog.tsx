/**
 * @file VBA Dialog Component
 *
 * Modal dialog for VBA code editing and execution.
 */

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import type { VbaProgramIr } from "@aurochs-office/vba";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { VbaEditor, SvgCodeRenderer } from "@aurochs-ui/vba-editor";
import { Button } from "@aurochs-ui/ui-components/primitives";
import { VbaExecutionPanel } from "./VbaExecutionPanel";

// =============================================================================
// Types
// =============================================================================

export type VbaDialogProps = {
  /** Whether the dialog is open */
  readonly open: boolean;
  /** Callback to close the dialog */
  readonly onClose: () => void;
  /** VBA program to edit */
  readonly program: VbaProgramIr | undefined;
  /** Callback when program changes */
  readonly onProgramChange?: (program: VbaProgramIr) => void;
  /** Current workbook */
  readonly workbook: XlsxWorkbook;
  /** Callback when workbook changes (after VBA execution) */
  readonly onWorkbookChange?: (workbook: XlsxWorkbook) => void;
};

// =============================================================================
// Styles
// =============================================================================

const overlayStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialogStyle: CSSProperties = {
  backgroundColor: "var(--background-primary, #fff)",
  borderRadius: "8px",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
  display: "flex",
  flexDirection: "column",
  width: "90vw",
  height: "85vh",
  maxWidth: "1400px",
  maxHeight: "900px",
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderBottom: "1px solid var(--border-subtle, #e0e0e0)",
};

const titleStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  margin: 0,
};

const contentStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  minHeight: 0,
};

const editorContainerStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
};

const emptyStateStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  color: "var(--text-secondary)",
};

// =============================================================================
// Component
// =============================================================================

/**
 * VBA Dialog component.
 */
export function VbaDialog({
  open,
  onClose,
  program,
  onProgramChange,
  workbook,
  onWorkbookChange,
}: VbaDialogProps): ReactNode {
  // Track edited program state internally for execution
  // This ensures we execute the current editor content, not stale prop
  const [editedProgram, setEditedProgram] = useState(program);

  // Sync with prop when it changes externally (e.g., new file loaded)
  useEffect(() => {
    setEditedProgram(program);
  }, [program]);

  // Handle program changes from editor
  const handleProgramChange = useCallback(
    (updated: VbaProgramIr) => {
      setEditedProgram(updated);
      onProgramChange?.(updated);
    },
    [onProgramChange]
  );

  // Handle close
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  // Handle escape key
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={titleStyle}>VBA Editor</h2>
          <Button onClick={handleClose}>Close</Button>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {/* VBA Editor */}
          <div style={editorContainerStyle}>
            {editedProgram ? (
              <VbaEditor
                program={editedProgram}
                onProgramChange={handleProgramChange}
                Renderer={SvgCodeRenderer}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div style={emptyStateStyle}>No VBA program loaded</div>
            )}
          </div>

          {/* Execution Panel - uses editedProgram to execute current editor content */}
          <VbaExecutionPanel
            program={editedProgram}
            workbook={workbook}
            onWorkbookChange={onWorkbookChange}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
