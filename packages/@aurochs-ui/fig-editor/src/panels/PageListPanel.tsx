/**
 * @file Page list panel
 *
 * Left panel showing the list of pages with add/delete/select actions.
 */

import { useCallback } from "react";
import { useFigEditor } from "../context/FigEditorContext";

/**
 * Page list panel for the fig editor.
 */
export function PageListPanel() {
  const { document, activePageId, dispatch } = useFigEditor();

  const handleAddPage = useCallback(() => {
    dispatch({ type: "ADD_PAGE" });
  }, [dispatch]);

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#666" }}>Pages</span>
        <button
          onClick={handleAddPage}
          style={{
            background: "none",
            border: "1px solid #ddd",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>

      {document.pages.map((page) => (
        <div
          key={page.id}
          onClick={() => dispatch({ type: "SELECT_PAGE", pageId: page.id })}
          style={{
            padding: "6px 8px",
            fontSize: 12,
            cursor: "pointer",
            borderRadius: 4,
            backgroundColor: page.id === activePageId ? "#e8e8ff" : "transparent",
            marginBottom: 2,
          }}
        >
          {page.name}
        </div>
      ))}
    </div>
  );
}
