/**
 * @file LineEditor interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import type { Line } from "@oxen/pptx/domain/color/types";
import { LineEditor, createDefaultLine } from "./LineEditor";

describe("LineEditor", () => {
  it("updates line width from the slider", () => {
    const calls: { last?: Line } = {};
    const handleChange = (line: Line) => {
      calls.last = line;
    };

    const { getByRole } = render(
      <LineEditor value={createDefaultLine()} onChange={handleChange} />
    );

    fireEvent.change(getByRole("slider"), { target: { value: "5" } });

    expect(calls.last?.width).toBe(5);
  });

  it("updates line dash via select", () => {
    const calls: { last?: Line } = {};
    const handleChange = (line: Line) => {
      calls.last = line;
    };

    const { getAllByRole } = render(
      <LineEditor value={createDefaultLine()} onChange={handleChange} />
    );

    const selects = getAllByRole("combobox");
    const dashSelect = selects[0];

    fireEvent.change(dashSelect, { target: { value: "dash" } });

    expect(calls.last?.dash).toBe("dash");
  });
});
