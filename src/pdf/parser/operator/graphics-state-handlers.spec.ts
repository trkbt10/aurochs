import { describe, expect, it } from "vitest";
import { tokenizeContentStream } from "../../domain/content-stream";
import { createParser } from "./parse";
import { GraphicsStateStack } from "../../domain";
import type { GraphicsStateOps } from "./types";
import { createGfxOpsFromStack } from "./parse";

describe("graphics-state-handlers (gs)", () => {
  it("applies fillAlpha/strokeAlpha from injected ExtGState map", () => {
    const tokens = tokenizeContentStream("/GS1 gs 0 0 10 10 re f");
    const gfxStack = new GraphicsStateStack();
    const gfxOps: GraphicsStateOps = createGfxOpsFromStack(gfxStack);

    const extGState = new Map([["GS1", { fillAlpha: 0.5, strokeAlpha: 0.25 }]]);
    const parse = createParser(gfxOps, new Map(), { extGState });
    const elements = parse(tokens);

    const paths = elements.filter((e) => e.type === "path");
    expect(paths).toHaveLength(1);
    const path = paths[0]!;
    if (path.type !== "path") throw new Error("Expected path");
    expect(path.graphicsState.fillAlpha).toBeCloseTo(0.5);
    expect(path.graphicsState.strokeAlpha).toBeCloseTo(0.25);
  });
});
