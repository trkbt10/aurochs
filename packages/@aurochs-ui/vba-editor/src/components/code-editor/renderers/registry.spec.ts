/**
 * @file Renderer Registry Tests
 */

import {
  RENDERER_REGISTRY,
  getRenderer,
  DEFAULT_RENDERER,
  HtmlCodeRenderer,
  SvgCodeRenderer,
  CanvasCodeRenderer,
} from "./index";
import type { RendererType } from "./types";

describe("RENDERER_REGISTRY", () => {
  test("has html renderer", () => {
    expect(RENDERER_REGISTRY.html).toBe(HtmlCodeRenderer);
  });

  test("has svg renderer", () => {
    expect(RENDERER_REGISTRY.svg).toBe(SvgCodeRenderer);
  });

  test("has canvas renderer", () => {
    expect(RENDERER_REGISTRY.canvas).toBe(CanvasCodeRenderer);
  });

  test("has all three renderers", () => {
    const types: RendererType[] = ["html", "svg", "canvas"];
    for (const type of types) {
      expect(RENDERER_REGISTRY[type]).toBeDefined();
      // memo() components are objects with $$typeof Symbol
      expect(RENDERER_REGISTRY[type]).toHaveProperty("$$typeof");
    }
  });
});

describe("getRenderer", () => {
  test("returns html renderer for html type", () => {
    expect(getRenderer("html")).toBe(HtmlCodeRenderer);
  });

  test("returns svg renderer for svg type", () => {
    expect(getRenderer("svg")).toBe(SvgCodeRenderer);
  });

  test("returns canvas renderer for canvas type", () => {
    expect(getRenderer("canvas")).toBe(CanvasCodeRenderer);
  });
});

describe("DEFAULT_RENDERER", () => {
  test("is html", () => {
    expect(DEFAULT_RENDERER).toBe("html");
  });

  test("maps to HtmlCodeRenderer", () => {
    expect(getRenderer(DEFAULT_RENDERER)).toBe(HtmlCodeRenderer);
  });
});
