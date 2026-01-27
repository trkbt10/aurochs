/**
 * @file ColorPreviewInput interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { ColorPreviewInput } from "./ColorPreviewInput";

describe("ColorPreviewInput", () => {
  it("normalizes hex input and calls onChange", () => {
    const state = { lastHex: "" };
    const onChange = (hex: string) => {
      state.lastHex = hex;
    };

    const { getByPlaceholderText } = render(
      <ColorPreviewInput value="000000" onChange={onChange} />
    );

    fireEvent.change(getByPlaceholderText("RRGGBB"), { target: { value: "ff00aa" } });
    expect(state.lastHex).toBe("FF00AA");
  });
});

