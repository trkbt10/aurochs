/** @file Selection box chrome tests. */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SelectionBox } from "./SelectionBox";

describe("SelectionBox", () => {
  it("keeps chrome screen-sized under viewport scale", () => {
    const html = renderToStaticMarkup(
      createElement(SelectionBox, {
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        variant: "primary",
        viewportScale: 2,
      }),
    );

    expect(html).toContain('stroke-width="2"');
    expect(html).toContain('width="4"');
    expect(html).toContain('height="4"');
    expect(html).toContain('vector-effect="non-scaling-stroke"');
  });

  it("uses invisible edge rotation zones instead of a visible top rotate handle", () => {
    const html = renderToStaticMarkup(
      createElement(SelectionBox, {
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        variant: "primary",
      }),
    );

    expect(html).toContain('stroke="transparent"');
    expect(html).not.toContain("<circle");
  });
});
