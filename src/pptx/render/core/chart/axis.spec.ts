/**
 * @file Tests for chart axis utilities
 *
 * @see ECMA-376 Part 1, Section 21.2.2.25 (catAx)
 * @see ECMA-376 Part 1, Section 21.2.2.226 (valAx)
 * @see ECMA-376 Part 1, Section 21.2.2.90 (logBase)
 */

import {
  isLogScale,
  toLogPosition,
  calculateMajorUnit,
  renderMinorGridlines,
  renderAxisTitles,
  formatDateLabel,
  renderMultiLevelCategoryAxisLabels,
} from "./axis";
import type { ValueAxis, CategoryAxis } from "../../../domain/chart";
import type { TextBody, BodyProperties, ParagraphProperties } from "../../../domain/text";
import type { MultiLevelCategories } from "./data";
import { pt, px } from "../../../domain/types";

describe("axis utilities", () => {
  describe("calculateMajorUnit", () => {
    it("calculates appropriate major unit for range 0-100", () => {
      const unit = calculateMajorUnit(100);
      expect(unit).toBe(20); // ~5 gridlines
    });

    it("calculates appropriate major unit for range 0-1000", () => {
      const unit = calculateMajorUnit(1000);
      expect(unit).toBe(200);
    });

    it("calculates appropriate major unit for small ranges", () => {
      const unit = calculateMajorUnit(10);
      expect(unit).toBe(2);
    });
  });

  describe("isLogScale - ECMA-376 21.2.2.90", () => {
    it("returns false when axis is undefined", () => {
      expect(isLogScale(undefined)).toBe(false);
    });

    it("returns false when logBase is not specified", () => {
      const axis: ValueAxis = {
        type: "valAx",
        id: 1,
        position: "l",
        orientation: "minMax",
        majorTickMark: "out",
        minorTickMark: "none",
        tickLabelPosition: "nextTo",
        crossAxisId: 2,
      };
      expect(isLogScale(axis)).toBe(false);
    });

    it("returns true when logBase is specified", () => {
      const axis: ValueAxis = {
        type: "valAx",
        id: 1,
        position: "l",
        orientation: "minMax",
        majorTickMark: "out",
        minorTickMark: "none",
        tickLabelPosition: "nextTo",
        crossAxisId: 2,
        logBase: 10,
      };
      expect(isLogScale(axis)).toBe(true);
    });

    it("returns false when logBase is 0", () => {
      const axis: ValueAxis = {
        type: "valAx",
        id: 1,
        position: "l",
        orientation: "minMax",
        majorTickMark: "out",
        minorTickMark: "none",
        tickLabelPosition: "nextTo",
        crossAxisId: 2,
        logBase: 0,
      };
      expect(isLogScale(axis)).toBe(false);
    });
  });

  describe("toLogPosition - ECMA-376 21.2.2.90", () => {
    it("maps minimum value to 0 position", () => {
      // minVal = 1, maxVal = 1000, log10 range = 0 to 3
      const pos = toLogPosition(1, 1, 1000, 10, 300);
      expect(pos).toBeCloseTo(0, 5);
    });

    it("maps maximum value to chart size position", () => {
      const pos = toLogPosition(1000, 1, 1000, 10, 300);
      expect(pos).toBeCloseTo(300, 5);
    });

    it("maps middle value correctly for log10 scale", () => {
      // value = 10 with range [1, 1000]
      // log10(1) = 0, log10(10) = 1, log10(1000) = 3
      // position should be 1/3 of chart height
      const pos = toLogPosition(10, 1, 1000, 10, 300);
      expect(pos).toBeCloseTo(100, 5); // 300 * (1/3) = 100
    });

    it("maps value at 100 correctly for log10 scale", () => {
      // value = 100 with range [1, 1000]
      // log10(100) = 2, log10(1000) = 3
      // position should be 2/3 of chart height
      const pos = toLogPosition(100, 1, 1000, 10, 300);
      expect(pos).toBeCloseTo(200, 5); // 300 * (2/3) = 200
    });

    it("handles base 2 logarithms", () => {
      // value = 4 with range [1, 16], base = 2
      // log2(1) = 0, log2(4) = 2, log2(16) = 4
      // position should be 2/4 = 0.5 of chart height
      const pos = toLogPosition(4, 1, 16, 2, 200);
      expect(pos).toBeCloseTo(100, 5); // 200 * 0.5 = 100
    });

    it("handles natural logarithm (base e)", () => {
      const e = Math.E;
      // value = e with range [1, e^2]
      // ln(1) = 0, ln(e) = 1, ln(e^2) = 2
      // position should be 0.5 of chart height
      const pos = toLogPosition(e, 1, e * e, e, 200);
      expect(pos).toBeCloseTo(100, 5);
    });
  });

  describe("renderMinorGridlines - ECMA-376 21.2.2.99", () => {
    const createValueAxis = (overrides: Partial<ValueAxis> = {}): ValueAxis => ({
      type: "valAx",
      id: 1,
      position: "l",
      orientation: "minMax",
      majorTickMark: "out",
      minorTickMark: "none",
      tickLabelPosition: "nextTo",
      crossAxisId: 2,
      ...overrides,
    });

    it("returns empty string when no minor gridlines defined", () => {
      const axis = createValueAxis();
      const result = renderMinorGridlines([axis], 300, 200, { minVal: 0, maxVal: 100 });
      expect(result).toBe("");
    });

    it("renders minor gridlines for linear scale", () => {
      const axis = createValueAxis({ minorGridlines: {} });
      const result = renderMinorGridlines([axis], 300, 200, { minVal: 0, maxVal: 100 });
      expect(result).toContain("<line");
      expect(result).toContain('stroke="#eee"');
      expect(result).toContain('stroke-width="0.5"');
    });

    it("renders minor gridlines for log scale base 10", () => {
      // For log10 with range [1, 100], minor gridlines at 2-9 and 20-90
      const axis = createValueAxis({
        minorGridlines: {},
        logBase: 10,
      });
      const result = renderMinorGridlines([axis], 300, 200, { minVal: 1, maxVal: 100 });
      expect(result).toContain("<line");
      expect(result).toContain('stroke="#eee"');
      // Should have multiple minor gridlines (8 between 1-10, 8 between 10-100)
      const match = result.match(/<line/g);
      const lineCount = match ? match.length : 0;
      expect(lineCount).toBeGreaterThan(10);
    });

    it("renders minor gridlines for log scale base 2", () => {
      const axis = createValueAxis({
        minorGridlines: {},
        logBase: 2,
      });
      const result = renderMinorGridlines([axis], 300, 200, { minVal: 1, maxVal: 16 });
      expect(result).toContain("<line");
      // For base 2, minor gridlines at 1.5, 3, 6, 12
      const match = result.match(/<line/g);
      const lineCount = match ? match.length : 0;
      expect(lineCount).toBeGreaterThan(0);
    });

    it("returns empty string when axis is deleted", () => {
      const axis = createValueAxis({
        minorGridlines: {},
        delete: true,
      });
      const result = renderMinorGridlines([axis], 300, 200, { minVal: 0, maxVal: 100 });
      expect(result).toBe("");
    });
  });

  describe("renderAxisTitles - ECMA-376 21.2.2.211 (title) with c:txPr", () => {
    const createValueAxis = (overrides: Partial<ValueAxis> = {}): ValueAxis => ({
      type: "valAx",
      id: 1,
      position: "l",
      orientation: "minMax",
      majorTickMark: "out",
      minorTickMark: "none",
      tickLabelPosition: "nextTo",
      crossAxisId: 2,
      ...overrides,
    });

    const createCategoryAxis = (overrides: Partial<CategoryAxis> = {}): CategoryAxis => ({
      type: "catAx",
      id: 2,
      position: "b",
      orientation: "minMax",
      majorTickMark: "out",
      minorTickMark: "none",
      tickLabelPosition: "nextTo",
      crossAxisId: 1,
      ...overrides,
    });

    const createBodyProperties = (): BodyProperties => ({
      verticalType: "horz",
      wrapping: "none",
      anchor: "top",
      anchorCenter: false,
      overflow: "overflow",
      verticalOverflow: "overflow",
      autoFit: { type: "none" },
      insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
    });

    const createParagraphProperties = (): ParagraphProperties => ({
      level: 0,
      alignment: "left",
    });

    const createTextBody = (fontSize?: number, bold?: boolean): TextBody => ({
      bodyProperties: createBodyProperties(),
      paragraphs: [
        {
          properties: {
            ...createParagraphProperties(),
            defaultRunProperties: {
              fontSize: pt(fontSize ?? 12),
              bold: bold ?? false,
            },
          },
          runs: [{ type: "text", text: "Title Text" }],
        },
      ],
    });

    it("applies font size from c:txPr defRPr (ECMA-376 21.2.2.217)", () => {
      const axis = createValueAxis({
        title: {
          textBody: createTextBody(14, false),
        },
      });
      const result = renderAxisTitles([axis], 300, 200);
      expect(result).toContain('font-size="14"');
      expect(result).toContain("Title Text");
    });

    it("applies bold styling from c:txPr defRPr", () => {
      const axis = createValueAxis({
        title: {
          textBody: createTextBody(12, true),
        },
      });
      const result = renderAxisTitles([axis], 300, 200);
      expect(result).toContain('font-weight="bold"');
    });

    it("renders category axis title with styling", () => {
      const axis = createCategoryAxis({
        title: {
          textBody: createTextBody(16, false),
        },
      });
      const result = renderAxisTitles([axis], 300, 200);
      expect(result).toContain('font-size="16"');
      expect(result).toContain("Title Text");
    });

    it("uses default font when no textBody is provided", () => {
      const axis = createValueAxis({
        title: {
          textBody: {
            bodyProperties: createBodyProperties(),
            paragraphs: [
              {
                properties: createParagraphProperties(),
                runs: [{ type: "text", text: "Simple Title" }],
              },
            ],
          },
        },
      });
      const result = renderAxisTitles([axis], 300, 200);
      // Should use default chart font size (9pt from text-props.ts)
      expect(result).toContain('font-size="9"');
      expect(result).toContain("Simple Title");
    });

    it("returns empty string when axis is deleted", () => {
      const axis = createValueAxis({
        title: {
          textBody: createTextBody(12, false),
        },
        delete: true,
      });
      const result = renderAxisTitles([axis], 300, 200);
      expect(result).toBe("");
    });
  });
});

describe("formatDateLabel (ECMA-376 21.2.2.14 baseTimeUnit)", () => {
  it("returns string as-is when not a valid date", () => {
    const result = formatDateLabel("Category A", "days");
    expect(result).toBe("Category A");
  });

  it("formats date string with years time unit", () => {
    const result = formatDateLabel("2024-06-15", "years");
    expect(result).toBe("2024");
  });

  it("formats date string with months time unit", () => {
    const result = formatDateLabel("2024-06-15", "months");
    expect(result).toBe("Jun 2024");
  });

  it("formats date string with days time unit", () => {
    const result = formatDateLabel("2024-06-15", "days");
    expect(result).toBe("Jun 15, 2024");
  });

  it("formats timestamp with years time unit", () => {
    // June 15, 2024 timestamp in ms
    const timestamp = new Date(2024, 5, 15).getTime();
    const result = formatDateLabel(timestamp, "years");
    expect(result).toBe("2024");
  });

  it("uses days format as default when timeUnit is undefined", () => {
    const result = formatDateLabel("2024-01-20", undefined);
    expect(result).toBe("Jan 20, 2024");
  });
});

describe("renderMultiLevelCategoryAxisLabels (ECMA-376 21.2.2.102 multiLvlStrRef)", () => {
  const createCategoryAxis = (overrides: Partial<CategoryAxis> = {}): CategoryAxis => ({
    type: "catAx",
    id: 2,
    position: "b",
    orientation: "minMax",
    majorTickMark: "out",
    minorTickMark: "none",
    tickLabelPosition: "nextTo",
    crossAxisId: 1,
    ...overrides,
  });

  it("returns empty string when axis is deleted", () => {
    const axis = createCategoryAxis({ delete: true });
    const multiLevel: MultiLevelCategories = {
      count: 4,
      levels: [{ labels: { "0": "Q1", "1": "Q2", "2": "Q3", "3": "Q4" } }, { labels: { "0": "2023", "2": "2024" } }],
    };
    const result = renderMultiLevelCategoryAxisLabels([axis], 400, 200, multiLevel);
    expect(result).toBe("");
  });

  it("returns empty string when tickLabelPosition is none", () => {
    const axis = createCategoryAxis({ tickLabelPosition: "none" });
    const multiLevel: MultiLevelCategories = {
      count: 4,
      levels: [{ labels: { "0": "Q1", "1": "Q2", "2": "Q3", "3": "Q4" } }],
    };
    const result = renderMultiLevelCategoryAxisLabels([axis], 400, 200, multiLevel);
    expect(result).toBe("");
  });

  it("renders level 0 (innermost) labels as regular category labels", () => {
    const axis = createCategoryAxis();
    const multiLevel: MultiLevelCategories = {
      count: 4,
      levels: [{ labels: { "0": "Q1", "1": "Q2", "2": "Q3", "3": "Q4" } }],
    };
    const result = renderMultiLevelCategoryAxisLabels([axis], 400, 200, multiLevel);
    expect(result).toContain("Q1");
    expect(result).toContain("Q2");
    expect(result).toContain("Q3");
    expect(result).toContain("Q4");
    expect(result).toContain("<text");
  });

  it("renders level 1 (outer) labels with grouping brackets", () => {
    const axis = createCategoryAxis();
    const multiLevel: MultiLevelCategories = {
      count: 4,
      levels: [{ labels: { "0": "Q1", "1": "Q2", "2": "Q3", "3": "Q4" } }, { labels: { "0": "2023", "2": "2024" } }],
    };
    const result = renderMultiLevelCategoryAxisLabels([axis], 400, 200, multiLevel);
    // Should contain level 0 labels
    expect(result).toContain("Q1");
    expect(result).toContain("Q2");
    // Should contain level 1 labels
    expect(result).toContain("2023");
    expect(result).toContain("2024");
    // Should contain bracket lines for grouping
    expect(result).toContain("<line");
  });

  it("handles sparse labels in outer levels", () => {
    const axis = createCategoryAxis();
    const multiLevel: MultiLevelCategories = {
      count: 6,
      levels: [
        { labels: { "0": "Jan", "1": "Feb", "2": "Mar", "3": "Apr", "4": "May", "5": "Jun" } },
        { labels: { "0": "Q1", "3": "Q2" } }, // Q1 spans 0-2, Q2 spans 3-5
      ],
    };
    const result = renderMultiLevelCategoryAxisLabels([axis], 600, 200, multiLevel);
    expect(result).toContain("Q1");
    expect(result).toContain("Q2");
  });

  it("returns empty string when count is 0", () => {
    const axis = createCategoryAxis();
    const multiLevel: MultiLevelCategories = {
      count: 0,
      levels: [],
    };
    const result = renderMultiLevelCategoryAxisLabels([axis], 400, 200, multiLevel);
    expect(result).toBe("");
  });

  it("returns empty string when levels array is empty", () => {
    const axis = createCategoryAxis();
    const multiLevel: MultiLevelCategories = {
      count: 4,
      levels: [],
    };
    const result = renderMultiLevelCategoryAxisLabels([axis], 400, 200, multiLevel);
    expect(result).toBe("");
  });
});
