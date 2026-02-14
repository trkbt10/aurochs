/**
 * @file VBA Properties Panel Component
 *
 * Sidebar showing module and procedure properties.
 */

import type { CSSProperties, ReactNode } from "react";
import type { VbaModuleType, VbaTypeName } from "@aurochs-office/vba";
import { useVbaEditor } from "../../context/vba-editor";
import styles from "./VbaPropertiesPanel.module.css";

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
      <div className={styles.container} style={style}>
        <div className={styles.emptyMessage}>No module selected</div>
      </div>
    );
  }

  const selectedProcedure = activeProcedures.find(
    (p) => p.name === state.selectedProcedureName
  );

  return (
    <div className={styles.container} style={style}>
      {/* Module Info */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Module</div>
        <div className={styles.property}>
          <span className={styles.propertyLabel}>Name</span>
          <span className={styles.propertyValue}>{activeModule.name}</span>
        </div>
        <div className={styles.property}>
          <span className={styles.propertyLabel}>Type</span>
          <span className={styles.propertyValue}>
            {MODULE_TYPE_LABELS[activeModule.type]}
          </span>
        </div>
        <div className={styles.property}>
          <span className={styles.propertyLabel}>Procedures</span>
          <span className={styles.propertyValue}>{activeProcedures.length}</span>
        </div>
      </div>

      {/* Selected Procedure Info */}
      {selectedProcedure && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Procedure</div>
          <div className={styles.property}>
            <span className={styles.propertyLabel}>Name</span>
            <span className={styles.propertyValue}>{selectedProcedure.name}</span>
          </div>
          <div className={styles.property}>
            <span className={styles.propertyLabel}>Type</span>
            <span className={styles.propertyValue}>{selectedProcedure.type}</span>
          </div>
          <div className={styles.property}>
            <span className={styles.propertyLabel}>Visibility</span>
            <span className={styles.propertyValue}>{selectedProcedure.visibility}</span>
          </div>
          <div className={styles.property}>
            <span className={styles.propertyLabel}>Parameters</span>
            <span className={styles.propertyValue}>
              {selectedProcedure.parameters.length}
            </span>
          </div>
          {selectedProcedure.returnType && (
            <div className={styles.property}>
              <span className={styles.propertyLabel}>Returns</span>
              <span className={styles.propertyValue}>
                {formatReturnType(selectedProcedure.returnType)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
