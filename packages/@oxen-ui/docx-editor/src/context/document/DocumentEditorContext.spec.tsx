/**
 * @file DocumentEditorContext unit tests
 */

// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import type { DocxDocument } from "@oxen/docx/domain/document";
import {
  DocumentEditorProvider,
  useDocumentEditor,
  useDocumentEditorOptional,
} from "./DocumentEditorContext";

// =============================================================================
// Test Fixtures
// =============================================================================

function createEmptyDocument(): DocxDocument {
  return {
    body: {
      content: [],
    },
  };
}

function createDocumentWithParagraphs(): DocxDocument {
  return {
    body: {
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "run",
              content: [{ type: "text", value: "Hello" }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "run",
              content: [{ type: "text", value: "World" }],
            },
          ],
        },
      ],
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("DocumentEditorContext", () => {
  describe("DocumentEditorProvider", () => {
    it("provides context to children", () => {
      const document = createEmptyDocument();

      function TestComponent() {
        const { document: doc } = useDocumentEditor();
        return <div data-testid="content">{doc.body.content.length}</div>;
      }

      render(
        <DocumentEditorProvider initialDocument={document}>
          <TestComponent />
        </DocumentEditorProvider>
      );

      expect(screen.getByTestId("content").textContent).toBe("0");
    });

    it("provides document with content", () => {
      const document = createDocumentWithParagraphs();

      function TestComponent() {
        const { document: doc } = useDocumentEditor();
        return <div data-testid="content">{doc.body.content.length}</div>;
      }

      render(
        <DocumentEditorProvider initialDocument={document}>
          <TestComponent />
        </DocumentEditorProvider>
      );

      expect(screen.getByTestId("content").textContent).toBe("2");
    });

    it("provides canUndo and canRedo as false initially", () => {
      const document = createEmptyDocument();

      function TestComponent() {
        const { canUndo, canRedo } = useDocumentEditor();
        return (
          <div>
            <span data-testid="canUndo">{String(canUndo)}</span>
            <span data-testid="canRedo">{String(canRedo)}</span>
          </div>
        );
      }

      render(
        <DocumentEditorProvider initialDocument={document}>
          <TestComponent />
        </DocumentEditorProvider>
      );

      expect(screen.getByTestId("canUndo").textContent).toBe("false");
      expect(screen.getByTestId("canRedo").textContent).toBe("false");
    });

    it("provides empty selectedElements initially", () => {
      const document = createDocumentWithParagraphs();

      function TestComponent() {
        const { selectedElements } = useDocumentEditor();
        return <div data-testid="count">{selectedElements.length}</div>;
      }

      render(
        <DocumentEditorProvider initialDocument={document}>
          <TestComponent />
        </DocumentEditorProvider>
      );

      expect(screen.getByTestId("count").textContent).toBe("0");
    });

    it("provides undefined primaryElement initially", () => {
      const document = createDocumentWithParagraphs();

      function TestComponent() {
        const { primaryElement } = useDocumentEditor();
        return <div data-testid="primary">{primaryElement?.type ?? "none"}</div>;
      }

      render(
        <DocumentEditorProvider initialDocument={document}>
          <TestComponent />
        </DocumentEditorProvider>
      );

      expect(screen.getByTestId("primary").textContent).toBe("none");
    });
  });

  describe("useDocumentEditor", () => {
    it("throws error when used outside provider", () => {
      expect(() => {
        renderHook(() => useDocumentEditor());
      }).toThrow("useDocumentEditor must be used within DocumentEditorProvider");
    });
  });

  describe("useDocumentEditorOptional", () => {
    it("returns null when used outside provider", () => {
      const { result } = renderHook(() => useDocumentEditorOptional());
      expect(result.current).toBeNull();
    });

    it("returns context when used inside provider", () => {
      const document = createEmptyDocument();

      const { result } = renderHook(() => useDocumentEditorOptional(), {
        wrapper: ({ children }) => (
          <DocumentEditorProvider initialDocument={document}>
            {children}
          </DocumentEditorProvider>
        ),
      });

      expect(result.current).not.toBeNull();
      expect(result.current?.document).toBeDefined();
    });
  });
});
