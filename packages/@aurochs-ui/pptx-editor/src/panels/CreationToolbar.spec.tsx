/**
 * @file CreationToolbar interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import type { CreationMode } from "../context/presentation/editor/types";
import { CreationToolbar } from "./CreationToolbar";

describe("CreationToolbar", () => {
  it("calls onModeChange when a tool button is clicked", () => {
    const calls: { last?: CreationMode } = {};
    const handleModeChange = (mode: CreationMode) => {
      calls.last = mode;
    };

    const { getByTitle } = render(
      <CreationToolbar mode={{ type: "select" }} onModeChange={handleModeChange} />
    );

    fireEvent.click(getByTitle("Rectangle (R)"));

    expect(calls.last).toEqual({ type: "shape", preset: "rect" });
  });

  it("opens popover and selects a chart option", async () => {
    const calls: { last?: CreationMode } = {};
    const handleModeChange = (mode: CreationMode) => {
      calls.last = mode;
    };

    const { getByTitle, findByText } = render(
      <CreationToolbar mode={{ type: "select" }} onModeChange={handleModeChange} />
    );

    fireEvent.click(getByTitle("Chart options"));
    const option = await findByText("Pie Chart");
    fireEvent.click(option);

    expect(calls.last).toEqual({ type: "chart", chartType: "pie" });
  });
});
