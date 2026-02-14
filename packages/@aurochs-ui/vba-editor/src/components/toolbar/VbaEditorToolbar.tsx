/**
 * @file VBA Editor Toolbar Component
 *
 * Toolbar with undo/redo and procedure dropdown.
 */

import type { CSSProperties, ReactNode } from "react";
import { IconButton } from "@aurochs-ui/ui-components/primitives";
import { useVbaEditor } from "../../context/vba-editor";
import { VbaProcedureDropdown } from "../procedure-dropdown";
import styles from "./VbaEditorToolbar.module.css";

export type VbaEditorToolbarProps = {
  readonly style?: CSSProperties;
};

/**
 * Simple undo icon.
 */
function UndoIcon(): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8h8a3 3 0 1 1 0 6H8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 5L3 8l2 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Simple redo icon.
 */
function RedoIcon(): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M13 8H5a3 3 0 1 0 0 6h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 5l2 3-2 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * VBA Editor Toolbar component.
 *
 * Displays:
 * - Undo/Redo buttons
 * - Active module name
 * - Procedure dropdown
 */
export function VbaEditorToolbar({ style }: VbaEditorToolbarProps): ReactNode {
  const { dispatch, canUndo, canRedo, activeModule } = useVbaEditor();

  const handleUndo = () => {
    dispatch({ type: "UNDO" });
  };

  const handleRedo = () => {
    dispatch({ type: "REDO" });
  };

  return (
    <div className={styles.container} style={style}>
      <IconButton
        icon={<UndoIcon />}
        onClick={handleUndo}
        disabled={!canUndo}
        variant="ghost"
        size="sm"
      />
      <IconButton
        icon={<RedoIcon />}
        onClick={handleRedo}
        disabled={!canRedo}
        variant="ghost"
        size="sm"
      />

      <div className={styles.separator} />

      {activeModule && (
        <span className={styles.moduleName}>{activeModule.name}</span>
      )}

      <div className={styles.spacer} />

      <VbaProcedureDropdown />
    </div>
  );
}
