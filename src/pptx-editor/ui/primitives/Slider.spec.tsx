/**
 * @file Slider interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { Slider } from "./Slider";

describe("Slider", () => {
  it("calls onChange with numeric value", () => {
    const state = { lastValue: 0 };
    const handleChange = (value: number) => {
      state.lastValue = value;
    };

    const { getByRole } = render(
      <Slider value={0} onChange={handleChange} />
    );

    fireEvent.change(getByRole("slider"), { target: { value: "42" } });
    expect(state.lastValue).toBe(42);
  });
});
