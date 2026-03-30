/**
 * @file DOCX Editor Preview Page
 *
 * Shows the DocxDocumentEditor component with EditorShell layout.
 */

import { type CSSProperties } from "react";
import { DocxDocumentEditor } from "@aurochs-ui/docx-editor";
import type { EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { SelectedElementPanel } from "../panels/SelectedElementPanel";
import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import { halfPoints } from "@aurochs-office/docx/domain/types";

// =============================================================================
// Sample Document
// =============================================================================

function createParagraph(
  text: string,
  options?: { bold?: boolean; italic?: boolean; fontSize?: number },
): DocxParagraph {
  return {
    type: "paragraph",
    content: [
      {
        type: "run",
        properties: {
          b: options?.bold,
          i: options?.italic,
          sz: options?.fontSize !== undefined ? halfPoints(options.fontSize * 2) : undefined,
        },
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

const sampleDocument: DocxDocument = {
  body: {
    content: [
      createParagraph("DOCX Document Editor", { bold: true, fontSize: 28 }),
      createParagraph(""),
      createParagraph(
        "This is a preview of the DocxDocumentEditor component using the shared EditorShell layout.",
      ),
      createParagraph(""),
      createParagraph("Features", { bold: true, fontSize: 18 }),
      createParagraph(""),
      createParagraph("• Unified toolbar with formatting controls (Bold, Italic, Underline, etc.)"),
      createParagraph("• Right panel with Run and Paragraph property editors"),
      createParagraph("• Document info panel showing metadata"),
      createParagraph("• SVG-based text rendering using ContinuousEditor"),
      createParagraph(""),
      createParagraph("Shared Components", { bold: true, fontSize: 18 }),
      createParagraph(""),
      createParagraph("• EditorShell from @aurochs-ui/editor-controls"),
      createParagraph("• ToggleButton, ToolbarButton, ToolbarSeparator from @aurochs-ui/ui-components"),
      createParagraph("• Design tokens for consistent styling"),
      createParagraph(""),
      createParagraph("Try clicking on the text to position the cursor, or use the toolbar buttons."),
    ],
  },
};

// =============================================================================
// Root Component
// =============================================================================

const containerStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
};

export type DocxEditorPreviewPageProps = {
  readonly toolbarPanel?: "classic" | "ribbon";
};

const rightPanelStyle: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", overflow: "auto" };

const CLASSIC_PANELS: readonly EditorPanel[] = [
  {
    id: "properties",
    position: "right",
    content: <div style={rightPanelStyle}><SelectedElementPanel /></div>,
    size: "320px",
    resizable: true,
    minSize: 280,
    maxSize: 500,
    drawerLabel: "Format",
  },
];

const NO_PANELS: readonly EditorPanel[] = [];

/** DOCX editor preview page with selectable toolbar panel. */
export function DocxEditorPreviewPage({ toolbarPanel = "classic" }: DocxEditorPreviewPageProps) {
  const panels = toolbarPanel === "classic" ? CLASSIC_PANELS : NO_PANELS;

  return (
    <div style={containerStyle}>
      <DocxDocumentEditor
        initialDocument={sampleDocument}
        toolbarPanel={toolbarPanel}
        panels={panels}
        onDocumentChange={(doc) => {
          console.log("Document changed:", doc);
        }}
      />
    </div>
  );
}
