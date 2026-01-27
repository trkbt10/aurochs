/**
 * @file GradientFillEditor interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { pct } from "@oxen/ooxml/domain/units";
import type { GradientFill } from "@oxen/ooxml/domain/fill";
import { GradientFillEditor } from "./GradientFillEditor";

describe("GradientFillEditor", () => {
  it("updates gradient angle via slider", () => {
    const value: GradientFill = {
      type: "gradientFill",
      stops: [
        { position: pct(0), color: { spec: { type: "srgb", value: "000000" } } },
        { position: pct(100), color: { spec: { type: "srgb", value: "FFFFFF" } } },
      ],
      rotWithShape: true,
    };

    const calls: { last?: GradientFill } = {};
    const onChange = (fill: GradientFill) => {
      calls.last = fill;
    };

    const { getByRole } = render(<GradientFillEditor value={value} onChange={onChange} />);

    fireEvent.change(getByRole("slider"), { target: { value: "45" } });

    expect(calls.last?.linear?.angle).toBe(45);
    expect(calls.last?.linear?.scaled).toBe(true);
  });
});

