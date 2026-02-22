/**
 * @file Tests for contextual NCD segmentation.
 */

import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { PdfText } from "../../../domain/text";
import { createDefaultGraphicsState } from "../../../domain/graphics-state";
import { parsePdf } from "../../../parser/core/pdf-parser";
import {
  segmentGroupedTextByContext,
  segmentTextUnitsByContext,
  type ContextualSegmentationUnit,
} from "../strategies/contextual-ncd-segmentation";
import { spatialGrouping } from "../strategies/spatial-grouping";
import type { GroupedText } from "../contracts/types";

function makePdfText(args: {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height?: number;
  readonly fontSize?: number;
}): PdfText {
  const { text, x, y, width, height = 12, fontSize = 12 } = args;
  return {
    type: "text",
    text,
    x,
    y,
    width,
    height,
    fontName: "Helvetica",
    fontSize,
    graphicsState: createDefaultGraphicsState(),
  };
}

function makeGroup(args: {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}): GroupedText {
  const run = makePdfText({
    text: args.text,
    x: args.x,
    y: args.y,
    width: args.width,
    height: args.height,
  });
  return {
    bounds: {
      x: args.x,
      y: args.y,
      width: args.width,
      height: args.height,
    },
    paragraphs: [
      {
        runs: [run],
        baselineY: args.y + args.height,
      },
    ],
  };
}

function loadFixturePdf(filename: string): Uint8Array {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const fixturePath = path.resolve(currentDir, "../../../../fixtures/block-segmentation-corpus", filename);
  return readFileSync(fixturePath);
}

describe("segmentTextUnitsByContext", () => {
  it("splits at topic shift and merges similar adjacent units", () => {
    const units: readonly ContextualSegmentationUnit<string>[] = [
      {
        text: "cat feline whisker cat feline whisker cat feline whisker cat feline whisker",
        value: "a1",
      },
      {
        text: "cat feline whisker playful kitten cat feline whisker playful kitten",
        value: "a2",
      },
      {
        text: "galaxy orbit telescope nebula galaxy orbit telescope nebula galaxy orbit",
        value: "b1",
      },
      {
        text: "galaxy orbit telescope star cluster galaxy orbit telescope star cluster",
        value: "b2",
      },
    ];

    const result = segmentTextUnitsByContext(units, {
      mergeThreshold: 0.56,
      strongMergeThreshold: 0.2,
      minCombinedChars: 20,
    });

    expect(result.segments.length).toBe(2);
    expect(result.segments[0]?.startIndex).toBe(0);
    expect(result.segments[0]?.endIndex).toBe(1);
    expect(result.segments[1]?.startIndex).toBe(2);
    expect(result.segments[1]?.endIndex).toBe(3);
  });
});

describe("segmentGroupedTextByContext", () => {
  it("does not merge side-by-side columns even when text is similar", () => {
    const groups: readonly GroupedText[] = [
      makeGroup({
        text: "【左段】吾輩は猫である。吾輩は猫である。吾輩は猫である。",
        x: 56,
        y: 640,
        width: 220,
        height: 120,
      }),
      makeGroup({
        text: "【右段】吾輩は猫である。吾輩は猫である。吾輩は猫である。",
        x: 320,
        y: 640,
        width: 220,
        height: 120,
      }),
    ];

    const result = segmentGroupedTextByContext(groups, {
      mergeThreshold: 0.4,
      strongMergeThreshold: 0.2,
      minCombinedChars: 20,
      minXAxisOverlapRatio: 0.3,
    });

    expect(result.segments.length).toBe(2);
    expect(result.boundaries[0]?.merge).toBe(false);
    expect(result.boundaries[0]?.reason).toBe("blocked-by-callback");
  });

  it("merges continuation fragment in paper-like fixture", async () => {
    const bytes = loadFixturePdf("paper-cover-abstract-two-column.pdf");
    const parsed = await parsePdf(bytes, { pages: [1], encryption: { mode: "ignore" } });
    const page = parsed.pages[0];
    if (!page) {
      throw new Error("paper-cover-abstract-two-column: page 1 not found");
    }

    const texts = page.elements.filter((element): element is PdfText => element.type === "text");
    const groups = spatialGrouping(texts, { pageWidth: page.width, pageHeight: page.height });
    const result = segmentGroupedTextByContext(groups, {
      minXAxisOverlapRatio: 0.3,
      strongMergeThreshold: 0.1,
      mergeThreshold: 0.22,
      minCombinedChars: 48,
    });

    expect(result.segments.length).toBeLessThan(groups.length);

    const bodySegment = result.segments.find((segment) =>
      segment.text.includes("【本文右段】") && segment.text.includes("記憶している"),
    );
    expect(bodySegment).toBeDefined();
  });

  it("keeps two-column long text as two segments", async () => {
    const bytes = loadFixturePdf("horizontal-long-two-column.pdf");
    const parsed = await parsePdf(bytes, { pages: [1], encryption: { mode: "ignore" } });
    const page = parsed.pages[0];
    if (!page) {
      throw new Error("horizontal-long-two-column: page 1 not found");
    }

    const texts = page.elements.filter((element): element is PdfText => element.type === "text");
    const groups = spatialGrouping(texts, { pageWidth: page.width, pageHeight: page.height });

    const result = segmentGroupedTextByContext(groups, {
      minXAxisOverlapRatio: 0.3,
      strongMergeThreshold: 0.1,
      mergeThreshold: 0.22,
      minCombinedChars: 48,
    });

    expect(groups.length).toBe(2);
    expect(result.segments.length).toBe(2);
  });
});
