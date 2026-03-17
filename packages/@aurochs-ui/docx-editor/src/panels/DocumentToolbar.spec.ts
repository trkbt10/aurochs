/**
 * @file DocumentToolbar spacing token tests
 */

// @vitest-environment jsdom

import { createElement } from "react";
import { render } from "@testing-library/react";
import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import { colorTokens, spacingTokens } from "@aurochs-ui/ui-components";
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
    const groups = toolbarChildren.filter(
      (child) => child instanceof HTMLElement && child.style.gap === "var(--spacing-xs)",
    );
    expect(groups.length).toBeGreaterThan(0);

    // ToolbarSeparator uses resolved design token values (not CSS variable names)
    const separators = toolbarChildren.filter((child) => child instanceof HTMLElement && child.style.width === "1px");
    expect(separators.length).toBe(3);
    for (const separator of separators) {
      expect(separator).toBeInstanceOf(HTMLElement);
      expect((separator as HTMLElement).style.height).toBe("20px");
      // jsdom normalizes #dadce0 → rgb(218, 220, 224)
      expect((separator as HTMLElement).style.backgroundColor).toBe("rgb(218, 220, 224)");
      // jsdom normalizes "0" → "0px"
      expect((separator as HTMLElement).style.margin).toBe(`0px ${spacingTokens.xs}`);
    }

    const undoButton = getByTitle("Undo (Ctrl+Z)");
    expect(undoButton).toBeInstanceOf(HTMLElement);
  });
});
