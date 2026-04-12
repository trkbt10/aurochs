/**
 * @file VBA Properties Panel Component
 *
 * Sidebar showing module and procedure properties.
 * Uses shared layout components from @aurochs-ui/ui-components.
 */

import type { CSSProperties, ReactNode } from "react";
import type { VbaModuleType, VbaTypeName } from "@aurochs-office/vba";
import {
  Panel,
  Section,
  FieldGroup,
  colorTokens,
  fontTokens,
  spacingTokens,
} from "@aurochs-ui/ui-components";
import { useVbaEditor } from "../../context/vba-editor";

export type VbaPropertiesPanelProps = {
  readonly style?: CSSProperties;
};

const MODULE_TYPE_LABELS: Record<VbaModuleType, string> = {
  standard: "Standard Module",
  class: "Class Module",
  form: "UserForm",
  document: "Document Module",
};

/**
 * Format return type for display.
 */
function formatReturnType(returnType: VbaTypeName): string {
  if (typeof returnType === "string") {
    return returnType;
  }
  return returnType.userDefined;
}

// =============================================================================
// Styles
// =============================================================================

const propertyValueStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.medium,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  textAlign: "right",
  maxWidth: "60%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const emptyMessageStyle: CSSProperties = {
  padding: spacingTokens.lg,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  fontStyle: "italic",
  fontSize: fontTokens.size.sm,
  textAlign: "center",
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * A single property row with label and value, using FieldGroup inline layout.
 */
function PropertyField({ label, value }: { label: string; value: ReactNode }): ReactNode {
  return (
    <FieldGroup label={label} inline labelWidth={80}>
      <span style={propertyValueStyle}>{value}</span>
    </FieldGroup>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * VBA Properties Panel component.
 *
 * Displays:
 * - Module name and type
 * - Procedure count
 * - Selected procedure details
 */
export function VbaPropertiesPanel({ style }: VbaPropertiesPanelProps): ReactNode {
  const { activeModule, activeProcedures, state } = useVbaEditor();

  if (!activeModule) {
    return (
      <Panel style={{ ...style, height: "100%" }} width="100%">
        <div style={emptyMessageStyle}>No module selected</div>
      </Panel>
    );
  }

  const selectedProcedure = activeProcedures.find(
    (p) => p.name === state.selectedProcedureName
  );

  return (
    <Panel style={{ ...style, height: "100%" }} width="100%">
      {/* Module Info */}
      <Section title="Module" gap={4} style={{ borderRadius: 0 }}>
        <PropertyField label="Name" value={activeModule.name} />
        <PropertyField label="Type" value={MODULE_TYPE_LABELS[activeModule.type]} />
        <PropertyField label="Procedures" value={activeProcedures.length} />
      </Section>

      {/* Selected Procedure Info */}
      {selectedProcedure && (
        <Section title="Procedure" gap={4} style={{ borderRadius: 0 }}>
          <PropertyField label="Name" value={selectedProcedure.name} />
          <PropertyField label="Type" value={selectedProcedure.type} />
          <PropertyField label="Visibility" value={selectedProcedure.visibility} />
          <PropertyField label="Parameters" value={selectedProcedure.parameters.length} />
          {selectedProcedure.returnType && (
            <PropertyField
              label="Returns"
              value={formatReturnType(selectedProcedure.returnType)}
            />
          )}
        </Section>
      )}
    </Panel>
  );
}
