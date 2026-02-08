/**
 * @file Integration tests for PPT → PPTX conversion
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { convert } from "./index";
import { parsePptWithReport } from "@aurochs-office/ppt";

const __dirname = dirname(fileURLToPath(import.meta.url));
const casesDir = resolve(__dirname, "../cases");

function readFixture(caseId: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(casesDir, caseId, "ref.ppt")));
}

function parseFixture(caseId: string) {
  return parsePptWithReport(readFixture(caseId), { mode: "lenient" });
}

function allText(report: ReturnType<typeof parsePptWithReport>, slideIdx = 0): string {
  return report.presentation.slides[slideIdx].shapes
    .flatMap((s) => s.textBody?.paragraphs ?? [])
    .flatMap((p) => p.runs)
    .map((r) => r.text)
    .join("");
}

describe("ppt-to-pptx", () => {
  // ==========================================================================
  // Phase 1: Skeleton
  // ==========================================================================
  describe("000_blank", () => {
    it("converts without error", () => {
      expect(convert(readFixture("000_blank")).data).toBeDefined();
    });

    it("produces 1 slide", () => {
      expect(parseFixture("000_blank").presentation.slides.length).toBe(1);
    });

    it("has correct slide size (13.333×7.5 inches)", () => {
      const { slideSize } = parseFixture("000_blank").presentation;
      expect(Math.abs(slideSize.widthEmu - 12192000)).toBeLessThan(120000);
      expect(Math.abs(slideSize.heightEmu - 6858000)).toBeLessThan(70000);
    });

    it("ZIP contains expected files", () => {
      const files = convert(readFixture("000_blank")).data.listFiles();
      expect(files).toContain("[Content_Types].xml");
      expect(files).toContain("_rels/.rels");
      expect(files).toContain("ppt/presentation.xml");
      expect(files).toContain("ppt/slides/slide1.xml");
    });

    it("contains baseline text", () => {
      expect(allText(parseFixture("000_blank"))).toContain("blank baseline");
    });
  });

  // ==========================================================================
  // Phase 2: Text
  // ==========================================================================
  describe("010_text_basic", () => {
    it("has 2 shapes with text", () => {
      const r = parseFixture("010_text_basic");
      const shapes = r.presentation.slides[0].shapes;
      expect(shapes.length).toBe(2);
      expect(shapes.filter((s) => s.textBody).length).toBe(2);
    });

    it("extracts title text", () => {
      expect(allText(parseFixture("010_text_basic"))).toContain("Text: runs & styles");
    });

    it("extracts styled runs (bold/italic/underline/color)", () => {
      const text = allText(parseFixture("010_text_basic"));
      expect(text).toContain("Bold");
      expect(text).toContain("Italic");
      expect(text).toContain("Underline");
      expect(text).toContain("Color");
    });

    it("extracts font sizes", () => {
      const text = allText(parseFixture("010_text_basic"));
      expect(text).toContain("12");
      expect(text).toContain("24");
      expect(text).toContain("36");
    });

    it("extracts Japanese text and emoji", () => {
      const text = allText(parseFixture("010_text_basic"));
      expect(text).toContain("日本語テキスト");
      expect(text).toContain("Emoji");
    });

    it("produces valid PPTX", () => {
      const pkg = convert(readFixture("010_text_basic")).data;
      const slideXml = pkg.readText("ppt/slides/slide1.xml");
      expect(slideXml).toContain("<a:t>");
    });
  });

  describe("011_text_bullets", () => {
    it("extracts bullet text", () => {
      const text = allText(parseFixture("011_text_bullets"));
      expect(text).toContain("Level 0 - item A");
      expect(text).toContain("Level 1 - sub 1");
    });

    it("produces valid PPTX", () => {
      expect(convert(readFixture("011_text_bullets")).data).toBeDefined();
    });
  });

  describe("080_multislide", () => {
    it("has 3 slides", () => {
      expect(parseFixture("080_multislide").presentation.slides.length).toBe(3);
    });

    it("slide 1 has title", () => {
      expect(allText(parseFixture("080_multislide"), 0)).toContain("Multi-slide: 1/3");
    });

    it("slide 2 has text box", () => {
      expect(allText(parseFixture("080_multislide"), 1)).toContain("Slide 2 text box");
    });

    it("slide 3 has title", () => {
      expect(allText(parseFixture("080_multislide"), 2)).toContain("Multi-slide: 3/3");
    });

    it("slide 3 has image", () => {
      const shapes = parseFixture("080_multislide").presentation.slides[2].shapes;
      expect(shapes.some((s) => s.picture)).toBe(true);
    });
  });

  // ==========================================================================
  // Phase 3: Shapes
  // ==========================================================================
  describe("020_shapes_basic", () => {
    it("extracts 4 shapes", () => {
      const shapes = parseFixture("020_shapes_basic").presentation.slides[0].shapes;
      expect(shapes.length).toBe(4);
    });

    it("extracts shape text (Rectangle/Oval/Triangle)", () => {
      const text = allText(parseFixture("020_shapes_basic"));
      expect(text).toContain("Rectangle");
      expect(text).toContain("Oval");
      expect(text).toContain("Triangle");
    });

    it("PPTX has shape XML", () => {
      const pkg = convert(readFixture("020_shapes_basic")).data;
      const slideXml = pkg.readText("ppt/slides/slide1.xml")!;
      expect(slideXml).toContain("<p:sp>");
    });
  });

  // ==========================================================================
  // Phase 4: Images
  // ==========================================================================
  describe("030_images_basic", () => {
    it("extracts 2 images", () => {
      expect(parseFixture("030_images_basic").presentation.images.length).toBe(2);
    });

    it("has picture shapes", () => {
      const shapes = parseFixture("030_images_basic").presentation.slides[0].shapes;
      expect(shapes.filter((s) => s.picture).length).toBe(2);
    });

    it("PPTX has image media files", () => {
      const files = convert(readFixture("030_images_basic")).data.listFiles();
      const mediaFiles = files.filter((f) => f.startsWith("ppt/media/"));
      expect(mediaFiles.length).toBe(2);
    });
  });

  // ==========================================================================
  // Phase 5: Extended text
  // ==========================================================================
  describe("012_text_alignment", () => {
    it("has 5 shapes", () => {
      expect(parseFixture("012_text_alignment").presentation.slides[0].shapes.length).toBe(5);
    });

    it("contains alignment text", () => {
      const text = allText(parseFixture("012_text_alignment"));
      expect(text).toContain("Left aligned");
      expect(text).toContain("Center aligned");
      expect(text).toContain("Right aligned");
    });
  });

  describe("060_hyperlink", () => {
    it("contains hyperlink text", () => {
      const text = allText(parseFixture("060_hyperlink"));
      expect(text).toContain("Hyperlink");
      expect(text).toContain("LibreOffice");
    });

    it("extracts hyperlink URLs in text runs", () => {
      const r = parseFixture("060_hyperlink");
      const allRuns = r.presentation.slides[0].shapes
        .flatMap((s) => s.textBody?.paragraphs ?? [])
        .flatMap((p) => p.runs);
      const linkedRuns = allRuns.filter((r) => r.properties.hyperlink);
      expect(linkedRuns.length).toBeGreaterThan(0);
      expect(linkedRuns.some((r) => r.properties.hyperlink?.includes("libreoffice"))).toBe(true);
    });

    it("produces PPTX with hyperlink relationships", () => {
      const pkg = convert(readFixture("060_hyperlink")).data;
      const rels = pkg.readText("ppt/slides/_rels/slide1.xml.rels") ?? "";
      expect(rels).toContain("hyperlink");
    });
  });

  describe("070_notes", () => {
    it("contains notes text in shapes", () => {
      const text = allText(parseFixture("070_notes"));
      expect(text).toContain("Speaker notes");
    });

    it("extracts notes text as slide property", () => {
      const r = parseFixture("070_notes");
      const notes = r.presentation.slides[0].notes;
      expect(notes).toBeDefined();
      expect(notes).toContain("NOTE:");
    });

    it("produces PPTX with notes slides", () => {
      const pkg = convert(readFixture("070_notes")).data;
      const files = pkg.listFiles();
      expect(files.some((f) => f.includes("notesSlide"))).toBe(true);
    });
  });

  // ==========================================================================
  // Phase 6: Extended shapes
  // ==========================================================================
  describe("021_line_styles", () => {
    it("has 7 shapes (including connectors)", () => {
      const shapes = parseFixture("021_line_styles").presentation.slides[0].shapes;
      expect(shapes.length).toBe(7);
    });

    it("contains dash style text", () => {
      const text = allText(parseFixture("021_line_styles"));
      expect(text).toContain("solid");
      expect(text).toContain("dash");
    });
  });

  describe("031_images_crop_rotate", () => {
    it("has image shapes", () => {
      const shapes = parseFixture("031_images_crop_rotate").presentation.slides[0].shapes;
      expect(shapes.filter((s) => s.picture).length).toBe(2);
    });
  });

  // ==========================================================================
  // Phase 7: Tables
  // ==========================================================================
  describe("040_table_basic", () => {
    it("converts without crashing", () => {
      expect(convert(readFixture("040_table_basic")).data).toBeDefined();
    });

    it("extracts table shape", () => {
      const shapes = parseFixture("040_table_basic").presentation.slides[0].shapes;
      const tables = shapes.filter((s) => s.type === "table");
      expect(tables.length).toBe(1);
    });

    it("has 4x4 grid", () => {
      const shapes = parseFixture("040_table_basic").presentation.slides[0].shapes;
      const table = shapes.find((s) => s.table)?.table;
      expect(table).toBeDefined();
      expect(table!.rows.length).toBe(4);
      expect(table!.columnWidthsEmu.length).toBe(4);
    });

    it("extracts cell text", () => {
      const shapes = parseFixture("040_table_basic").presentation.slides[0].shapes;
      const table = shapes.find((s) => s.table)?.table;
      const allCellText = table!.rows
        .flatMap((r) => r.cells)
        .flatMap((c) => c.text?.paragraphs ?? [])
        .flatMap((p) => p.runs)
        .map((r) => r.text)
        .join(" ");
      expect(allCellText).toContain("A");
    });

    it("PPTX has table XML", () => {
      const pkg = convert(readFixture("040_table_basic")).data;
      const slideXml = pkg.readText("ppt/slides/slide1.xml")!;
      expect(slideXml).toContain("<a:tbl>");
    });
  });

  describe("041_table_merged", () => {
    it("converts without crashing", () => {
      expect(convert(readFixture("041_table_merged")).data).toBeDefined();
    });

    it("extracts table with merged cells", () => {
      const shapes = parseFixture("041_table_merged").presentation.slides[0].shapes;
      const table = shapes.find((s) => s.table)?.table;
      expect(table).toBeDefined();
      // Check for merged cells (some cells should have colSpan or rowSpan > 1)
      const mergedCells = table!.rows
        .flatMap((r) => r.cells)
        .filter((c) => (c.colSpan && c.colSpan > 1) || (c.rowSpan && c.rowSpan > 1));
      expect(mergedCells.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Phase 8: Charts
  // ==========================================================================
  describe("050_chart_bar", () => {
    it("converts without crashing", () => {
      expect(convert(readFixture("050_chart_bar")).data).toBeDefined();
    });

    it("has chart-related image (OLE fallback)", () => {
      expect(parseFixture("050_chart_bar").presentation.images.length).toBeGreaterThan(0);
    });
  });

  describe("051_chart_line", () => {
    it("converts without crashing", () => {
      expect(convert(readFixture("051_chart_line")).data).toBeDefined();
    });
  });
});
