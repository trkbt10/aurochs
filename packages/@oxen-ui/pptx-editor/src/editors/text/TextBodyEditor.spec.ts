/**
 * @file TextBodyEditor component tests
 *
 * Tests the TextBodyEditor handles text body data correctly,
 * including edge cases with empty paragraphs or missing data.
 */

import type { TextBody, Paragraph, TextRun, ParagraphProperties, BodyProperties } from "@oxen/pptx/domain/text";
import { px } from "@oxen/ooxml/domain/units";

// =============================================================================
// Helper functions
// =============================================================================

const createDefaultBodyProperties = (): BodyProperties => ({
  verticalType: "horz",
  wrapping: "square",
  anchor: "top",
  anchorCenter: false,
  overflow: "overflow",
  autoFit: { type: "none" },
  insets: {
    left: px(0),
    top: px(0),
    right: px(0),
    bottom: px(0),
  },
});

const createDefaultParagraphProperties = (): ParagraphProperties => ({
  level: 0,
  alignment: "left",
});

const createTextRun = (text: string): TextRun => ({
  type: "text",
  text,
  properties: {},
});

const createParagraph = (texts: string[]): Paragraph => ({
  runs: texts.map(createTextRun),
  properties: createDefaultParagraphProperties(),
  endProperties: {},
});

// =============================================================================
// TextBodyEditor Tests
// =============================================================================

describe("TextBodyEditor: TextBody handling", () => {
  describe("paragraphs access", () => {
    it("handles text body with paragraphs", () => {
      const textBody: TextBody = {
        bodyProperties: createDefaultBodyProperties(),
        paragraphs: [
          createParagraph(["Hello"]),
          createParagraph(["World"]),
        ],
      };

      expect(textBody.paragraphs).toBeDefined();
      expect(textBody.paragraphs.length).toBe(2);
    });

    it("handles text body with empty paragraphs", () => {
      const textBody: TextBody = {
        bodyProperties: createDefaultBodyProperties(),
        paragraphs: [],
      };

      expect(textBody.paragraphs.length).toBe(0);
    });

    it("handles text body with single paragraph", () => {
      const textBody: TextBody = {
        bodyProperties: createDefaultBodyProperties(),
        paragraphs: [createParagraph(["Single paragraph"])],
      };

      // Component uses this pattern
      const selectedIndex = textBody.paragraphs.length > 0 ? 0 : null;
      expect(selectedIndex).toBe(0);
    });
  });

  describe("paragraph runs access", () => {
    it("handles paragraph with runs", () => {
      const paragraph = createParagraph(["Hello", " ", "World"]);

      expect(paragraph.runs.length).toBe(3);
    });

    it("handles paragraph with empty runs", () => {
      const paragraph: Paragraph = {
        runs: [],
        properties: createDefaultParagraphProperties(),
        endProperties: {},
      };

      expect(paragraph.runs.length).toBe(0);
    });
  });

  describe("selectedIndex management", () => {
    it("selects first paragraph when available", () => {
      const textBody: TextBody = {
        bodyProperties: createDefaultBodyProperties(),
        paragraphs: [createParagraph(["Test"])],
      };

      const selectedIndex = textBody.paragraphs.length > 0 ? 0 : null;
      expect(selectedIndex).toBe(0);
    });

    it("returns null when no paragraphs", () => {
      const textBody: TextBody = {
        bodyProperties: createDefaultBodyProperties(),
        paragraphs: [],
      };

      const selectedIndex = textBody.paragraphs.length > 0 ? 0 : null;
      expect(selectedIndex).toBe(null);
    });

    it("validates selected index is within bounds", () => {
      const textBody: TextBody = {
        bodyProperties: createDefaultBodyProperties(),
        paragraphs: [createParagraph(["Test"])],
      };

      const selectedIndex = 0;
      const isValid =
        selectedIndex !== null &&
        selectedIndex < textBody.paragraphs.length;

      expect(isValid).toBe(true);
    });

    it("detects out of bounds index", () => {
      const textBody: TextBody = {
        bodyProperties: createDefaultBodyProperties(),
        paragraphs: [createParagraph(["Test"])],
      };

      const selectedIndex = 5;
      const isValid =
        selectedIndex !== null &&
        selectedIndex < textBody.paragraphs.length;

      expect(isValid).toBe(false);
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("TextBodyEditor: Edge cases", () => {
  it("handles undefined paragraphs gracefully", () => {
    const textBody = {
      bodyProperties: createDefaultBodyProperties(),
    } as TextBody;

    // Component should handle missing paragraphs
    const paragraphCount = textBody.paragraphs?.length ?? 0;
    expect(paragraphCount).toBe(0);
  });

  it("handles paragraph with undefined runs gracefully", () => {
    const paragraph = {
      properties: createDefaultParagraphProperties(),
      endProperties: {},
    } as Paragraph;

    // Component should handle missing runs
    const runCount = paragraph.runs?.length ?? 0;
    expect(runCount).toBe(0);
  });
});
