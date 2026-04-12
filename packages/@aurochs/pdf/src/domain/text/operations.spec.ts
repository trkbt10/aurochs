/**
 * @file PdfText domain operations tests
 *
 * Tests for type-safe PdfText update functions.
 */
import { describe, it, expect } from "vitest";
import { withTextContent, withFontFamily, withFontSize, withCharSpacing } from "./operations";
import type { PdfText } from "./types";
import { createDefaultGraphicsState } from "../graphics-state";

// =============================================================================
// Test fixture
// =============================================================================

function createTestPdfText(overrides: Partial<PdfText> = {}): PdfText {
  return {
    type: "text",
    text: "Hello",
    x: 100,
    y: 200,
    width: 50,
    height: 12,
    fontName: "F1",
    baseFont: "Helvetica",
    fontSize: 12,
    graphicsState: createDefaultGraphicsState(),
    rawBytes: new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]),
    rawText: "Hello",
    codeByteWidth: 1,
    ...overrides,
  };
}

// =============================================================================
// withTextContent
// =============================================================================

describe("withTextContent", () => {
  it("returns same element when text is unchanged", () => {
    const element = createTestPdfText();
    const result = withTextContent(element, "Hello");
    expect(result).toBe(element); // same reference
  });

  it("updates text and invalidates rawBytes when text changes", () => {
    const element = createTestPdfText();
    const result = withTextContent(element, "World");

    expect(result.text).toBe("World");
    expect(result.rawBytes).toBeUndefined();
    expect(result.rawText).toBeUndefined();
  });

  it("sets editState.textChanged to true when text changes", () => {
    const element = createTestPdfText();
    const result = withTextContent(element, "World");

    expect(result.editState).toBeDefined();
    expect(result.editState!.textChanged).toBe(true);
    expect(result.editState!.fontChanged).toBe(false);
  });

  it("preserves all other properties", () => {
    const element = createTestPdfText();
    const result = withTextContent(element, "World");

    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
    expect(result.fontName).toBe("F1");
    expect(result.baseFont).toBe("Helvetica");
    expect(result.fontSize).toBe(12);
  });

  it("merges editState when element already has editState", () => {
    const element = createTestPdfText({
      editState: { textChanged: false, fontChanged: true, resolvedFontFamily: "Arial" },
    });
    const result = withTextContent(element, "World");

    expect(result.editState!.textChanged).toBe(true);
    expect(result.editState!.fontChanged).toBe(true); // preserved
    expect(result.editState!.resolvedFontFamily).toBe("Arial"); // preserved
  });
});

// =============================================================================
// withFontFamily
// =============================================================================

describe("withFontFamily", () => {
  it("returns same element when font family is unchanged", () => {
    const element = createTestPdfText();
    const result = withFontFamily(element, "Helvetica");
    expect(result).toBe(element); // same reference
  });

  it("updates baseFont and invalidates rawBytes when font changes", () => {
    const element = createTestPdfText();
    const result = withFontFamily(element, "Times-Roman");

    expect(result.baseFont).toBe("Times-Roman");
    expect(result.rawBytes).toBeUndefined();
    expect(result.rawText).toBeUndefined();
  });

  it("sets editState.fontChanged and resolvedFontFamily", () => {
    const element = createTestPdfText();
    const result = withFontFamily(element, "Times-Roman");

    expect(result.editState).toBeDefined();
    expect(result.editState!.fontChanged).toBe(true);
    expect(result.editState!.resolvedFontFamily).toBe("Times-Roman");
    expect(result.editState!.textChanged).toBe(false);
  });

  it("uses fontName when baseFont is undefined", () => {
    const element = createTestPdfText({ baseFont: undefined });
    const result = withFontFamily(element, "F1"); // same as fontName
    expect(result).toBe(element); // unchanged
  });
});

// =============================================================================
// withFontSize
// =============================================================================

describe("withFontSize", () => {
  it("returns same element when fontSize is unchanged", () => {
    const element = createTestPdfText();
    const result = withFontSize(element, 12);
    expect(result).toBe(element);
  });

  it("updates fontSize", () => {
    const element = createTestPdfText();
    const result = withFontSize(element, 24);
    expect(result.fontSize).toBe(24);
  });

  it("does not invalidate rawBytes (font size doesn't affect encoding)", () => {
    const element = createTestPdfText();
    const result = withFontSize(element, 24);
    expect(result.rawBytes).toBeDefined();
  });
});

// =============================================================================
// withCharSpacing
// =============================================================================

describe("withCharSpacing", () => {
  it("returns same element when charSpacing is unchanged", () => {
    const element = createTestPdfText({ charSpacing: 2 });
    const result = withCharSpacing(element, 2);
    expect(result).toBe(element);
  });

  it("updates charSpacing", () => {
    const element = createTestPdfText();
    const result = withCharSpacing(element, 1.5);
    expect(result.charSpacing).toBe(1.5);
  });

  it("allows setting charSpacing to undefined", () => {
    const element = createTestPdfText({ charSpacing: 2 });
    const result = withCharSpacing(element, undefined);
    expect(result.charSpacing).toBeUndefined();
  });
});
