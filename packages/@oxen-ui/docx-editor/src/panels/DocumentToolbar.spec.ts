/**
 * @file DocumentToolbar spacing token tests
 */

// @vitest-environment jsdom

import { createElement } from "react";
import { render } from "@testing-library/react";
import type { DocxDocument } from "@oxen/docx/domain/document";
import { DocumentEditorProvider } from "../context/document/DocumentEditorContext";
import { DocumentToolbar } from "./DocumentToolbar";

function renderToolbar(document: DocxDocument) {
  return render(
    createElement(DocumentEditorProvider, {
      initialDocument: document,
      children: createElement(DocumentToolbar),
    }),
  );
}

describe("DocumentToolbar", () => {
  it("uses spacing/border design token CSS variables", () => {
    const initialDocument: DocxDocument = {
      body: {
        content: [],
      },
    };

    const { container, getByTitle } = renderToolbar(initialDocument);

    const toolbar = container.querySelector(".document-toolbar") as HTMLElement | null;
    expect(toolbar).not.toBeNull();
    expect(toolbar?.style.gap).toBe("var(--spacing-xs)");
    expect(toolbar?.style.padding).toBe("var(--spacing-xs)");

    const toolbarChildren = Array.from(toolbar?.children ?? []);
    const groups = toolbarChildren.filter((child) => child instanceof HTMLElement && child.style.gap === "var(--spacing-xs)");
    expect(groups.length).toBeGreaterThan(0);

    const separators = toolbarChildren.filter((child) => child instanceof HTMLElement && child.style.width === "1px");
    expect(separators.length).toBe(3);
    for (const separator of separators) {
      expect(separator).toBeInstanceOf(HTMLElement);
      expect((separator as HTMLElement).style.height).toBe("20px");
      expect((separator as HTMLElement).style.backgroundColor).toBe("var(--border-strong)");
      expect((separator as HTMLElement).style.margin).toBe("0 var(--spacing-xs)");
    }

    const undoButton = getByTitle("Undo (Ctrl+Z)");
    expect(undoButton).toBeInstanceOf(HTMLElement);
    expect((undoButton as HTMLElement).style.padding).toBe("var(--spacing-xs) var(--spacing-xs-plus)");
  });
});
