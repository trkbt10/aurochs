/**
 * @file ToggleButton interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { ToggleButton } from "./ToggleButton";

describe("ToggleButton", () => {
  it("toggles pressed state when not mixed", () => {
    const state = { lastValue: true };
    const handleChange = (pressed: boolean) => {
      state.lastValue = pressed;
    };

    const { getByRole } = render(
      <ToggleButton label="Bold" pressed onChange={handleChange} />
    );

    fireEvent.click(getByRole("button"));
    expect(state.lastValue).toBe(false);
  });

  it("sets true when mixed", () => {
    const state = { lastValue: false };
    const handleChange = (pressed: boolean) => {
      state.lastValue = pressed;
    };

    const { getByRole } = render(
      <ToggleButton label="Bold" pressed={false} mixed onChange={handleChange} />
    );

    fireEvent.click(getByRole("button"));
    expect(state.lastValue).toBe(true);
  });
});
