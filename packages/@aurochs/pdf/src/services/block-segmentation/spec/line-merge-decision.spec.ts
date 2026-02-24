/**
 * @file Tests for proposal-based line merge decision.
 */

import type { PdfText } from "../../../domain/text";
import { createDefaultGraphicsState } from "../../../domain/graphics-state";
import type { GroupedParagraph } from "../contracts/types";
import { decideLineMerge } from "../strategies/line-merge-decision";

function createRun(overrides: Partial<PdfText> = {}): PdfText {
  return {
    type: "text",
    text: "sample text",
    x: 0,
    y: 0,
    width: 100,
    height: 12,
    fontName: "Helvetica",
    fontSize: 12,
    graphicsState: createDefaultGraphicsState(),
    ...overrides,
  };
}

function createLine(args: {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height?: number;
  readonly fontName?: string;
  readonly fontSize?: number;
}): GroupedParagraph {
  const run = createRun({
    text: args.text,
    x: args.x,
    y: args.y,
    width: args.width,
    height: args.height ?? 12,
    fontName: args.fontName ?? "Helvetica",
    fontSize: args.fontSize ?? 12,
  });
  return {
    runs: [run],
    baselineY: run.y + run.height,
  };
}

describe("decideLineMerge", () => {
  const options = {
    enableColumnSeparation: true,
    verticalGapRatio: 1.2,
  };

  it("hard-splits when lines belong to different columns", () => {
    const upper = createLine({ text: "column A body", x: 20, y: 120, width: 180 });
    const lower = createLine({ text: "column B body", x: 360, y: 104, width: 180 });

    const decision = decideLineMerge({
      line1: upper,
      line2: lower,
      options,
      styleMatched: true,
      referenceFontSize: 12,
    });

    expect(decision.merge).toBe(false);
    expect(decision.proposals.some((proposal) => proposal.strategyId === "column-relation" && proposal.hard)).toBe(true);
  });

  it("hard-splits when vertical gap exceeds threshold", () => {
    const upper = createLine({ text: "line one", x: 40, y: 300, width: 220 });
    const lower = createLine({ text: "line two", x: 40, y: 120, width: 220 });

    const decision = decideLineMerge({
      line1: upper,
      line2: lower,
      options,
      styleMatched: true,
      referenceFontSize: 12,
    });

    expect(decision.merge).toBe(false);
    expect(decision.proposals.some((proposal) => proposal.strategyId === "vertical-gap" && proposal.hard)).toBe(true);
  });

  it("merges with hard style match when geometric guards pass", () => {
    const upper = createLine({ text: "first paragraph line", x: 40, y: 120, width: 300 });
    const lower = createLine({ text: "second paragraph line", x: 40, y: 104, width: 298 });

    const decision = decideLineMerge({
      line1: upper,
      line2: lower,
      options,
      styleMatched: true,
      referenceFontSize: 12,
    });

    expect(decision.merge).toBe(true);
    expect(decision.proposals.some((proposal) => proposal.strategyId === "style-consistency" && proposal.hard)).toBe(true);
  });

  it("merges style-mismatched long lines when layout continuity is high", () => {
    const upper = createLine({
      text: "This is a long first line intended to continue into the next one.",
      x: 32,
      y: 120,
      width: 340,
      fontName: "TimesNewRomanPSMT",
    });
    const lower = createLine({
      text: "This second long line should stay in the same merged block.",
      x: 32,
      y: 104,
      width: 336,
      fontName: "Helvetica",
    });

    const decision = decideLineMerge({
      line1: upper,
      line2: lower,
      options,
      styleMatched: false,
      referenceFontSize: 12,
    });

    expect(decision.merge).toBe(true);
    expect(decision.mergeScore > decision.splitScore).toBe(true);
  });

  it("splits style-mismatched short lines with weak continuity", () => {
    const upper = createLine({ text: "Title", x: 180, y: 120, width: 42, fontName: "Helvetica-Bold" });
    const lower = createLine({ text: "Body", x: 180, y: 104, width: 36, fontName: "Helvetica" });

    const decision = decideLineMerge({
      line1: upper,
      line2: lower,
      options,
      styleMatched: false,
      referenceFontSize: 12,
    });

    expect(decision.merge).toBe(false);
    expect(decision.splitScore >= decision.mergeScore).toBe(true);
  });
});
