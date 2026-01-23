/**
 * @file XlsxSheetTabBar
 *
 * Sheet tab bar component with:
 * - Drag-and-drop reordering
 * - Tab close buttons (hover)
 * - Add sheet button
 * - Keyboard shortcuts (Cmd+1-9)
 * - Context menu (right-click)
 * - Double-click to rename
 */

import { useCallback, useState, type CSSProperties } from "react";
import { colorTokens, radiusTokens, spacingTokens } from "../../../office-editor-components";
import { useXlsxWorkbookEditor } from "../../context/workbook/XlsxWorkbookEditorContext";
import { getUsedRange } from "../../cell/query";
import { generateUniqueName } from "../../sheet/mutation";
import { XlsxSheetTab } from "./XlsxSheetTab";
import {
  XlsxSheetTabContextMenu,
  type XlsxSheetTabContextMenuAction,
} from "./XlsxSheetTabContextMenu";
import { useSheetTabDragDrop } from "./useSheetTabDragDrop";
import { useSheetTabKeyboard } from "./useSheetTabKeyboard";
import { type SheetTabContextMenuState, createClosedContextMenuState } from "./types";

export type XlsxSheetTabBarProps = {
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  borderBottom: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
};

const tabScrollAreaStyle: CSSProperties = {
  display: "flex",
  flex: 1,
  minWidth: 0,
  overflowX: "auto",
  overflowY: "hidden",
  scrollbarWidth: "thin",
};

const tabListStyle: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  width: "100%",
  minWidth: "max-content",
};

const addButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
  borderRadius: `${radiusTokens.sm} ${radiusTokens.sm} 0 0`,
  border: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  borderBottom: "none",
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  cursor: "pointer",
  fontSize: "14px",
  lineHeight: 1,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  transition: "background-color 0.15s ease",
  flexShrink: 0,
  marginLeft: spacingTokens.xs,
  boxSizing: "border-box",
};

/**
 * Sheet tab bar with drag-drop, keyboard shortcuts, and context menu
 */
export function XlsxSheetTabBar({ style }: XlsxSheetTabBarProps) {
  const { workbook, activeSheetIndex, dispatch } = useXlsxWorkbookEditor();
  const [editingIndex, setEditingIndex] = useState<number | undefined>(undefined);
  const [contextMenuState, setContextMenuState] = useState<SheetTabContextMenuState>(
    createClosedContextMenuState(),
  );

  const handleMoveSheet = useCallback(
    (fromIndex: number, toIndex: number) => {
      dispatch({ type: "MOVE_SHEET", fromIndex, toIndex });
    },
    [dispatch],
  );

  const {
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    isDragging,
    isDropTarget,
  } = useSheetTabDragDrop({
    sheetCount: workbook.sheets.length,
    onMoveSheet: handleMoveSheet,
  });

  const handleSelectSheet = useCallback(
    (index: number) => {
      dispatch({ type: "SELECT_SHEET", sheetIndex: index });
    },
    [dispatch],
  );

  useSheetTabKeyboard({
    sheetCount: workbook.sheets.length,
    activeSheetIndex,
    onSelectSheet: handleSelectSheet,
  });

  const handleAddSheet = useCallback(() => {
    const name = generateUniqueName(workbook, "Sheet");
    dispatch({ type: "ADD_SHEET", name });
    // After adding, the new sheet becomes active, so set it for editing
    setEditingIndex(workbook.sheets.length);
  }, [dispatch, workbook]);

  const handleCloseSheet = useCallback(
    (sheetIndex: number) => {
      const sheet = workbook.sheets[sheetIndex];
      if (!sheet) {
        return;
      }

      const usedRange = getUsedRange(sheet);
      const hasContent = usedRange !== undefined;

      if (hasContent) {
        const ok = window.confirm(`Sheet "${sheet.name}" has content. Delete it?`);
        if (!ok) {
          return;
        }
      }

      dispatch({ type: "DELETE_SHEET", sheetIndex });
    },
    [dispatch, workbook.sheets],
  );

  const handleRenameSheet = useCallback(
    (sheetIndex: number, newName: string) => {
      dispatch({ type: "RENAME_SHEET", sheetIndex, name: newName });
    },
    [dispatch],
  );

  const handleDuplicateSheet = useCallback(
    (sheetIndex: number) => {
      dispatch({ type: "DUPLICATE_SHEET", sheetIndex });
    },
    [dispatch],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, sheetIndex: number) => {
      e.preventDefault();
      setContextMenuState({
        type: "open",
        x: e.clientX,
        y: e.clientY,
        sheetIndex,
      });
    },
    [],
  );

  const handleContextMenuClose = useCallback(() => {
    setContextMenuState(createClosedContextMenuState());
  }, []);

  const handleContextMenuAction = useCallback(
    (action: XlsxSheetTabContextMenuAction, sheetIndex: number) => {
      switch (action) {
        case "rename":
          setEditingIndex(sheetIndex);
          break;
        case "duplicate":
          handleDuplicateSheet(sheetIndex);
          break;
        case "delete":
          handleCloseSheet(sheetIndex);
          break;
      }
    },
    [handleDuplicateSheet, handleCloseSheet],
  );

  const canDeleteSheet = workbook.sheets.length > 1;

  return (
    <>
      <div style={{ ...containerStyle, ...style }}>
        <div
          style={tabScrollAreaStyle}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div role="tablist" style={tabListStyle}>
            {workbook.sheets.map((sheet, index) => {
              const hasContent = getUsedRange(sheet) !== undefined;
              const dropTargetPosition = isDropTarget(index) ? "left" : isDropTarget(index + 1) ? "right" : undefined;
              return (
                <XlsxSheetTab
                  key={index}
                  sheetIndex={index}
                  sheetName={sheet.name}
                  isActive={activeSheetIndex === index}
                  hasContent={hasContent}
                  isEditing={editingIndex === index}
                  canDelete={canDeleteSheet}
                  onSelect={() => handleSelectSheet(index)}
                  onClose={() => handleCloseSheet(index)}
                  onRename={(name) => handleRenameSheet(index, name)}
                  onStartEdit={() => setEditingIndex(index)}
                  onCancelEdit={() => setEditingIndex(undefined)}
                  onDuplicate={() => handleDuplicateSheet(index)}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  isDragging={isDragging(index)}
                  dropTargetPosition={dropTargetPosition}
                  onContextMenu={(e) => handleContextMenu(e, index)}
                />
              );
            })}
          </div>
        </div>
        <button
          type="button"
          style={addButtonStyle}
          onClick={handleAddSheet}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `var(--bg-tertiary, ${colorTokens.background.tertiary})`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = `var(--bg-secondary, ${colorTokens.background.secondary})`;
          }}
          title="Add sheet"
          aria-label="Add sheet"
        >
          +
        </button>
      </div>
      <XlsxSheetTabContextMenu
        menuState={contextMenuState}
        canDelete={canDeleteSheet}
        onAction={handleContextMenuAction}
        onClose={handleContextMenuClose}
      />
    </>
  );
}
