/**
 * @file ZoomControls tests
 */
// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { ZoomControls } from "./ZoomControls";

describe("ZoomControls", () => {
  it("renders zoom in and zoom out buttons", () => {
    render(<ZoomControls zoom={1} onZoomChange={() => undefined} />);

    expect(screen.getByTitle("Zoom In")).toBeDefined();
    expect(screen.getByTitle("Zoom Out")).toBeDefined();
  });

  it("calls onZoomChange with next zoom on zoom in", () => {
    const calls: number[] = [];
    render(<ZoomControls zoom={1} onZoomChange={(v) => calls.push(v)} />);

    fireEvent.click(screen.getByTitle("Zoom In"));
    // 1 → next step is 1.25
    expect(calls).toEqual([1.25]);
  });

  it("calls onZoomChange with previous zoom on zoom out", () => {
    const calls: number[] = [];
    render(<ZoomControls zoom={1} onZoomChange={(v) => calls.push(v)} />);

    fireEvent.click(screen.getByTitle("Zoom Out"));
    // 1 → previous step is 0.75
    expect(calls).toEqual([0.75]);
  });

  it("disables buttons when disabled prop is true", () => {
    render(<ZoomControls zoom={1} onZoomChange={() => undefined} disabled />);

    expect(screen.getByTitle("Zoom In").closest("button")?.disabled).toBe(true);
    expect(screen.getByTitle("Zoom Out").closest("button")?.disabled).toBe(true);
  });
});
