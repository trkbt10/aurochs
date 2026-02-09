/**
 * @file DocumentCanvas unit tests
 */

// @vitest-environment jsdom

import { render, screen, fireEvent } from "@testing-library/react";
import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import { DocumentEditorProvider } from "../context/document/DocumentEditorContext";
import { DocumentCanvas } from "./DocumentCanvas";

// =============================================================================
// Test Fixtures
// =============================================================================

function createEmptyDocument(): DocxDocument {
  return { body: { content: [] } };
}

function createDocumentWithParagraphs(texts: readonly string[]): DocxDocument {
  return {
    body: {
      content: texts.map((text) => ({
        type: "paragraph" as const,
        content: [
          {
            type: "run" as const,
            content: [{ type: "text" as const, value: text }],
          },
        ],
      })),
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("DocumentCanvas", () => {
  it("renders empty state when document has no content", () => {
    render(
      <DocumentEditorProvider initialDocument={createEmptyDocument()}>
        <DocumentCanvas />
      </DocumentEditorProvider>,
    );

    expect(screen.getByText("Empty document")).toBeDefined();
  });

  it("calls onCanvasClick only when background is clicked", () => {
    const ctx = { canvasClickCount: 0 };

    const { container } = render(
      <DocumentEditorProvider initialDocument={createEmptyDocument()}>
        <DocumentCanvas className="doc-canvas" onCanvasClick={() => (ctx.canvasClickCount += 1)} />
      </DocumentEditorProvider>,
    );

    const root = container.querySelector(".doc-canvas");
    if (!root) {
      throw new Error("Expected root element to exist");
    }

    fireEvent.click(root);
    expect(ctx.canvasClickCount).toBe(1);

    const emptyMessage = screen.getByText("Empty document");
    fireEvent.click(emptyMessage);
    expect(ctx.canvasClickCount).toBe(1);
  });

  it("calls onElementClick when an element is clicked", () => {
    const document = createDocumentWithParagraphs(["Hello", "World"]);
    const ctx = { clickedElementId: undefined as string | undefined, canvasClickCount: 0 };

    render(
      <DocumentEditorProvider initialDocument={document}>
        <DocumentCanvas
          onCanvasClick={() => (ctx.canvasClickCount += 1)}
          onElementClick={(elementId) => {
            ctx.clickedElementId = elementId;
          }}
        />
      </DocumentEditorProvider>,
    );

    fireEvent.click(screen.getByText("Hello"));
    expect(ctx.clickedElementId).toBe("0");
    expect(ctx.canvasClickCount).toBe(0);
  });

  it("calls onElementDoubleClick when an element is double-clicked", () => {
    const document = createDocumentWithParagraphs(["Hello"]);
    const ctx = { doubleClickedElementId: undefined as string | undefined };

    render(
      <DocumentEditorProvider initialDocument={document}>
        <DocumentCanvas
          onElementDoubleClick={(elementId) => {
            ctx.doubleClickedElementId = elementId;
          }}
        />
      </DocumentEditorProvider>,
    );

    fireEvent.doubleClick(screen.getByText("Hello"));
    expect(ctx.doubleClickedElementId).toBe("0");
  });

  it("renders page break indicator when showPageBreaks is true", () => {
    render(
      <DocumentEditorProvider initialDocument={createEmptyDocument()}>
        <DocumentCanvas showPageBreaks={true} />
      </DocumentEditorProvider>,
    );

    expect(screen.getByText("Page Break")).toBeDefined();
  });
});
