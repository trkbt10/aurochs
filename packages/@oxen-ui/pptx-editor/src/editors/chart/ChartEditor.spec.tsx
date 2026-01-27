/**
 * @file ChartEditor interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import type { Chart } from "@oxen/pptx/domain/chart";
import { ChartEditor, createDefaultChart } from "./ChartEditor";

describe("ChartEditor", () => {
  it("updates plot visibility toggle", () => {
    const state: { lastChart: Chart | null } = { lastChart: null };
    const handleChange = (chart: Chart) => {
      state.lastChart = chart;
    };

    const { getByText } = render(
      <ChartEditor value={createDefaultChart()} onChange={handleChange} />
    );

    const label = getByText("Plot Visible Only");
    const labelRow = label.closest("div");
    const fieldGroup = labelRow?.parentElement ?? null;
    const switchEl = fieldGroup?.querySelector('[role="switch"]');
    if (!switchEl) {
      throw new Error("Plot Visible Only switch not found");
    }

    fireEvent.click(switchEl);

    if (!state.lastChart) {
      throw new Error("Chart change not captured");
    }
    expect(state.lastChart.plotVisOnly).toBe(false);
  });
});
