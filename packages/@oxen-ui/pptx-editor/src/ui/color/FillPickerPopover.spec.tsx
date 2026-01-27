/**
 * @file FillPickerPopover interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import type { Fill } from "@oxen/pptx/domain/color/types";
import { FillPickerPopover } from "./FillPickerPopover";

describe("FillPickerPopover", () => {
  it("opens and updates fill type", () => {
    const state: { lastFill: Fill | null } = { lastFill: null };
    const handleChange = (fill: Fill) => {
      state.lastFill = fill;
    };

    const { getByText, getByRole } = render(
      <FillPickerPopover
        value={{ type: "noFill" }}
        onChange={handleChange}
        trigger={<button type="button">Open</button>}
      />
    );

    fireEvent.click(getByText("Open"));
    const select = getByRole("combobox");
    fireEvent.change(select, { target: { value: "solidFill" } });

    if (!state.lastFill) {
      throw new Error("Fill change not captured");
    }
    expect(state.lastFill.type).toBe("solidFill");
  });
});
