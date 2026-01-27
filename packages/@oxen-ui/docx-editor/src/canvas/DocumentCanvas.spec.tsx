/**
 * @file DocumentCanvas unit tests
 */

// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DocxDocument } from "@oxen/docx/domain/document";
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
      </DocumentEditorProvider>
    );

    expect(screen.getByText("Empty document")).toBeDefined();
  });

  it("calls onCanvasClick only when background is clicked", () => {
    let canvasClickCount = 0;

    const { container } = render(
      <DocumentEditorProvider initialDocument={createEmptyDocument()}>
        <DocumentCanvas className="doc-canvas" onCanvasClick={() => (canvasClickCount += 1)} />
      </DocumentEditorProvider>
    );

    const root = container.querySelector(".doc-canvas");
    if (!root) {
      throw new Error("Expected root element to exist");
    }

    fireEvent.click(root);
    expect(canvasClickCount).toBe(1);

    const emptyMessage = screen.getByText("Empty document");
    fireEvent.click(emptyMessage);
    expect(canvasClickCount).toBe(1);
  });

  it("calls onElementClick when an element is clicked", () => {
    const document = createDocumentWithParagraphs(["Hello", "World"]);
    let clickedElementId: string | undefined;
    let canvasClickCount = 0;

    render(
      <DocumentEditorProvider initialDocument={document}>
        <DocumentCanvas
          onCanvasClick={() => (canvasClickCount += 1)}
          onElementClick={(elementId) => {
            clickedElementId = elementId;
          }}
        />
      </DocumentEditorProvider>
    );

    fireEvent.click(screen.getByText("Hello"));
    expect(clickedElementId).toBe("0");
    expect(canvasClickCount).toBe(0);
  });

  it("calls onElementDoubleClick when an element is double-clicked", () => {
    const document = createDocumentWithParagraphs(["Hello"]);
    let doubleClickedElementId: string | undefined;

    render(
      <DocumentEditorProvider initialDocument={document}>
        <DocumentCanvas
          onElementDoubleClick={(elementId) => {
            doubleClickedElementId = elementId;
          }}
        />
      </DocumentEditorProvider>
    );

    fireEvent.doubleClick(screen.getByText("Hello"));
    expect(doubleClickedElementId).toBe("0");
  });

  it("renders page break indicator when showPageBreaks is true", () => {
    render(
      <DocumentEditorProvider initialDocument={createEmptyDocument()}>
        <DocumentCanvas showPageBreaks={true} />
      </DocumentEditorProvider>
    );

    expect(screen.getByText("Page Break")).toBeDefined();
  });
});
