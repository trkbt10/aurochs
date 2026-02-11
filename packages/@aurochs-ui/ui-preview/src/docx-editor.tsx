/**
 * @file Standalone entry point for the DOCX Editor preview.
 *
 * Shows the DocxDocumentEditor component with EditorShell layout.
 */

import { StrictMode, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { DocxDocumentEditor } from "@aurochs-ui/docx-editor";
import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import { halfPoints } from "@aurochs-office/docx/domain/types";

injectCSSVariables();

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

function App() {
  return (
    <div style={containerStyle}>
      <DocxDocumentEditor
        initialDocument={sampleDocument}
        onDocumentChange={(doc) => {
          console.log("Document changed:", doc);
        }}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
