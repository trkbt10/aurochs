/**
 * @file DocxDocumentEditor
 *
 * Main DOCX document editor component with EditorShell layout.
 * Provides unified editing experience similar to xlsx-editor and pptx-editor.
 */

import { useMemo, useCallback, type CSSProperties } from "react";
import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { ContinuousCursorPosition } from "@aurochs-office/text-layout";
import { EditorShell, type EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { DocumentEditorProvider, useDocumentEditor } from "./context/document/DocumentEditorContext";
import { DocumentToolbar } from "./panels/DocumentToolbar";
import { SelectedElementPanel } from "./panels/SelectedElementPanel";
import { ContinuousEditor } from "./text-edit/ContinuousEditor";

// =============================================================================
// Types
// =============================================================================

export type DocxDocumentEditorProps = {
  /** Initial document to edit */
  readonly initialDocument: DocxDocument;
  /** Called when document changes */
  readonly onDocumentChange?: (document: DocxDocument) => void;
  /** Custom style for container */
  readonly style?: CSSProperties;
  /** Custom class name */
  readonly className?: string;
};

// =============================================================================
// Styles
// =============================================================================

const editorContainerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column",
};

const canvasContainerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  backgroundColor: "#525659",
  overflow: "auto",
};

const rightPanelContainerStyle: CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
};

// =============================================================================
// Inner Component
// =============================================================================

function DocxDocumentEditorInner() {
  const { document, dispatch } = useDocumentEditor();

  // Handle cursor position changes - update selection to match cursor location
  const handleCursorChange = useCallback(
    (position: ContinuousCursorPosition) => {
      const paragraphIndex = position.paragraphIndex;
      dispatch({
        type: "SELECT_ELEMENT",
        elementId: String(paragraphIndex),
      });
    },
    [dispatch],
  );

  const panels = useMemo<EditorPanel[]>(() => {
    return [
      {
        id: "properties",
        position: "right",
        content: (
          <div style={rightPanelContainerStyle}>
            <SelectedElementPanel />
          </div>
        ),
        size: "320px",
        resizable: true,
        minSize: 280,
        maxSize: 500,
        drawerLabel: "Format",
      },
    ];
  }, []);

  return (
    <EditorShell
      toolbar={<DocumentToolbar />}
      panels={panels}
    >
      <div style={canvasContainerStyle}>
        <ContinuousEditor
          paragraphs={document.body.content.filter((el) => el.type === "paragraph")}
          numbering={document.numbering}
          onCursorChange={handleCursorChange}
        />
      </div>
    </EditorShell>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Main DOCX document editor component.
 *
 * Provides a complete editing experience with:
 * - Toolbar with formatting controls
 * - Central document canvas
 * - Right panel with properties and document info
 */
export function DocxDocumentEditor({
  initialDocument,
  onDocumentChange: _onDocumentChange,
  style,
  className,
}: DocxDocumentEditorProps) {
  return (
    <div style={{ ...editorContainerStyle, ...style }} className={className}>
      <DocumentEditorProvider initialDocument={initialDocument}>
        <DocxDocumentEditorInner />
      </DocumentEditorProvider>
    </div>
  );
}
