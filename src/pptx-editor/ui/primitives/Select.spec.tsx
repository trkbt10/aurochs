/**
 * @file Select interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { Select } from "./Select";

describe("Select", () => {
  it("calls onChange with selected option", () => {
    const state = { lastValue: "" };
    const handleChange = (value: string) => {
      state.lastValue = value;
    };

    const { getByRole } = render(
      <Select
        value="a"
        onChange={handleChange}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    );

    fireEvent.change(getByRole("combobox"), { target: { value: "b" } });
    expect(state.lastValue).toBe("b");
  });
});
