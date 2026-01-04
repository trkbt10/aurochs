/**
 * @file Unit tests for text edit styles
 */

import { describe, expect, it } from "bun:test";
import type { Pixels } from "../../../pptx/domain/types";
import {
  EMPTY_COLOR_CONTEXT,
  HIDDEN_TEXTAREA_STYLE,
  buildContainerStyle,
} from "./styles";
import type { TextEditBounds } from "./state";

describe("EMPTY_COLOR_CONTEXT", () => {
  it("should have empty colorScheme and colorMap", () => {
    expect(EMPTY_COLOR_CONTEXT.colorScheme).toEqual({});
    expect(EMPTY_COLOR_CONTEXT.colorMap).toEqual({});
  });
});

describe("HIDDEN_TEXTAREA_STYLE", () => {
  it("should have opacity 0 to hide textarea", () => {
    expect(HIDDEN_TEXTAREA_STYLE.opacity).toBe(0);
  });

  it("should have absolute positioning", () => {
    expect(HIDDEN_TEXTAREA_STYLE.position).toBe("absolute");
  });

  it("should have transparent caret color", () => {
    expect(HIDDEN_TEXTAREA_STYLE.caretColor).toBe("transparent");
  });

  it("should have pointer events enabled for interaction", () => {
    expect(HIDDEN_TEXTAREA_STYLE.pointerEvents).toBe("auto");
  });
});

describe("buildContainerStyle", () => {
  const createBounds = (
    x: number,
    y: number,
    width: number,
    height: number,
    rotation = 0,
  ): TextEditBounds => ({
    x: x as Pixels,
    y: y as Pixels,
    width: width as Pixels,
    height: height as Pixels,
    rotation,
  });

  it("should calculate percentage positions correctly", () => {
    const bounds = createBounds(100, 50, 200, 100);
    const style = buildContainerStyle(bounds, 1000, 500);

    expect(style.left).toBe("10%");
    expect(style.top).toBe("10%");
    expect(style.width).toBe("20%");
    expect(style.height).toBe("20%");
  });

  it("should apply rotation transform when rotation is non-zero", () => {
    const bounds = createBounds(0, 0, 100, 100, 45);
    const style = buildContainerStyle(bounds, 1000, 500);

    expect(style.transform).toBe("rotate(45deg)");
  });

  it("should not apply transform when rotation is zero", () => {
    const bounds = createBounds(0, 0, 100, 100, 0);
    const style = buildContainerStyle(bounds, 1000, 500);

    expect(style.transform).toBeUndefined();
  });

  it("should have absolute positioning", () => {
    const bounds = createBounds(0, 0, 100, 100);
    const style = buildContainerStyle(bounds, 1000, 500);

    expect(style.position).toBe("absolute");
  });

  it("should have high z-index for overlay", () => {
    const bounds = createBounds(0, 0, 100, 100);
    const style = buildContainerStyle(bounds, 1000, 500);

    expect(style.zIndex).toBe(1000);
  });

  it("should have visible overflow", () => {
    const bounds = createBounds(0, 0, 100, 100);
    const style = buildContainerStyle(bounds, 1000, 500);

    expect(style.overflow).toBe("visible");
  });

  it("should have border-box box sizing", () => {
    const bounds = createBounds(0, 0, 100, 100);
    const style = buildContainerStyle(bounds, 1000, 500);

    expect(style.boxSizing).toBe("border-box");
  });

  it("should have center transform origin", () => {
    const bounds = createBounds(0, 0, 100, 100, 45);
    const style = buildContainerStyle(bounds, 1000, 500);

    expect(style.transformOrigin).toBe("center center");
  });
});
