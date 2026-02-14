/**
 * @file VBA Procedure Dropdown Component
 *
 * Dropdown for selecting and jumping to procedures in the active module.
 */

import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { VbaProcedure } from "@aurochs-office/vba";
import { SearchableSelect, type SearchableSelectOption } from "@aurochs-ui/ui-components/primitives";
import { useVbaEditor } from "../../context/vba-editor";

export type VbaProcedureDropdownProps = {
  readonly style?: CSSProperties;
};

/**
 * Get procedure type label for display.
 */
function getProcedureTypeLabel(procedure: VbaProcedure): string {
  switch (procedure.type) {
    case "sub":
      return "Sub";
    case "function":
      return "Function";
    case "propertyGet":
      return "Property Get";
    case "propertyLet":
      return "Property Let";
    case "propertySet":
      return "Property Set";
    default:
      return "";
  }
}

/**
 * VBA Procedure Dropdown component.
 *
 * Shows all procedures in the active module with search.
 */
export function VbaProcedureDropdown({ style }: VbaProcedureDropdownProps): ReactNode {
  const { activeProcedures, state, dispatch } = useVbaEditor();

  // Build options from procedures
  const options = useMemo<readonly SearchableSelectOption<string>[]>(() => {
    if (activeProcedures.length === 0) {
      return [];
    }

    return activeProcedures.map((proc) => ({
      value: proc.name,
      label: `${proc.name} (${getProcedureTypeLabel(proc)})`,
      keywords: [proc.type],
    }));
  }, [activeProcedures]);

  const handleChange = (procedureName: string) => {
    dispatch({ type: "SELECT_PROCEDURE", procedureName });
  };

  const selectedValue = state.selectedProcedureName ?? "";

  if (options.length === 0) {
    return (
      <div
        style={{
          padding: "5px 8px",
          fontSize: "13px",
          color: "var(--color-text-tertiary, #999999)",
          ...style,
        }}
      >
        (No procedures)
      </div>
    );
  }

  return (
    <SearchableSelect
      value={selectedValue}
      onChange={handleChange}
      options={options}
      placeholder="(Declarations)"
      searchPlaceholder="Search procedures..."
      dropdownWidth={240}
      maxHeight={280}
      style={{ minWidth: 160, ...style }}
    />
  );
}
