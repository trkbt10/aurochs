/**
 * @file GradientStopRow interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { pct } from "@oxen/ooxml/domain/units";
import type { GradientStop } from "@oxen/ooxml/domain/fill";
import { GradientStopRow } from "./GradientStopRow";

describe("GradientStopRow", () => {
  it("selects and updates stop fields", () => {
    const calls = { selected: 0, hex: "", position: -1 };

    const stop: GradientStop = {
      position: pct(25),
      color: { spec: { type: "srgb", value: "112233" } },
    };

    const { container, getByDisplayValue, getByRole } = render(
      <GradientStopRow
        stop={stop}
        selected={false}
        onSelect={() => {
          calls.selected += 1;
        }}
        onColorChange={(hex) => {
          calls.hex = hex;
        }}
        onPositionChange={(position) => {
          calls.position = position;
        }}
      />
    );

    fireEvent.click(container.firstChild as HTMLElement);
    expect(calls.selected).toBe(1);

    fireEvent.change(getByDisplayValue("112233"), { target: { value: "ff00aa" } });
    expect(calls.hex).toBe("FF00AA");

    fireEvent.change(getByRole("spinbutton"), { target: { value: "50" } });
    expect(calls.position).toBe(50);
  });
});

