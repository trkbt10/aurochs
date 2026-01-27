/**
 * @file ParagraphRenderer unit tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import { twips } from "@oxen/docx/domain/types";
import { ParagraphRenderer, computeParagraphStyles } from "./ParagraphRenderer";

// =============================================================================
// Test Fixtures
// =============================================================================

function createSimpleParagraph(text: string): DocxParagraph {
  return {
    type: "paragraph",
    content: [
      {
        type: "run",
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

function createEmptyParagraph(): DocxParagraph {
  return {
    type: "paragraph",
    content: [],
  };
}

// =============================================================================
// computeParagraphStyles Tests
// =============================================================================

describe("computeParagraphStyles", () => {
  it("returns default styles for paragraph without properties", () => {
    const paragraph = createSimpleParagraph("Test");
    const result = computeParagraphStyles(paragraph);
    expect(result.margin).toBe(0);
    expect(result.minHeight).toBe("1em");
  });

  it("applies left alignment", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { jc: "left" },
      content: [],
    };
    const result = computeParagraphStyles(paragraph);
    expect(result.textAlign).toBe("left");
  });

  it("applies center alignment", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { jc: "center" },
      content: [],
    };
    const result = computeParagraphStyles(paragraph);
    expect(result.textAlign).toBe("center");
  });

  it("applies right alignment", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { jc: "right" },
      content: [],
    };
    const result = computeParagraphStyles(paragraph);
    expect(result.textAlign).toBe("right");
  });

  it("applies justify alignment for both", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { jc: "both" },
      content: [],
    };
    const result = computeParagraphStyles(paragraph);
    expect(result.textAlign).toBe("justify");
  });

  it("applies spacing before", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { spacing: { before: twips(240) } }, // 240 twips = 12 points
      content: [],
    };
    const result = computeParagraphStyles(paragraph);
    expect(result.marginTop).toBe("12pt");
  });

  it("applies spacing after", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { spacing: { after: twips(200) } }, // 200 twips = 10 points
      content: [],
    };
    const result = computeParagraphStyles(paragraph);
    expect(result.marginBottom).toBe("10pt");
  });

  it("applies exact line spacing", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { spacing: { line: 480, lineRule: "exact" } }, // 480 twips = 24 points
      content: [],
    };
    const result = computeParagraphStyles(paragraph);
    expect(result.lineHeight).toBe("24pt");
  });

  it("applies auto line spacing multiplier", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { spacing: { line: 360 } }, // 360/240 = 1.5 line spacing
      content: [],
    };
    const result = computeParagraphStyles(paragraph);
    expect(result.lineHeight).toBe("1.5");
  });

  it("applies left indentation", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { ind: { left: twips(720) } }, // 720 twips = 36 points
      content: [],
    };
    const result = computeParagraphStyles(paragraph);
    expect(result.marginLeft).toBe("36pt");
  });

  it("applies first line indentation", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { ind: { firstLine: twips(360) } }, // 360 twips = 18 points
      content: [],
    };
    const result = computeParagraphStyles(paragraph);
    expect(result.textIndent).toBe("18pt");
  });

  it("applies hanging indentation", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { ind: { hanging: twips(360) } },
      content: [],
    };
    const result = computeParagraphStyles(paragraph);
    expect(result.textIndent).toBe("-18pt");
    expect(result.paddingLeft).toBe("18pt");
  });

  it("applies background shading", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { shd: { fill: "FFFF00" } },
      content: [],
    };
    const result = computeParagraphStyles(paragraph);
    expect(result.backgroundColor).toBe("#FFFF00");
  });

  it("applies RTL direction", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { bidi: true },
      content: [],
    };
    const result = computeParagraphStyles(paragraph);
    expect(result.direction).toBe("rtl");
  });
});

// =============================================================================
// ParagraphRenderer Tests
// =============================================================================

describe("ParagraphRenderer", () => {
  const defaultProps = {
    elementId: "0",
    isSelected: false,
    isEditing: false,
    onClick: vi.fn(),
    onDoubleClick: vi.fn(),
  };

  it("renders paragraph text", () => {
    const paragraph = createSimpleParagraph("Hello World");

    render(<ParagraphRenderer paragraph={paragraph} {...defaultProps} />);

    expect(screen.getByText("Hello World")).toBeDefined();
  });

  it("renders empty paragraph with non-breaking space", () => {
    const paragraph = createEmptyParagraph();

    const { container } = render(
      <ParagraphRenderer paragraph={paragraph} {...defaultProps} />
    );

    const p = container.querySelector("p");
    expect(p).not.toBeNull();
  });

  it("applies selected state styling", () => {
    const paragraph = createSimpleParagraph("Selected");

    const { container } = render(
      <ParagraphRenderer
        paragraph={paragraph}
        {...defaultProps}
        isSelected={true}
      />
    );

    const div = container.firstChild as HTMLElement;
    expect(div.style.outline).toContain("2px solid");
  });

  it("applies editing state styling", () => {
    const paragraph = createSimpleParagraph("Editing");

    const { container } = render(
      <ParagraphRenderer
        paragraph={paragraph}
        {...defaultProps}
        isEditing={true}
      />
    );

    const div = container.firstChild as HTMLElement;
    expect(div.style.backgroundColor).not.toBe("transparent");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    const paragraph = createSimpleParagraph("Clickable");

    const { container } = render(
      <ParagraphRenderer
        paragraph={paragraph}
        {...defaultProps}
        onClick={onClick}
      />
    );

    fireEvent.click(container.firstChild as HTMLElement);
    expect(onClick).toHaveBeenCalled();
  });

  it("calls onDoubleClick when double-clicked", () => {
    const onDoubleClick = vi.fn();
    const paragraph = createSimpleParagraph("Double Clickable");

    const { container } = render(
      <ParagraphRenderer
        paragraph={paragraph}
        {...defaultProps}
        onDoubleClick={onDoubleClick}
      />
    );

    fireEvent.doubleClick(container.firstChild as HTMLElement);
    expect(onDoubleClick).toHaveBeenCalled();
  });

  it("sets data-element-id attribute", () => {
    const paragraph = createSimpleParagraph("Test");

    const { container } = render(
      <ParagraphRenderer
        paragraph={paragraph}
        {...defaultProps}
        elementId="test-id"
      />
    );

    const div = container.firstChild as HTMLElement;
    expect(div.getAttribute("data-element-id")).toBe("test-id");
  });

  it("renders hyperlink", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      content: [
        {
          type: "hyperlink",
          anchor: "section1",
          tooltip: "Go to section 1",
          content: [
            {
              type: "run",
              content: [{ type: "text", value: "Link text" }],
            },
          ],
        },
      ],
    };

    render(<ParagraphRenderer paragraph={paragraph} {...defaultProps} />);

    const link = screen.getByText("Link text");
    expect(link.closest("a")).not.toBeNull();
  });

  it("renders multiple runs", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      content: [
        {
          type: "run",
          properties: { b: true },
          content: [{ type: "text", value: "Bold" }],
        },
        {
          type: "run",
          properties: { i: true },
          content: [{ type: "text", value: "Italic" }],
        },
      ],
    };

    render(<ParagraphRenderer paragraph={paragraph} {...defaultProps} />);

    expect(screen.getByText("Bold")).toBeDefined();
    expect(screen.getByText("Italic")).toBeDefined();
  });

  it("applies paragraph alignment", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { jc: "center" },
      content: [
        {
          type: "run",
          content: [{ type: "text", value: "Centered" }],
        },
      ],
    };

    const { container } = render(
      <ParagraphRenderer paragraph={paragraph} {...defaultProps} />
    );

    const p = container.querySelector("p");
    expect(p?.style.textAlign).toBe("center");
  });

  it("handles bookmark markers", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      content: [
        { type: "bookmarkStart", id: 1, name: "test-bookmark" },
        {
          type: "run",
          content: [{ type: "text", value: "Bookmarked text" }],
        },
        { type: "bookmarkEnd", id: 1 },
      ],
    };

    const { container } = render(
      <ParagraphRenderer paragraph={paragraph} {...defaultProps} />
    );

    expect(container.querySelector("#bookmark-1")).not.toBeNull();
    expect(screen.getByText("Bookmarked text")).toBeDefined();
  });
});
