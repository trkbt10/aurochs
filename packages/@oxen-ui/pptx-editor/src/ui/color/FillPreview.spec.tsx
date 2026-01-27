/**
 * @file FillPreview rendering tests
 */

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { deg, pct } from "@oxen/ooxml/domain/units";
import type { Fill } from "@oxen/pptx/domain/color/types";
import { FillPreview } from "./FillPreview";

describe("FillPreview", () => {
  it("renders noFill", () => {
    const fill: Fill = { type: "noFill" };
    const { container } = render(<FillPreview fill={fill} />);
    expect(container.querySelector("div")?.style.border).toContain("dashed");
  });

  it("renders solidFill with checkerboard when alpha < 1", () => {
    const fill: Fill = {
      type: "solidFill",
      color: {
        spec: { type: "srgb", value: "FF0000" },
        transform: { alpha: pct(50) },
      },
    };
    const { container } = render(<FillPreview fill={fill} />);

    const hasCheckerboard = Array.from(container.querySelectorAll("div")).some((d) =>
      d.style.backgroundImage.includes("linear-gradient")
    );
    expect(hasCheckerboard).toBe(true);
  });

  it("renders gradientFill", () => {
    const fill: Fill = {
      type: "gradientFill",
      stops: [
        { position: pct(0), color: { spec: { type: "srgb", value: "000000" } } },
        { position: pct(100), color: { spec: { type: "srgb", value: "FFFFFF" } } },
      ],
      linear: { angle: deg(90), scaled: true },
      rotWithShape: true,
    };
    const { container } = render(<FillPreview fill={fill} />);
    expect((container.firstChild as HTMLElement).style.background).toContain("linear-gradient");
  });
});

