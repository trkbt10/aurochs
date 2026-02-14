/**
 * @file VBA Module List Component
 *
 * Sidebar showing all modules grouped by type.
 */

import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { VbaModule, VbaModuleType } from "@aurochs-office/vba";
import { useVbaEditor } from "../../context/vba-editor";
import styles from "./VbaModuleList.module.css";

export type VbaModuleListProps = {
  readonly style?: CSSProperties;
};

type ModuleGroup = {
  readonly type: VbaModuleType;
  readonly label: string;
  readonly modules: readonly VbaModule[];
};

const MODULE_TYPE_LABELS: Record<VbaModuleType, string> = {
  standard: "Modules",
  class: "Class Modules",
  form: "UserForms",
  document: "Document",
};

const MODULE_TYPE_ORDER: readonly VbaModuleType[] = [
  "document",
  "form",
  "standard",
  "class",
];

/**
 * Get icon for module type.
 */
function getModuleIcon(type: VbaModuleType): ReactNode {
  // Simple text-based icons for now
  const iconMap: Record<VbaModuleType, string> = {
    standard: "M",
    class: "C",
    form: "F",
    document: "D",
  };

  return (
    <span className={styles.moduleIcon} title={MODULE_TYPE_LABELS[type]}>
      [{iconMap[type]}]
    </span>
  );
}

/**
 * VBA Module List component.
 *
 * Displays all modules grouped by type:
 * - Document (ThisWorkbook, Sheet1, etc.)
 * - UserForms
 * - Modules (standard modules)
 * - Class Modules
 */
export function VbaModuleList({ style }: VbaModuleListProps): ReactNode {
  const { modules, state, dispatch } = useVbaEditor();

  // Group modules by type
  const groups = useMemo<readonly ModuleGroup[]>(() => {
    const byType = new Map<VbaModuleType, VbaModule[]>();

    for (const mod of modules) {
      const list = byType.get(mod.type) ?? [];
      list.push(mod);
      byType.set(mod.type, list);
    }

    return MODULE_TYPE_ORDER.filter((type) => byType.has(type)).map((type) => ({
      type,
      label: MODULE_TYPE_LABELS[type],
      modules: byType.get(type) ?? [],
    }));
  }, [modules]);

  const handleModuleClick = (moduleName: string) => {
    dispatch({ type: "SELECT_MODULE", moduleName });
  };

  if (modules.length === 0) {
    return (
      <div className={styles.container} style={style}>
        <div className={styles.emptyMessage}>No modules</div>
      </div>
    );
  }

  return (
    <div className={styles.container} style={style}>
      <div className={styles.moduleList}>
        {groups.map((group) => (
          <div key={group.type}>
            <div className={styles.groupHeader}>{group.label}</div>
            {group.modules.map((mod) => (
              <div
                key={mod.name}
                className={`${styles.moduleItem} ${
                  mod.name === state.activeModuleName ? styles.moduleItemActive : ""
                }`}
                onClick={() => handleModuleClick(mod.name)}
              >
                {getModuleIcon(mod.type)}
                <span className={styles.moduleName}>{mod.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
