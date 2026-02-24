/**
 * @file Tests for spatial grouping function
 */

import type { PdfText } from "../../../domain/text";
import { createDefaultGraphicsState } from "../../../domain/graphics-state";
import { createSpatialGrouping, spatialGrouping } from "../strategies/spatial-grouping";

describe("createSpatialGrouping", () => {
  const createPdfText = (overrides: Partial<PdfText> = {}): PdfText => ({
    type: "text",
    text: "Test",
    x: 0,
    y: 0,
    width: 50,
    height: 12,
    fontName: "Helvetica",
    fontSize: 12,
    graphicsState: createDefaultGraphicsState(),
    ...overrides,
  });

  describe("empty input", () => {
    it("returns empty array for empty input", () => {
      const groupFn = spatialGrouping;
      expect(groupFn([])).toEqual([]);
    });
  });

  describe("single text", () => {
    it("wraps single text in GroupedText", () => {
      const groupFn = spatialGrouping;
      const text = createPdfText({ text: "Hello", x: 10, y: 100 });

      const groups = groupFn([text]);

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs).toHaveLength(1);
      expect(groups[0].paragraphs[0].runs).toHaveLength(1);
      expect(groups[0].paragraphs[0].runs[0].text).toBe("Hello");
    });
  });

  describe("line grouping", () => {
    it("groups texts on the same Y coordinate into one paragraph", () => {
      const groupFn = spatialGrouping;
      const texts = [createPdfText({ text: "Hello", x: 0, y: 100 }), createPdfText({ text: "World", x: 60, y: 100 })];

      const groups = groupFn(texts);

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs).toHaveLength(1);
      expect(groups[0].paragraphs[0].runs).toHaveLength(2);
    });

    it("groups texts within Y tolerance into same paragraph", () => {
      const groupFn = createSpatialGrouping({ lineToleranceRatio: 0.2 });
      // fontSize = 12, tolerance = 12 * 0.2 = 2.4
      const texts = [
        createPdfText({ text: "Hello", x: 0, y: 100 }),
        createPdfText({ text: "World", x: 60, y: 102 }), // within tolerance
      ];

      const groups = groupFn(texts);

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs).toHaveLength(1);
    });

    it("separates texts beyond Y tolerance into different paragraphs", () => {
      const groupFn = createSpatialGrouping({ lineToleranceRatio: 0.2 });
      // fontSize = 12, tolerance = 12 * 0.2 = 2.4
      const texts = [
        createPdfText({ text: "Line1", x: 0, y: 100 }),
        createPdfText({ text: "Line2", x: 0, y: 90 }), // beyond tolerance
      ];

      const groups = groupFn(texts);

      // May be in same block but different paragraphs, or separate blocks
      const totalParagraphs = groups.reduce((sum, g) => sum + g.paragraphs.length, 0);
      expect(totalParagraphs).toBe(2);
    });
  });

  describe("horizontal grouping", () => {
    it("includes adjacent texts within horizontal gap ratio", () => {
      const groupFn = createSpatialGrouping({ horizontalGapRatio: 2.0 });
      // Width per text = 50, chars ~ 4 = avg 12.5 per char, max gap = 25
      const texts = [
        createPdfText({ text: "Hello", x: 0, y: 100, width: 50 }),
        createPdfText({ text: "World", x: 60, y: 100, width: 50 }), // gap = 10
      ];

      const groups = groupFn(texts);

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs[0].runs).toHaveLength(2);
    });

    it("excludes texts beyond horizontal gap ratio", () => {
      const groupFn = createSpatialGrouping({ horizontalGapRatio: 0.5 });
      // Very tight gap ratio
      const texts = [
        createPdfText({ text: "Hello", x: 0, y: 100, width: 50 }),
        createPdfText({ text: "World", x: 200, y: 100, width: 50 }), // gap = 150
      ];

      const groups = groupFn(texts);

      // Texts are too far apart, so only first run is included
      expect(groups[0].paragraphs[0].runs.length).toBeLessThanOrEqual(1);
    });

    it("sorts texts by X coordinate within a line", () => {
      const groupFn = spatialGrouping;
      const texts = [createPdfText({ text: "World", x: 60, y: 100 }), createPdfText({ text: "Hello", x: 0, y: 100 })];

      const groups = groupFn(texts);

      expect(groups[0].paragraphs[0].runs[0].text).toBe("Hello");
    });

    it("detects RTL scripts and sorts runs right-to-left", () => {
      const groupFn = spatialGrouping;
      const texts = [createPdfText({ text: "שלום", x: 120, y: 100 }), createPdfText({ text: "עולם", x: 60, y: 100 })];

      const groups = groupFn(texts);
      const paragraph = groups[0].paragraphs[0];

      expect(paragraph.inlineDirection).toBe("rtl");
      expect(paragraph.runs.map((r) => r.text).join(" ")).toBe("שלום עולם");
    });

    it("allows forcing inline direction", () => {
      const groupFn = createSpatialGrouping({ inlineDirection: "rtl" });
      const texts = [createPdfText({ text: "A", x: 10, y: 100 }), createPdfText({ text: "B", x: 40, y: 100 })];

      const groups = groupFn(texts);

      expect(groups[0].paragraphs[0].inlineDirection).toBe("rtl");
      expect(groups[0].paragraphs[0].runs.map((r) => r.text).join("")).toBe("BA");
    });

    it("does not split a line on a tiny spacer run artifact", () => {
      const groupFn = spatialGrouping;
      const texts = [
        createPdfText({ text: "我が国における少子高齢化", x: 106.8, y: 727.2, width: 129.3, height: 16.65, fontSize: 10.63 }),
        createPdfText({ text: " ", x: 107.0, y: 727.2, width: 3.5, height: 16.65, fontSize: 10.63 }),
        createPdfText({ text: "・人口減少は深刻化しており", x: 236.0, y: 727.2, width: 140.1, height: 16.65, fontSize: 10.63 }),
      ];

      const groups = groupFn(texts, { pageWidth: 595, pageHeight: 842 });

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs).toHaveLength(1);
    });
  });

  describe("vertical block merging", () => {
    it("merges adjacent lines with same font into one block", () => {
      const groupFn = createSpatialGrouping({ verticalGapRatio: 1.5 });
      const texts = [
        createPdfText({ text: "Line1", x: 0, y: 100, height: 12 }),
        createPdfText({ text: "Line2", x: 0, y: 84, height: 12 }), // gap = 4 < 18
      ];

      const groups = groupFn(texts);

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs).toHaveLength(2);
    });

    it("separates lines with large vertical gap into different blocks", () => {
      const groupFn = createSpatialGrouping({ verticalGapRatio: 0.5 });
      const texts = [
        createPdfText({ text: "Block1", x: 0, y: 100, height: 12 }),
        createPdfText({ text: "Block2", x: 0, y: 50, height: 12 }), // large gap
      ];

      const groups = groupFn(texts);

      expect(groups).toHaveLength(2);
    });
  });

  describe("font matching", () => {
    it("separates texts with different font names into different blocks", () => {
      const groupFn = spatialGrouping;
      const texts = [
        createPdfText({ text: "Normal", x: 0, y: 100, fontName: "Helvetica" }),
        createPdfText({
          text: "Bold",
          x: 0,
          y: 86,
          fontName: "Helvetica-Bold",
        }),
      ];

      const groups = groupFn(texts);

      expect(groups).toHaveLength(2);
    });

    it("separates texts with different font sizes into different blocks", () => {
      const groupFn = spatialGrouping;
      const texts = [
        createPdfText({ text: "Small", x: 0, y: 100, fontSize: 12, height: 12 }),
        createPdfText({ text: "Large", x: 0, y: 80, fontSize: 24, height: 24 }),
      ];

      const groups = groupFn(texts);

      expect(groups).toHaveLength(2);
    });

    it("keeps long aligned lines merged even when font names differ", () => {
      const groupFn = createSpatialGrouping({ verticalGapRatio: 1.5 });
      const texts = [
        createPdfText({
          text: "This is a long first line that should continue to the next one.",
          x: 20,
          y: 120,
          width: 320,
          height: 12,
          fontName: "TimesNewRomanPSMT",
          fontSize: 12,
        }),
        createPdfText({
          text: "And this long second line should stay in the same text block.",
          x: 20,
          y: 104,
          width: 318,
          height: 12,
          fontName: "Helvetica",
          fontSize: 12,
        }),
      ];

      const groups = groupFn(texts);

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs).toHaveLength(2);
    });

    it("groups texts with same font style (ignoring subset prefix)", () => {
      const groupFn = spatialGrouping;
      const texts = [
        createPdfText({
          text: "Line1",
          x: 0,
          y: 100,
          fontName: "ABCDEF+Helvetica",
        }),
        createPdfText({
          text: "Line2",
          x: 0,
          y: 86,
          fontName: "GHIJKL+Helvetica",
        }),
      ];

      const groups = groupFn(texts);

      expect(groups).toHaveLength(1);
    });

    it("allows small font size differences within tolerance", () => {
      const groupFn = spatialGrouping;
      const texts = [
        createPdfText({ text: "Line1", x: 0, y: 100, fontSize: 12 }),
        createPdfText({ text: "Line2", x: 0, y: 86, fontSize: 12.5 }), // 4% diff
      ];

      const groups = groupFn(texts);

      expect(groups).toHaveLength(1);
    });
  });

  describe("bounds calculation", () => {
    // Width includes 5% buffer to account for letter-spacing and font substitution
    const WIDTH_BUFFER_RATIO = 0.05;

    it("calculates correct bounds for single text", () => {
      const groupFn = spatialGrouping;
      const text = createPdfText({
        x: 10,
        y: 100,
        width: 50,
        height: 12,
      });

      const [group] = groupFn([text]);

      expect(group.bounds).toEqual({
        x: 10,
        y: 100,
        width: 50 * (1 + WIDTH_BUFFER_RATIO), // 52.5 with buffer
        height: 12,
      });
    });

    it("calculates correct bounds for multiple texts on same line", () => {
      const groupFn = spatialGrouping;
      const texts = [
        createPdfText({ x: 10, y: 100, width: 40, height: 12 }),
        createPdfText({ x: 60, y: 100, width: 50, height: 12 }),
      ];

      const [group] = groupFn(texts);

      expect(group.bounds).toEqual({
        x: 10,
        y: 100,
        width: 100 * (1 + WIDTH_BUFFER_RATIO), // 105 with buffer (base: 110 - 10)
        height: 12,
      });
    });

    it("calculates correct bounds for multi-line block", () => {
      const groupFn = createSpatialGrouping({ verticalGapRatio: 2.0 });
      const texts = [
        createPdfText({ x: 0, y: 100, width: 50, height: 12 }),
        createPdfText({ x: 0, y: 85, width: 80, height: 12 }),
      ];

      const [group] = groupFn(texts);

      expect(group.bounds.x).toBe(0);
      expect(group.bounds.y).toBe(85);
      expect(group.bounds.width).toBe(80 * (1 + WIDTH_BUFFER_RATIO)); // 84 with buffer
      expect(group.bounds.height).toBe(27); // 112 - 85
    });
  });

  describe("baselineY", () => {
    it("calculates baselineY from font metrics", () => {
      const groupFn = spatialGrouping;
      const texts = [
        createPdfText({ x: 0, y: 100, height: 12, fontSize: 12 }),
        createPdfText({ x: 60, y: 101, height: 12, fontSize: 12 }),
      ];

      const [group] = groupFn(texts);

      // Baseline calculation:
      // - First text y (bottom edge) = 100
      // - Default descender = -200 (1/1000 em units)
      // - fontSize = 12
      // - baseline = y - (descender * fontSize / 1000) = 100 - (-200 * 12 / 1000) = 102.4
      expect(group.paragraphs[0].baselineY).toBeCloseTo(102.4, 1);
    });

    it("uses fontMetrics descender when available", () => {
      const groupFn = spatialGrouping;
      const texts = [
        createPdfText({
          x: 0,
          y: 100,
          height: 12,
          fontSize: 12,
          fontMetrics: { ascender: 800, descender: -250 },
        }),
      ];

      const [group] = groupFn(texts);

      // baseline = y - (descender * fontSize / 1000) = 100 - (-250 * 12 / 1000) = 103
      expect(group.paragraphs[0].baselineY).toBeCloseTo(103, 1);
    });
  });

  describe("custom options", () => {
    it("respects custom lineToleranceRatio", () => {
      const groupFn = createSpatialGrouping({ lineToleranceRatio: 0.5 });
      // fontSize = 12, tolerance = 12 * 0.5 = 6
      const texts = [
        createPdfText({ text: "A", x: 0, y: 100 }),
        createPdfText({ text: "B", x: 60, y: 105 }), // within 6
      ];

      const groups = groupFn(texts);

      expect(groups[0].paragraphs).toHaveLength(1);
    });

    it("respects custom verticalGapRatio", () => {
      const groupFn = createSpatialGrouping({ verticalGapRatio: 3.0 });
      const texts = [
        createPdfText({ x: 0, y: 100, height: 12 }),
        createPdfText({ x: 0, y: 60, height: 12 }), // gap = 28 < 36
      ];

      const groups = groupFn(texts);

      expect(groups).toHaveLength(1);
    });
  });

  describe("blocking zones", () => {
    it("blocks grouping when a zone is between two texts", () => {
      const groupFn = spatialGrouping;
      const texts = [
        createPdfText({ text: "Left", x: 0, y: 100, width: 40 }),
        createPdfText({ text: "Right", x: 100, y: 100, width: 40 }),
      ];

      // Zone between texts at x=50-80
      const blockingZones = [{ x: 50, y: 90, width: 30, height: 30 }];

      const groups = groupFn(texts, { blockingZones });

      // Should be separated by blocking zone
      expect(groups).toHaveLength(2);
    });

    it("does not block grouping for a thin vertical rule on a very tight inline gap", () => {
      const groupFn = createSpatialGrouping({ horizontalGapRatio: 3.0 });
      const texts = [
        createPdfText({ text: "Left", x: 0, y: 100, width: 40, height: 10, fontSize: 10 }),
        createPdfText({ text: "Right", x: 41, y: 100, width: 50, height: 10, fontSize: 10 }),
      ];

      // Thin/tall rule in the 1pt gap should not split a continuous sentence line.
      const blockingZones = [{ x: 40.2, y: 94, width: 0.8, height: 18 }];

      const groups = groupFn(texts, { blockingZones });

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs[0]?.runs.map((run) => run.text).join("")).toBe("LeftRight");
    });

    it("does not block grouping for a thin horizontal rule on a very tight inline gap", () => {
      const groupFn = createSpatialGrouping({ horizontalGapRatio: 3.0 });
      const texts = [
        createPdfText({ text: "Left", x: 0, y: 100, width: 40, height: 10, fontSize: 10 }),
        createPdfText({ text: "Right", x: 41, y: 100, width: 50, height: 10, fontSize: 10 }),
      ];

      // Thin horizontal rule crossing the gap should not split a continuous sentence line.
      const blockingZones = [{ x: 0, y: 99.8, width: 100, height: 0.3 }];

      const groups = groupFn(texts, { blockingZones });

      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs[0]?.runs.map((run) => run.text).join("")).toBe("LeftRight");
    });

    it("does NOT block grouping when texts are ON the same container zone", () => {
      const groupFn = spatialGrouping;
      const texts = [
        createPdfText({ text: "Left", x: 10, y: 100, width: 40 }),
        createPdfText({ text: "Right", x: 60, y: 100, width: 40 }),
      ];

      // Large container zone that contains both texts (like a background rectangle)
      const blockingZones = [{ x: 0, y: 80, width: 200, height: 50 }];

      const groups = groupFn(texts, { blockingZones });

      // Should be grouped together (both are on the same background)
      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs[0].runs).toHaveLength(2);
    });

    it("does NOT block vertical merging when lines are ON the same container zone", () => {
      const groupFn = createSpatialGrouping({ verticalGapRatio: 2.0 });
      const texts = [
        createPdfText({ text: "Line1", x: 10, y: 100, width: 80, height: 12 }),
        createPdfText({ text: "Line2", x: 10, y: 85, width: 80, height: 12 }),
      ];

      // Large container zone that contains both lines
      const blockingZones = [{ x: 0, y: 70, width: 200, height: 60 }];

      const groups = groupFn(texts, { blockingZones });

      // Should be in same block (both are on the same background)
      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs).toHaveLength(2);
    });

    it("blocks vertical merging when a zone is between two lines", () => {
      const groupFn = createSpatialGrouping({ verticalGapRatio: 3.0 });
      const texts = [
        createPdfText({ text: "Line1", x: 10, y: 120, width: 80, height: 12 }),
        createPdfText({ text: "Line2", x: 10, y: 80, width: 80, height: 12 }),
      ];

      // Zone between lines (at y=95-105)
      const blockingZones = [{ x: 0, y: 95, width: 200, height: 10 }];

      const groups = groupFn(texts, { blockingZones });

      // Should be separated
      expect(groups).toHaveLength(2);
    });

    it("pre-splits by vertical ruling when run boxes overlap across a column divider", () => {
      const groupFn = createSpatialGrouping({
        enableColumnSeparation: false,
        verticalGapRatio: 2.0,
      });
      const texts = [
        createPdfText({ text: "L1", x: 10, y: 100, width: 40 }),
        createPdfText({ text: "R1", x: 45, y: 100, width: 40 }), // overlaps L1 box
        createPdfText({ text: "L2", x: 10, y: 84, width: 40 }),
        createPdfText({ text: "R2", x: 45, y: 84, width: 40 }), // overlaps L2 box
      ];

      // Thin vertical rule between logical left/right columns.
      const blockingZones = [{ x: 42, y: 70, width: 1, height: 50 }];
      const groups = groupFn(texts, {
        blockingZones,
        pageWidth: 100,
        pageHeight: 130,
      });

      const groupTexts = groups
        .map((group) => group.paragraphs.flatMap((paragraph) => paragraph.runs.map((run) => run.text)).join(""))
        .sort();

      expect(groups).toHaveLength(2);
      expect(groupTexts).toEqual(["L1L2", "R1R2"]);
    });

    it("does not pre-split when the ruling segment is too short", () => {
      const groupFn = createSpatialGrouping({
        enableColumnSeparation: false,
        verticalGapRatio: 2.0,
      });
      const texts = [
        createPdfText({ text: "L1", x: 10, y: 100, width: 40 }),
        createPdfText({ text: "R1", x: 45, y: 100, width: 40 }),
        createPdfText({ text: "L2", x: 10, y: 84, width: 40 }),
        createPdfText({ text: "R2", x: 45, y: 84, width: 40 }),
      ];

      // Short segment near one row only; should not be treated as page-level divider.
      const blockingZones = [{ x: 42, y: 96, width: 1, height: 8 }];
      const groups = groupFn(texts, {
        blockingZones,
        pageWidth: 100,
        pageHeight: 130,
      });

      const groupTexts = groups
        .map((group) => group.paragraphs.flatMap((paragraph) => paragraph.runs.map((run) => run.text)).join(""))
        .sort();

      expect(groups).toHaveLength(2);
      expect(groupTexts).toEqual(["L1R1", "L2R2"]);
    });

    it("does not apply vertical ruling cuts to text lines outside the ruling span", () => {
      const groupFn = createSpatialGrouping({
        enableColumnSeparation: false,
        verticalGapRatio: 2.0,
      });
      const texts = [
        createPdfText({ text: "LTitle", x: 10, y: 130, width: 40 }),
        createPdfText({ text: "RTitle", x: 45, y: 130, width: 40 }),
        createPdfText({ text: "L1", x: 10, y: 100, width: 40 }),
        createPdfText({ text: "R1", x: 45, y: 100, width: 40 }),
        createPdfText({ text: "L2", x: 10, y: 84, width: 40 }),
        createPdfText({ text: "R2", x: 45, y: 84, width: 40 }),
      ];

      // Vertical rule only spans y=70..120 (table-like area), not the title line at y=130.
      const blockingZones = [{ x: 42, y: 70, width: 1, height: 50 }];
      const groups = groupFn(texts, {
        blockingZones,
        pageWidth: 100,
        pageHeight: 160,
      });

      const groupTexts = groups
        .map((group) => group.paragraphs.flatMap((paragraph) => paragraph.runs.map((run) => run.text)).join(""))
        .sort();

      expect(groups).toHaveLength(3);
      expect(groupTexts).toEqual(["L1L2", "LTitleRTitle", "R1R2"]);
    });

    it("does not merge prose line with ruled-table region line when no direct separator line exists", () => {
      const groupFn = createSpatialGrouping({
        enableColumnSeparation: false,
        verticalGapRatio: 2.5,
      });
      const texts = [
        createPdfText({ text: "PROSE", x: 20, y: 123, width: 110, height: 10, fontSize: 10 }),
        createPdfText({ text: "H1", x: 22, y: 107, width: 30, height: 10, fontSize: 10 }),
        createPdfText({ text: "H2", x: 85, y: 107, width: 30, height: 10, fontSize: 10 }),
        createPdfText({ text: "R1", x: 22, y: 95, width: 30, height: 10, fontSize: 10 }),
        createPdfText({ text: "R2", x: 85, y: 95, width: 30, height: 10, fontSize: 10 }),
      ];

      // Grid-like ruled region below prose. No horizontal rule between PROSE and header row.
      const blockingZones = [
        { x: 10, y: 90, width: 1, height: 30 },
        { x: 80, y: 90, width: 1, height: 30 },
        { x: 150, y: 90, width: 1, height: 30 },
        { x: 10, y: 100, width: 140, height: 1 },
        { x: 10, y: 90, width: 140, height: 1 },
      ];

      const groups = groupFn(texts, {
        blockingZones,
        pageWidth: 180,
        pageHeight: 180,
      });

      const groupTexts = groups.map((group) => group.paragraphs.flatMap((paragraph) => paragraph.runs.map((run) => run.text)).join(""));
      expect(groupTexts.some((text) => text.includes("PROSE") && text.includes("H1"))).toBe(false);
    });
  });

  describe("baseline-aware line grouping", () => {
    it("groups texts with the same baseline even if bottom-edge Y differs", () => {
      const groupFn = createSpatialGrouping({ enableColumnSeparation: false, lineToleranceRatio: 0.25 });

      // baseline = y - descender * fontSize / 1000
      // t1: y=100, desc=-200, font=10 => baseline=102
      // t2: y=99,  desc=-300, font=10 => baseline=102
      const texts = [
        createPdfText({
          text: "A",
          x: 0,
          y: 100,
          width: 10,
          height: 10,
          fontSize: 10,
          fontMetrics: { ascender: 800, descender: -200 },
        }),
        createPdfText({
          text: "B",
          x: 20,
          y: 99,
          width: 10,
          height: 10,
          fontSize: 10,
          fontMetrics: { ascender: 800, descender: -300 },
        }),
      ];

      const groups = groupFn(texts);
      expect(groups).toHaveLength(1);
      expect(groups[0].paragraphs).toHaveLength(1);
      expect(groups[0].paragraphs[0].runs.map((r) => r.text).join("")).toBe("AB");
    });
  });

  describe("page-level column detection", () => {
    it("avoids cross-column block merging even when bboxes slightly overlap", () => {
      const groupFn = createSpatialGrouping({
        enableColumnSeparation: true,
        enablePageColumnDetection: true,
        maxPageColumns: 2,
      });

      const pageWidth = 500;

      const makeLine = ({ prefix, x, y, width }: { prefix: string; x: number; y: number; width: number }): PdfText => {
        return createPdfText({ text: `${prefix}-${"x".repeat(40)}`, x, y, width, height: 12, fontSize: 12 });
      };

      const texts: PdfText[] = [];

      // Build 5 rows; each row has a left and right column element on the same baseline.
      // One left element intentionally has an overly-wide bbox that spills into the gutter.
      for (let row = 0; row < 5; row++) {
        const y = 500 - row * 16;
        const spill = row === 2 ? 320 : 240; // one row intentionally overlaps the gutter

        texts.push(makeLine({ prefix: `L${row}`, x: 0, y, width: spill }));
        texts.push(makeLine({ prefix: `R${row}`, x: 300, y, width: 180 }));
      }

      const groups = groupFn(texts, { pageWidth });

      // Expect the left column content and right column content to end up in separate text boxes.
      expect(groups.length).toBeGreaterThanOrEqual(2);

      const contents = groups.map((g) => g.paragraphs.map((p) => p.runs.map((r) => r.text).join("")).join("\n"));

      const leftGroup = contents.find((c) => c.includes("L0") && c.includes("L4"));
      const rightGroup = contents.find((c) => c.includes("R0") && c.includes("R4"));

      expect(leftGroup).toBeDefined();
      expect(rightGroup).toBeDefined();
    });

    it("does not split touching two-item heading lines under page-column mode", () => {
      const groupFn = createSpatialGrouping({
        enableColumnSeparation: true,
        enablePageColumnDetection: true,
        maxPageColumns: 2,
      });

      const pageWidth = 500;
      const texts: PdfText[] = [];

      for (let row = 0; row < 5; row++) {
        const y = 500 - row * 16;
        texts.push(createPdfText({ text: `L${row}-${"x".repeat(30)}`, x: 0, y, width: 220, height: 12, fontSize: 12 }));
        texts.push(createPdfText({ text: `R${row}-${"x".repeat(30)}`, x: 300, y, width: 180, height: 12, fontSize: 12 }));
      }

      // Heading-like two-item line with no visible gap between runs.
      texts.push(createPdfText({ text: "HDR-L", x: 80, y: 560, width: 24, height: 12, fontSize: 12 }));
      texts.push(createPdfText({ text: "HDR-R", x: 104, y: 560, width: 170, height: 12, fontSize: 12 }));

      const groups = groupFn(texts, { pageWidth });
      const contents = groups.map((group) => group.paragraphs.map((paragraph) => paragraph.runs.map((run) => run.text).join("")).join("\n"));
      const headingGroup = contents.find((content) => content.includes("HDR-L") && content.includes("HDR-R"));

      expect(headingGroup).toBeDefined();
    });

    it("falls back to sequential merge when no effective page columns are detected", () => {
      const groupFn = createSpatialGrouping({
        enableColumnSeparation: true,
        enablePageColumnDetection: true,
        maxPageColumns: 3,
      });

      const pageWidth = 700;
      const texts: PdfText[] = [
        createPdfText({ text: "TITLE", x: 120, y: 600, width: 420, height: 12, fontSize: 12 }),
        createPdfText({ text: "SUBTITLE-WIDE", x: 30, y: 584, width: 640, height: 12, fontSize: 12 }),
        createPdfText({ text: "BODY", x: 30, y: 548, width: 640, height: 12, fontSize: 12 }),
      ];

      const groups = groupFn(texts, { pageWidth });
      const contents = groups.map((group) => group.paragraphs.map((paragraph) => paragraph.runs.map((run) => run.text).join("")).join("\n"));
      const headingGroup = contents.find((content) => content.includes("TITLE"));

      expect(headingGroup).toBeDefined();
      expect(headingGroup).toContain("SUBTITLE-WIDE");
      expect(headingGroup?.includes("BODY")).toBe(false);
    });
  });

  describe("layout inference", () => {
    it("infers centered text layout for multi-line centered content", () => {
      const groupFn = createSpatialGrouping({ enableColumnSeparation: false, verticalGapRatio: 2.0 });
      const texts = [
        createPdfText({ text: "Top", x: 150, y: 120, width: 100 }),
        createPdfText({ text: "Mid", x: 170, y: 104, width: 60 }),
        createPdfText({ text: "Bottom", x: 130, y: 88, width: 140 }),
      ];

      const groups = groupFn(texts);
      const inference = groups[0].layoutInference;
      const contentWidth = Math.max(...texts.map((t) => t.x + t.width)) - Math.min(...texts.map((t) => t.x));

      expect(inference).toBeDefined();
      expect(inference?.alignment).toBe("center");
      expect((inference?.confidence ?? 0) > 0.3).toBe(true);
      expect((inference?.estimatedBounds.width ?? 0) >= contentWidth).toBe(true);
    });

    it("infers right alignment for RTL multi-line text", () => {
      const groupFn = createSpatialGrouping({ enableColumnSeparation: false, verticalGapRatio: 2.0 });
      const texts = [
        createPdfText({ text: "שלום", x: 210, y: 120, width: 50 }),
        createPdfText({ text: "עולם", x: 230, y: 104, width: 30 }),
      ];

      const groups = groupFn(texts);
      const inference = groups[0].layoutInference;

      expect(inference).toBeDefined();
      expect(inference?.inlineDirection).toBe("rtl");
      expect(inference?.alignment).toBe("right");
    });
  });
});
