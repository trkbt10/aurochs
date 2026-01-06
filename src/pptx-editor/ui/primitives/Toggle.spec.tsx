/**
 * @file Toggle interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("toggles checked state on click", () => {
    const state = { lastValue: false };
    const handleChange = (checked: boolean) => {
      state.lastValue = checked;
    };

    const { getByRole } = render(
      <Toggle checked={false} onChange={handleChange} />
    );

    fireEvent.click(getByRole("switch"));
    expect(state.lastValue).toBe(true);
  });

  it("does not toggle when disabled", () => {
    const state = { calls: 0 };
    const handleChange = () => {
      state.calls += 1;
    };

    const { getByRole } = render(
      <Toggle checked={false} onChange={handleChange} disabled />
    );

    fireEvent.click(getByRole("switch"));
    expect(state.calls).toBe(0);
  });
});
