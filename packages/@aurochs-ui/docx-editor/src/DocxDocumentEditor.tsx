/**
 * @file DocxDocumentEditor
 *
 * Main DOCX document editor component with EditorShell layout.
 * Provides unified editing experience similar to xlsx-editor and pptx-editor.
 */

import { useMemo, useCallback, type CSSProperties } from "react";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { ContinuousCursorPosition } from "@aurochs-office/text-layout";
import { useDocumentLayout } from "@aurochs-renderer/docx/react";
import { EditorShell, type EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { GalleryVerticalIcon } from "@aurochs-ui/ui-components/icons";
import { DocumentEditorProvider, useDocumentEditor } from "./context/document/DocumentEditorContext";
import { DocumentToolbar } from "./panels/DocumentToolbar";
import { DocxRibbonToolbar } from "./panels/DocxRibbonToolbar";
import { DocxPageListPanel } from "./panels/DocxPageListPanel";
import { ContinuousEditor } from "./text-edit/ContinuousEditor";
import { ColorEditingProvider } from "@aurochs-ui/color-editor/context";

// =============================================================================
// Types
// =============================================================================

/** Which toolbar panel sits above the editor. Both are first-class options. */
export type DocxToolbarPanel = "classic" | "ribbon";

export type DocxDocumentEditorProps = {
  /** Initial document to edit */
  readonly initialDocument: DocxDocument;
  /** Called when document changes */
  readonly onDocumentChange?: (document: DocxDocument) => void;
  /** Toolbar panel to use. Defaults to "classic". */
  readonly toolbarPanel?: DocxToolbarPanel;
  /** Additional panels to inject into EditorShell. */
  readonly panels?: readonly EditorPanel[];
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
  backgroundColor: colorTokens.background.canvas,
  overflow: "auto",
};


// =============================================================================
// Inner Component
// =============================================================================

function DocxDocumentEditorInner({ toolbarPanel, extraPanels }: { readonly toolbarPanel: DocxToolbarPanel; readonly extraPanels: readonly EditorPanel[] }) {
  const { document, dispatch, activePageIndex } = useDocumentEditor();

  const paragraphs = useMemo(
    () => document.body.content.filter((el): el is DocxParagraph => el.type === "paragraph"),
    [document.body.content],
  );

  // Compute layout for page list (ContinuousEditor has its own internal layout)
  const { pagedLayout } = useDocumentLayout({
    paragraphs,
    sectPr: document.body.sectPr,
    numbering: document.numbering,
    mode: "paged",
  });

  const handleCursorChange = useCallback(
    (position: ContinuousCursorPosition) => {
      dispatch({ type: "SELECT_ELEMENT", elementId: String(position.paragraphIndex) });
    },
    [dispatch],
  );

  const handlePageSelect = useCallback(
    (pageIndex: number) => {
      dispatch({ type: "SET_ACTIVE_PAGE", pageIndex });
    },
    [dispatch],
  );

  const panels = useMemo<EditorPanel[]>(() => [
    {
      id: "pages",
      position: "left" as const,
      content: (
        <DocxPageListPanel
          pages={pagedLayout.pages}
          currentPageIndex={activePageIndex}
          onPageSelect={handlePageSelect}
        />
      ),
      size: "200px",
      resizable: true,
      minSize: 160,
      maxSize: 300,
      drawerIcon: GalleryVerticalIcon,
      drawerLabel: "Pages",
    },
    ...extraPanels,
  ], [pagedLayout.pages, activePageIndex, handlePageSelect, extraPanels]);

  const canvas = (
    <div style={canvasContainerStyle}>
      <ContinuousEditor
        paragraphs={paragraphs}
        sectPr={document.body.sectPr}
        numbering={document.numbering}
        onCursorChange={handleCursorChange}
      />
    </div>
  );

  if (toolbarPanel === "ribbon") {
    return (
      <DocxRibbonToolbar>
        <EditorShell panels={panels}>
          {canvas}
        </EditorShell>
      </DocxRibbonToolbar>
    );
  }

  return (
    <EditorShell toolbar={<DocumentToolbar />} panels={panels}>
      {canvas}
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
  toolbarPanel = "classic",
  panels = [],
  style,
  className,
}: DocxDocumentEditorProps) {
  return (
    <div style={{ ...editorContainerStyle, ...style }} className={className}>
      <ColorEditingProvider>
        <DocumentEditorProvider initialDocument={initialDocument}>
          <DocxDocumentEditorInner toolbarPanel={toolbarPanel} extraPanels={panels} />
        </DocumentEditorProvider>
      </ColorEditingProvider>
    </div>
  );
}
