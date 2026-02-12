/**
 * @file TextBox Component Tests
 */

import { renderToString } from "react-dom/server";
import { TextBox } from "./TextBox";
import type { DocxTextBoxContent, DocxBodyProperties } from "@aurochs-office/docx/domain/drawing";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxRun } from "@aurochs-office/docx/domain/run";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockParagraph(text: string, options?: { bold?: boolean; italic?: boolean }): DocxParagraph {
  const run: DocxRun = {
    type: "run",
    properties: {
      b: options?.bold,
      i: options?.italic,
    },
    content: [{ type: "text", value: text }],
  };

  return {
    type: "paragraph",
    content: [run],
  };
}

function createMockTextBox(paragraphs: DocxParagraph[]): DocxTextBoxContent {
  return {
    content: paragraphs,
  };
}

function renderTextBox(props: {
  content: DocxTextBoxContent;
  bodyPr?: DocxBodyProperties;
  width?: number;
  height?: number;
  idPrefix?: string;
}): string {
  return renderToString(
    <TextBox
      content={props.content}
      bodyPr={props.bodyPr}
      width={props.width ?? 200}
      height={props.height ?? 100}
      idPrefix={props.idPrefix}
    />,
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("TextBox", () => {
  describe("basic rendering", () => {
    it("renders empty text box for empty content", () => {
      const content = createMockTextBox([]);
      const html = renderTextBox({ content });

      expect(html).toContain('data-element-type="textbox"');
      expect(html).not.toContain("<text");
    });

    it("renders single paragraph", () => {
      const content = createMockTextBox([createMockParagraph("Hello World")]);
      const html = renderTextBox({ content });

      expect(html).toContain('data-element-type="textbox"');
      expect(html).toContain("<text");
      expect(html).toContain("Hello World");
    });

    it("renders multiple paragraphs", () => {
      const content = createMockTextBox([createMockParagraph("Line 1"), createMockParagraph("Line 2")]);
      const html = renderTextBox({ content });

      expect(html).toContain("Line 1");
      expect(html).toContain("Line 2");
    });
  });

  describe("text styling", () => {
    it("renders bold text", () => {
      const content = createMockTextBox([createMockParagraph("Bold Text", { bold: true })]);
      const html = renderTextBox({ content });

      expect(html).toContain('font-weight="bold"');
    });

    it("renders italic text", () => {
      const content = createMockTextBox([createMockParagraph("Italic Text", { italic: true })]);
      const html = renderTextBox({ content });

      expect(html).toContain('font-style="italic"');
    });
  });

  describe("clip path", () => {
    it("includes clip path definition", () => {
      const content = createMockTextBox([createMockParagraph("Test")]);
      const html = renderTextBox({ content });

      expect(html).toContain("<clipPath");
      expect(html).toContain("<defs>");
    });

    it("uses custom id prefix for clip path", () => {
      const content = createMockTextBox([createMockParagraph("Test")]);
      const html = renderTextBox({ content, idPrefix: "custom" });

      expect(html).toContain('id="custom-clip"');
      expect(html).toContain('clip-path="url(#custom-clip)"');
    });
  });

  describe("body properties", () => {
    it("applies vertical anchor center", () => {
      const content = createMockTextBox([createMockParagraph("Centered")]);
      const bodyPr: DocxBodyProperties = { anchor: "ctr" };
      const html = renderTextBox({ content, bodyPr });

      expect(html).toContain("<text");
      // Y position should be calculated for center alignment
    });

    it("applies vertical anchor bottom", () => {
      const content = createMockTextBox([createMockParagraph("Bottom")]);
      const bodyPr: DocxBodyProperties = { anchor: "b" };
      const html = renderTextBox({ content, bodyPr });

      expect(html).toContain("<text");
    });
  });

  describe("paragraph alignment", () => {
    it("applies center alignment", () => {
      const para = createMockParagraph("Centered");
      (para as { properties: { jc: string } }).properties = { jc: "center" };
      const content = createMockTextBox([para]);
      const html = renderTextBox({ content });

      expect(html).toContain('text-anchor="middle"');
    });

    it("applies right alignment", () => {
      const para = createMockParagraph("Right");
      (para as { properties: { jc: string } }).properties = { jc: "right" };
      const content = createMockTextBox([para]);
      const html = renderTextBox({ content });

      expect(html).toContain('text-anchor="end"');
    });
  });
});
