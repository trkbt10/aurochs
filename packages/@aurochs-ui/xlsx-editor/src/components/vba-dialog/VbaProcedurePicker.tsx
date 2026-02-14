/**
 * @file VBA Procedure Picker Component
 *
 * Dropdown for selecting runnable VBA procedures.
 */

import { useEffect, type ReactNode, type CSSProperties } from "react";
import type { VbaProgramIr, VbaModule, VbaProcedure } from "@aurochs-office/vba";
import { Select } from "@aurochs-ui/ui-components/primitives";

// =============================================================================
// Types
// =============================================================================

export type VbaProcedurePickerProps = {
  /** VBA program */
  readonly program: VbaProgramIr | undefined;
  /** Selected procedure (format: "ModuleName.ProcedureName") */
  readonly value: string | undefined;
  /** Callback when selection changes */
  readonly onChange: (value: string | undefined) => void;
  /** Whether the picker is disabled */
  readonly disabled?: boolean;
};

/**
 * Runnable procedure info.
 */
type RunnableProcedure = {
  readonly module: VbaModule;
  readonly procedure: VbaProcedure;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const labelStyle: CSSProperties = {
  fontWeight: 500,
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get all runnable procedures (public subs) from a VBA program.
 */
function getRunnableProcedures(program: VbaProgramIr): RunnableProcedure[] {
  const result: RunnableProcedure[] = [];

  for (const module of program.modules) {
    for (const procedure of module.procedures) {
      // Only include public subs as runnable macros
      if (procedure.visibility === "public" && procedure.type === "sub") {
        result.push({ module, procedure });
      }
    }
  }

  return result;
}

// =============================================================================
// Component
// =============================================================================

/**
 * VBA procedure picker component.
 */
export function VbaProcedurePicker({
  program,
  value,
  onChange,
  disabled,
}: VbaProcedurePickerProps): ReactNode {
  // Get runnable procedures
  const runnableProcedures = program ? getRunnableProcedures(program) : [];

  // Auto-select first procedure if none selected
  useEffect(() => {
    if (!value && runnableProcedures.length > 0) {
      const first = runnableProcedures[0];
      onChange(`${first.module.name}.${first.procedure.name}`);
    }
  }, [value, runnableProcedures, onChange]);

  // Build options
  const options = runnableProcedures.map((p) => ({
    value: `${p.module.name}.${p.procedure.name}`,
    label: `${p.module.name}.${p.procedure.name}`,
  }));

  return (
    <div style={containerStyle}>
      <span style={labelStyle}>Run Macro:</span>
      <Select
        value={value ?? ""}
        onChange={onChange}
        options={options}
        placeholder="Select a procedure..."
        disabled={disabled || !program || runnableProcedures.length === 0}
        style={{ width: 250 }}
      />
    </div>
  );
}
