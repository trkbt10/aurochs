/**
 * @file LinePreview rendering tests
 */

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { LinePreview } from "./LinePreview";
import { createDefaultLine } from "./LineEditor";

describe("LinePreview", () => {
  it("renders an svg preview", () => {
    const { container } = render(<LinePreview line={createDefaultLine()} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

