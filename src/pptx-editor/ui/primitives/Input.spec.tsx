/**
 * @file Input interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { Input } from "./Input";

describe("Input", () => {
  it("calls onChange with text values", () => {
    const state = { lastValue: "" };
    const handleChange = (value: string | number) => {
      state.lastValue = String(value);
    };

    const { container } = render(
      <Input value="" onChange={handleChange} />
    );

    const input = container.querySelector("input");
    if (!input) {
      throw new Error("Input element not found");
    }

    fireEvent.change(input, { target: { value: "hello" } });
    expect(state.lastValue).toBe("hello");
  });

  it("parses number values and falls back to 0 for NaN", () => {
    const state = { lastValue: -1 };
    const handleChange = (value: string | number) => {
      state.lastValue = Number(value);
    };

    const { container } = render(
      <Input value={0} type="number" onChange={handleChange} />
    );

    const input = container.querySelector("input");
    if (!input) {
      throw new Error("Input element not found");
    }

    fireEvent.change(input, { target: { value: "2.5" } });
    expect(state.lastValue).toBe(2.5);

    fireEvent.change(input, { target: { value: "bad" } });
    expect(state.lastValue).toBe(0);
  });
});
