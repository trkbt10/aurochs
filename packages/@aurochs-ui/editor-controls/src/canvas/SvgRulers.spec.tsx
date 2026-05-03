/**
 * @file SVG ruler coordinate mode tests.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgRulers } from "./SvgRulers";

const BASE_PROPS = {
  viewport: { translateX: 120, translateY: 0, scale: 1 },
  viewportSize: { width: 320, height: 180 },
  slideSize: { width: 100, height: 100 },
  rulerThickness: 20,
  visible: true,
};

describe("SvgRulers coordinate mode", () => {
  it("keeps slide-style rulers bounded by default", () => {
    const html = renderToStaticMarkup(createElement(SvgRulers, BASE_PROPS));

    expect(html).not.toContain(">-100<");
  });

  it("shows negative coordinates for infinite canvas rulers", () => {
    const html = renderToStaticMarkup(createElement(SvgRulers, {
      ...BASE_PROPS,
      coordinateMode: "unbounded",
    }));

    expect(html).toContain(">-100<");
  });
});
