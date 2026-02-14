/**
 * @file VBA Execution Panel Component
 *
 * Panel for VBA procedure selection, execution, and output display.
 */

import { useCallback, useState, type ReactNode, type CSSProperties } from "react";
import type { VbaProgramIr } from "@aurochs-office/vba";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { Button } from "@aurochs-ui/ui-components/primitives";
import { executeVbaProcedure, applyMutations, type ExecutionResult } from "../../vba";
import { VbaProcedurePicker } from "./VbaProcedurePicker";
import { VbaOutputLog } from "./VbaOutputLog";

// =============================================================================
// Types
// =============================================================================

export type VbaExecutionPanelProps = {
  /** VBA program */
  readonly program: VbaProgramIr | undefined;
  /** Current workbook */
  readonly workbook: XlsxWorkbook;
  /** Callback when workbook changes (after VBA execution) */
  readonly onWorkbookChange?: (workbook: XlsxWorkbook) => void;
};

// =============================================================================
// Styles
// =============================================================================

const panelStyle: CSSProperties = {
  borderTop: "1px solid var(--border-subtle, #e0e0e0)",
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const controlsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

// =============================================================================
// Component
// =============================================================================

/**
 * VBA execution panel component.
 */
export function VbaExecutionPanel({
  program,
  workbook,
  onWorkbookChange,
}: VbaExecutionPanelProps): ReactNode {
  const [selectedProcedure, setSelectedProcedure] = useState<string | undefined>();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<ExecutionResult | undefined>();

  // Handle run
  const handleRun = useCallback(() => {
    if (!program || !selectedProcedure) {
      return;
    }

    const [moduleName, procedureName] = selectedProcedure.split(".");
    if (!moduleName || !procedureName) {
      return;
    }

    setIsRunning(true);

    // Run synchronously (VBA execution is synchronous)
    try {
      const result = executeVbaProcedure({
        workbook,
        program,
        moduleName,
        procedureName,
      });

      setLastResult(result);

      // Apply mutations if successful
      if (result.ok && result.mutations.length > 0 && onWorkbookChange) {
        const updatedWorkbook = applyMutations(workbook, result.mutations);
        onWorkbookChange(updatedWorkbook);
      }
    } finally {
      setIsRunning(false);
    }
  }, [program, selectedProcedure, workbook, onWorkbookChange]);

  return (
    <div style={panelStyle}>
      <div style={controlsStyle}>
        <VbaProcedurePicker
          program={program}
          value={selectedProcedure}
          onChange={setSelectedProcedure}
          disabled={isRunning}
        />
        <Button
          onClick={handleRun}
          disabled={!program || !selectedProcedure || isRunning}
        >
          {isRunning ? "Running..." : "Run"}
        </Button>
      </div>

      <VbaOutputLog result={lastResult} />
    </div>
  );
}
