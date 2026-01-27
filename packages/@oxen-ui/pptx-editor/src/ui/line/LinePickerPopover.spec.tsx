/**
 * @file LinePickerPopover interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import type { Line } from "@oxen/pptx/domain/color/types";
import { LinePickerPopover } from "./LinePickerPopover";
import { createDefaultLine } from "./LineEditor";

describe("LinePickerPopover", () => {
  it("opens and updates line width via slider", () => {
    const state: { lastLine: Line | null } = { lastLine: null };
    const handleChange = (line: Line) => {
      state.lastLine = line;
    };

    const { getByText, getByRole } = render(
      <LinePickerPopover
        value={createDefaultLine()}
        onChange={handleChange}
        trigger={<button type="button">Open</button>}
      />
    );

    fireEvent.click(getByText("Open"));
    const slider = getByRole("slider");
    fireEvent.change(slider, { target: { value: "3" } });

    if (!state.lastLine) {
      throw new Error("Line change not captured");
    }
    expect(Number(state.lastLine.width)).toBe(3);
  });
});
