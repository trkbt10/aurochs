/**
 * @file GradientStopsEditor interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { useState } from "react";
import type { GradientStop } from "@oxen/ooxml/domain/fill";
import { pct } from "@oxen/ooxml/domain/units";
import { GradientStopsEditor } from "./GradientStopsEditor";

function setRect(element: HTMLElement, rect: DOMRect): void {
  Object.defineProperty(element, "getBoundingClientRect", {
    value: () => rect,
    configurable: true,
  });
}

describe("GradientStopsEditor", () => {
  it("adds a stop when clicking the gradient bar", () => {
    const state: { lastStops: readonly GradientStop[] } = { lastStops: [] };
    const handleChange = (stops: readonly GradientStop[]) => {
      state.lastStops = stops;
    };

    const { getByTitle } = render(
      <GradientStopsEditor value={[]} onChange={handleChange} />
    );

    const bar = getByTitle("Click to add a color stop");
    setRect(
      bar,
      {
        left: 0,
        top: 0,
        width: 100,
        height: 24,
        right: 100,
        bottom: 24,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect
    );

    fireEvent.click(bar, { clientX: 50 });

    expect(state.lastStops.length).toBe(1);
    expect(Number(state.lastStops[0].position)).toBe(50);
  });

  it("drags a stop to update its position", () => {
    const initialStops: readonly GradientStop[] = [
      { position: pct(50), color: { spec: { type: "srgb", value: "ffffff" } } },
    ];

    const Harness = () => {
      const [stops, setStops] = useState(initialStops);
      return <GradientStopsEditor value={stops} onChange={setStops} />;
    };

    const { getByTitle, queryByTitle } = render(<Harness />);

    const bar = getByTitle("Click to add a color stop");
    setRect(
      bar,
      {
        left: 0,
        top: 0,
        width: 200,
        height: 24,
        right: 200,
        bottom: 24,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect
    );

    const stop = getByTitle("Stop at 50%");
    fireEvent.pointerDown(stop, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(stop, { clientX: 160, pointerId: 1 });
    fireEvent.pointerUp(stop, { clientX: 160, pointerId: 1 });

    expect(queryByTitle("Stop at 80%")).toBeTruthy();
  });
});
