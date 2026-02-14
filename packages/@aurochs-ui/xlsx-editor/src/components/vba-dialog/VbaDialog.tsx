/**
 * @file VBA Dialog Component
 *
 * Modal dialog for VBA code editing and execution.
 * Execution controls are integrated into the editor toolbar.
 */

import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import type { VbaProgramIr } from "@aurochs-office/vba";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { VbaEditor, SvgCodeRenderer, type RunStatus } from "@aurochs-ui/vba-editor";
import { Button } from "@aurochs-ui/ui-components/primitives";
import { executeVbaProcedure, applyMutations } from "../../vba";

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
  const [runStatus, setRunStatus] = useState<RunStatus | undefined>();

  // Track edited program for execution
  const [editedProgram, setEditedProgram] = useState(program);
  const editedProgramRef = useRef(editedProgram);

  // Sync with prop when it changes externally
  useEffect(() => {
    setEditedProgram(program);
    editedProgramRef.current = program;
  }, [program]);

  const handleProgramChange = useCallback(
    (updated: VbaProgramIr) => {
      setEditedProgram(updated);
      editedProgramRef.current = updated;
      onProgramChange?.(updated);
    },
    [onProgramChange]
  );

  // Handle run - receives procedure name from toolbar
  const handleRun = useCallback(
    (procedureName: string) => {
      const currentProgram = editedProgramRef.current;

      if (!currentProgram) {
        return;
      }

      const [moduleName, procName] = procedureName.split(".");
      if (!moduleName || !procName) {
        return;
      }

      setRunStatus({ state: "running", message: "Running..." });

      // Run synchronously (VBA execution is synchronous)
      try {
        const result = executeVbaProcedure({
          workbook,
          program: currentProgram,
          moduleName,
          procedureName: procName,
        });

        if (result.ok) {
          const time = result.durationMs.toFixed(1);
          const changes = result.mutations.length;
          const message =
            changes > 0
              ? `${time}ms · ${changes} change${changes !== 1 ? "s" : ""}`
              : `${time}ms`;
          setRunStatus({ state: "success", message });

          // Apply mutations
          if (changes > 0 && onWorkbookChange) {
            const updatedWorkbook = applyMutations(workbook, result.mutations);
            onWorkbookChange(updatedWorkbook);
          }
        } else {
          setRunStatus({ state: "error", message: `Error: ${result.message}` });
        }
      } catch (err) {
        setRunStatus({
          state: "error",
          message: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      }
    },
    [workbook, onWorkbookChange]
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
        {editedProgram ? (
          <div style={editorContainerStyle}>
            <VbaEditor
              program={editedProgram}
              onProgramChange={handleProgramChange}
              Renderer={SvgCodeRenderer}
              style={{ width: "100%", height: "100%" }}
              onRun={handleRun}
              runStatus={runStatus}
            />
          </div>
        ) : (
          <div style={emptyStateStyle}>No VBA program loaded</div>
        )}
      </div>
    </div>,
    document.body
  );
}
