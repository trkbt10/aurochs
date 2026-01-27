/**
 * @file Presentation editor types tests
 *
 * These tests are primarily compile-time checks that the editor action types
 * accept branded unit values (Pixels/Degrees) from ooxml/domain/units.
 */

import { px, deg } from "@oxen/ooxml/domain/units";
import type { PresentationEditorAction } from "./types";

describe("PresentationEditorAction", () => {
  it("accepts Pixels and Degrees values", () => {
    const move: PresentationEditorAction = {
      type: "START_MOVE",
      startX: px(10),
      startY: px(20),
    };
    const rotate: PresentationEditorAction = {
      type: "PREVIEW_ROTATE",
      currentAngle: deg(90),
    };

    expect(move.type).toBe("START_MOVE");
    expect(rotate.type).toBe("PREVIEW_ROTATE");
  });
});

