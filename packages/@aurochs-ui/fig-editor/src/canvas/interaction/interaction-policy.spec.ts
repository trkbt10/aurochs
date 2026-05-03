/** @file Tests for canvas interaction policy resolution. */

import type { FigUserIntent } from "../../context/fig-editor/user-intent";
import { resolveCanvasInteractionPolicy } from "./interaction-policy";

describe("resolveCanvasInteractionPolicy", () => {
  it("makes vector edit the only mode with path target resolution and inert selection chrome", () => {
    const policy = resolveCanvasInteractionPolicy({ kind: "path-edit", source: "tool" });

    expect(policy).toEqual({
      targetMode: "path-edit",
      pathEditingEnabled: true,
      shapeCreationEnabled: false,
      marqueeEnabled: false,
      selectionChromeInteractive: false,
    });
  });

  it("keeps select mode as normal selection and marquee interaction", () => {
    const policy = resolveCanvasInteractionPolicy({ kind: "select", source: "tool" });

    expect(policy).toEqual({
      targetMode: "select",
      pathEditingEnabled: false,
      shapeCreationEnabled: false,
      marqueeEnabled: true,
      selectionChromeInteractive: true,
    });
  });

  it.each<FigUserIntent>([
    { kind: "create-frame", source: "tool" },
    { kind: "create-rectangle", source: "tool" },
    { kind: "create-ellipse", source: "tool" },
    { kind: "create-line", source: "tool" },
    { kind: "create-star", source: "tool" },
    { kind: "create-polygon", source: "tool" },
    { kind: "create-text", source: "tool" },
  ])("treats %s as creation without marquee or path editing", (intent) => {
    const policy = resolveCanvasInteractionPolicy(intent);

    expect(policy).toEqual({
      targetMode: "select",
      pathEditingEnabled: false,
      shapeCreationEnabled: true,
      marqueeEnabled: false,
      selectionChromeInteractive: false,
    });
  });

  it("keeps text editing from receiving selection, marquee, creation, or path interactions", () => {
    const policy = resolveCanvasInteractionPolicy({ kind: "text-edit", source: "text-edit" });

    expect(policy).toEqual({
      targetMode: "select",
      pathEditingEnabled: false,
      shapeCreationEnabled: false,
      marqueeEnabled: false,
      selectionChromeInteractive: false,
    });
  });

  it("keeps selection transform drags from starting another chrome operation", () => {
    const policy = resolveCanvasInteractionPolicy({ kind: "resize", source: "drag" });

    expect(policy.selectionChromeInteractive).toBe(false);
    expect(policy.marqueeEnabled).toBe(false);
    expect(policy.shapeCreationEnabled).toBe(false);
  });
});
