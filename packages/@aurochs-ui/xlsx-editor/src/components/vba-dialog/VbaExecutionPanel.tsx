/**
 * @file VBA Execution Panel Component
 *
 * Panel for VBA procedure selection, execution, and output display.
 */

import { useCallback, useState, useMemo, type ReactNode, type CSSProperties } from "react";
import type { VbaProgramIr } from "@aurochs-office/vba";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { Player, type PlayerState, type PlayerMedia, type PlayerError } from "@aurochs-ui/ui-components/player";
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
  gap: "12px",
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

  // Derive player state from execution state
  const playerState: PlayerState = useMemo(() => {
    if (isRunning) return "playing";
    if (lastResult && !lastResult.ok) return "error";
    if (lastResult?.ok) return "completed";
    return "idle";
  }, [isRunning, lastResult]);

  // Build media info
  const media: PlayerMedia = useMemo(() => {
    if (!selectedProcedure) {
      return { title: "No procedure selected" };
    }
    const [moduleName, procedureName] = selectedProcedure.split(".");
    return {
      title: procedureName || selectedProcedure,
      subtitle: moduleName,
    };
  }, [selectedProcedure]);

  // Build error info
  const error: PlayerError | undefined = useMemo(() => {
    if (lastResult && !lastResult.ok) {
      return {
        message: lastResult.message,
        detail: lastResult.stackTrace,
      };
    }
    return undefined;
  }, [lastResult]);

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

  // Handle stop (reset state)
  const handleStop = useCallback(() => {
    setIsRunning(false);
    setLastResult(undefined);
  }, []);

  const canPlay = !!program && !!selectedProcedure && !isRunning;

  return (
    <div style={panelStyle}>
      <div style={controlsStyle}>
        <VbaProcedurePicker
          program={program}
          value={selectedProcedure}
          onChange={setSelectedProcedure}
          disabled={isRunning}
        />
      </div>

      <Player
        state={playerState}
        media={media}
        error={error}
        variant="panel"
        onPlay={canPlay ? handleRun : undefined}
        // No onPause - VBA execution is not pausable
        onStop={isRunning ? handleStop : undefined}
      />

      <VbaOutputLog result={lastResult} />
    </div>
  );
}
