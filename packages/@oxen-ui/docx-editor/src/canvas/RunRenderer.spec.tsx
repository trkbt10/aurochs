/**
 * @file RunRenderer unit tests
 */

// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DocxRun, DocxRunProperties } from "@oxen/docx/domain/run";
import { halfPoints, twips } from "@oxen/docx/domain/types";
import { RunRenderer, RunContentRenderer, computeRunStyles } from "./RunRenderer";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTextRun(text: string, properties?: DocxRunProperties): DocxRun {
  return {
    type: "run",
    properties,
    content: [{ type: "text", value: text }],
  };
}

// =============================================================================
// computeRunStyles Tests
// =============================================================================

describe("computeRunStyles", () => {
  it("returns empty object for undefined properties", () => {
    const result = computeRunStyles(undefined);
    expect(result).toEqual({});
  });

  it("applies bold style", () => {
    const result = computeRunStyles({ b: true });
    expect(result.fontWeight).toBe("bold");
  });

  it("applies italic style", () => {
    const result = computeRunStyles({ i: true });
    expect(result.fontStyle).toBe("italic");
  });

  it("applies underline style", () => {
    const result = computeRunStyles({ u: { val: "single" } });
    expect(result.textDecoration).toContain("underline");
  });

  it("applies strikethrough style", () => {
    const result = computeRunStyles({ strike: true });
    expect(result.textDecoration).toContain("line-through");
  });

  it("combines underline and strikethrough", () => {
    const result = computeRunStyles({
      u: { val: "single" },
      strike: true,
    });
    expect(result.textDecoration).toContain("underline");
    expect(result.textDecoration).toContain("line-through");
  });

  it("applies caps style", () => {
    const result = computeRunStyles({ caps: true });
    expect(result.textTransform).toBe("uppercase");
  });

  it("applies small caps style", () => {
    const result = computeRunStyles({ smallCaps: true });
    expect(result.fontVariant).toBe("small-caps");
  });

  it("applies text color", () => {
    const result = computeRunStyles({ color: { val: "FF0000" } });
    expect(result.color).toBe("#FF0000");
  });

  it("applies font size from half-points", () => {
    const result = computeRunStyles({ sz: halfPoints(24) }); // 24 half-points = 12 points
    expect(result.fontSize).toBe("12pt");
  });

  it("applies font family", () => {
    const result = computeRunStyles({
      rFonts: { ascii: "Arial" },
    });
    expect(result.fontFamily).toBe("Arial");
  });

  it("applies highlight color", () => {
    const result = computeRunStyles({ highlight: "yellow" });
    expect(result.backgroundColor).toBe("#FFFF00");
  });

  it("applies superscript", () => {
    const result = computeRunStyles({ vertAlign: "superscript" });
    expect(result.verticalAlign).toBe("super");
  });

  it("applies subscript", () => {
    const result = computeRunStyles({ vertAlign: "subscript" });
    expect(result.verticalAlign).toBe("sub");
  });

  it("applies letter spacing", () => {
    const result = computeRunStyles({ spacing: twips(40) }); // 40 twips = 2 points
    expect(result.letterSpacing).toBe("2pt");
  });

  it("hides vanished text", () => {
    const result = computeRunStyles({ vanish: true });
    expect(result.display).toBe("none");
  });
});

// =============================================================================
// RunContentRenderer Tests
// =============================================================================

describe("RunContentRenderer", () => {
  it("renders text content", () => {
    render(<RunContentRenderer content={{ type: "text", value: "Hello" }} />);
    expect(screen.getByText("Hello")).toBeDefined();
  });

  it("renders tab as whitespace", () => {
    const { container } = render(
      <RunContentRenderer content={{ type: "tab" }} />
    );
    const span = container.querySelector("span");
    expect(span?.style.whiteSpace).toBe("pre");
  });

  it("renders break as br element", () => {
    const { container } = render(
      <RunContentRenderer content={{ type: "break" }} />
    );
    expect(container.querySelector("br")).not.toBeNull();
  });

  it("renders page break with page-break-after", () => {
    const { container } = render(
      <RunContentRenderer content={{ type: "break", breakType: "page" }} />
    );
    const span = container.querySelector("span");
    expect(span?.style.pageBreakAfter).toBe("always");
  });
});

// =============================================================================
// RunRenderer Tests
// =============================================================================

describe("RunRenderer", () => {
  it("renders simple text run", () => {
    const run = createTextRun("Hello World");
    render(<RunRenderer run={run} />);
    expect(screen.getByText("Hello World")).toBeDefined();
  });

  it("applies bold formatting", () => {
    const run = createTextRun("Bold text", { b: true });
    const { container } = render(<RunRenderer run={run} />);
    const span = container.querySelector("span");
    expect(span?.style.fontWeight).toBe("bold");
  });

  it("applies italic formatting", () => {
    const run = createTextRun("Italic text", { i: true });
    const { container } = render(<RunRenderer run={run} />);
    const span = container.querySelector("span");
    expect(span?.style.fontStyle).toBe("italic");
  });

  it("renders empty run as empty span", () => {
    const run: DocxRun = {
      type: "run",
      content: [],
    };
    const { container } = render(<RunRenderer run={run} />);
    expect(container.querySelector("span")).not.toBeNull();
  });

  it("renders multiple content items", () => {
    const run: DocxRun = {
      type: "run",
      content: [
        { type: "text", value: "Hello" },
        { type: "tab" },
        { type: "text", value: "World" },
      ],
    };
    const { container } = render(<RunRenderer run={run} />);
    // Text is split across elements, so check container text content
    expect(container.textContent).toContain("Hello");
    expect(container.textContent).toContain("World");
  });

  it("applies color from properties", () => {
    const run = createTextRun("Colored", { color: { val: "0000FF" } });
    const { container } = render(<RunRenderer run={run} />);
    const span = container.querySelector("span");
    expect(span?.style.color).toBe("rgb(0, 0, 255)");
  });
});
