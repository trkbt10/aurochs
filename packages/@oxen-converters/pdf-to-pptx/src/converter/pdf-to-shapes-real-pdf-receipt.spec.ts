/**
 * @file Real PDF conversion regression test (Receipt-2627-1068.pdf)
 */

import { readFileSync } from "node:fs";
import { px } from "@oxen-office/ooxml/domain/units";
import type { GraphicFrame } from "@oxen-office/pptx/domain/shape";
import { parsePdf } from "@oxen/pdf/parser/core/pdf-parser";
import { convertPageToShapes } from "./pdf-to-shapes";
import { getSampleFixturePath } from "../test-utils/pdf-fixtures";

describe("convertPageToShapes (real PDF) - receipt table guard", () => {
  const PDF_PATH = getSampleFixturePath("Receipt-2627-1068.pdf");

  it("does not tableize receipt-like layouts (page 1)", async () => {
    const pdfBytes = readFileSync(PDF_PATH);
    const pdfDoc = await parsePdf(pdfBytes, { pages: [1] });
    const page = pdfDoc.pages[0];
    if (!page) {throw new Error("Expected page 1");}

    const shapes = convertPageToShapes(page, {
      slideWidth: px(960),
      slideHeight: px(540),
    });

    const tableFrames = shapes.filter(
      (s): s is GraphicFrame => s.type === "graphicFrame" && s.content.type === "table",
    );

    expect(tableFrames.length).toBe(0);
  });
});
