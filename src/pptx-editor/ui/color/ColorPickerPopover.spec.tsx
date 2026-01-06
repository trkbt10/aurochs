/**
 * @file ColorPickerPopover interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { ColorPickerPopover } from "./ColorPickerPopover";

describe("ColorPickerPopover", () => {
  it("opens and applies hex input changes", () => {
    const state = { lastHex: "" };
    const handleChange = (hex: string) => {
      state.lastHex = hex;
    };

    const { getByText, getByPlaceholderText } = render(
      <ColorPickerPopover
        value="000000"
        onChange={handleChange}
        trigger={<button type="button">Open</button>}
      />
    );

    fireEvent.click(getByText("Open"));
    const input = getByPlaceholderText("RRGGBB");
    fireEvent.change(input, { target: { value: "ff0000" } });

    expect(state.lastHex).toBe("FF0000");
  });
});
