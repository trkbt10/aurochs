/**
 * @file ParagraphRenderer design token styling tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import { ParagraphRenderer } from "./ParagraphRenderer";

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

describe("ParagraphRenderer (design tokens)", () => {
  const defaultProps = {
    elementId: "0",
    isSelected: false,
    isEditing: false,
    onClick: vi.fn(),
    onDoubleClick: vi.fn(),
  };

  it("uses selection design tokens for outline and background", () => {
    const paragraph = createSimpleParagraph("Selected");

    const { container } = render(
      <ParagraphRenderer
        paragraph={paragraph}
        {...defaultProps}
        isSelected={true}
      />
    );

    const div = container.firstChild as HTMLElement;
    expect(div.style.outline).toBe("2px solid var(--selection-primary)");
    expect(div.style.backgroundColor).toBe(
      "color-mix(in srgb, var(--selection-primary) 5%, transparent)"
    );
  });

  it("uses editing design token for background", () => {
    const paragraph = createSimpleParagraph("Editing");

    const { container } = render(
      <ParagraphRenderer
        paragraph={paragraph}
        {...defaultProps}
        isEditing={true}
      />
    );

    const div = container.firstChild as HTMLElement;
    expect(div.style.backgroundColor).toBe(
      "color-mix(in srgb, var(--selection-primary) 8%, transparent)"
    );
  });

  it("uses accent design token for hyperlink color", () => {
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

    const anchor = screen.getByText("Link text").closest("a");
    expect(anchor).not.toBeNull();
    expect(anchor?.style.color).toBe("var(--accent-secondary)");
  });
});

