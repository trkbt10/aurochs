/**
 * @file Chart editing integration test
 *
 * Verifies the full chart editing flow:
 * 1. Chart shape creation via ADD_CHART action
 * 2. Chart data population in ResourceStore via createDefaultChart
 * 3. Chart data update propagation via UPDATE_SHAPE (re-render trigger)
 * 4. ResourceStore read after update returns the new chart data
 */

import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { Chart } from "@aurochs-office/chart/domain";
import type { GraphicFrame } from "@aurochs-office/pptx/domain";
import { createResourceStore, type ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { createDefaultChart } from "@aurochs-builder/chart";
import {
  presentationEditorReducer,
  createPresentationEditorState,
} from "./reducer";
import type { PresentationEditorState, PresentationEditorAction } from "../types";
import { createTestDocument } from "./test-fixtures";

function dispatch(state: PresentationEditorState, action: PresentationEditorAction): PresentationEditorState {
  return presentationEditorReducer(state, action);
}

function getActiveSlide(state: PresentationEditorState) {
  return state.documentHistory.present.slides.find((s) => s.id === state.activeSlideId);
}

describe("Chart editing integration", () => {
  it("ADD_CHART creates a chart shape with chartType on ChartReference", () => {
    const state = createPresentationEditorState(createTestDocument());
    const next = dispatch(state, {
      type: "ADD_CHART",
      chartType: "bar",
      x: px(100),
      y: px(100),
      width: px(400),
      height: px(300),
    });

    const slide = getActiveSlide(next);
    expect(slide).toBeDefined();
    expect(slide!.slide.shapes.length).toBe(1);

    const shape = slide!.slide.shapes[0] as GraphicFrame;
    expect(shape.type).toBe("graphicFrame");
    expect(shape.content.type).toBe("chart");
    expect(shape.content.data.resourceId).toBeDefined();
    expect(shape.content.data.chartType).toBe("barChart");
  });

  it("createDefaultChart produces a valid Chart for editor-created charts", () => {
    const chart = createDefaultChart("barChart");
    expect(chart).toBeDefined();
    expect(chart.plotArea.charts.length).toBeGreaterThan(0);
    expect(chart.plotArea.charts[0].type).toBe("barChart");
  });

  it("ResourceStore population and read-back works for chart data", () => {
    const store: ResourceStore = createResourceStore();
    const resourceId = "chart-test-1";

    // Simulate what PresentationEditor.useMemo does for editor-created charts
    const chart = createDefaultChart("barChart");
    store.set(resourceId, {
      kind: "chart",
      source: "created",
      data: new ArrayBuffer(0),
      parsed: chart,
    });

    // Simulate what useChartSvg does to read chart data
    const entry = store.get<Chart>(resourceId);
    expect(entry).toBeDefined();
    expect(entry!.parsed).toBe(chart);
    expect(entry!.parsed!.plotArea.charts[0].type).toBe("barChart");
  });

  it("chart data update in ResourceStore is readable after UPDATE_SHAPE", () => {
    // 1. Create chart shape
    let state = createPresentationEditorState(createTestDocument());
    state = dispatch(state, {
      type: "ADD_CHART",
      chartType: "pie",
      x: px(50),
      y: px(50),
      width: px(300),
      height: px(300),
    });

    const slide = getActiveSlide(state)!;
    const shape = slide.slide.shapes[0] as GraphicFrame;
    const resourceId = shape.content.data.resourceId as string;

    // 2. Populate ResourceStore with default chart
    const store = createResourceStore();
    const originalChart = createDefaultChart("pieChart");
    store.set(resourceId, {
      kind: "chart",
      source: "created",
      data: new ArrayBuffer(0),
      parsed: originalChart,
    });

    // 3. Simulate chart edit: update ResourceStore then UPDATE_SHAPE
    const editedChart: Chart = {
      ...originalChart,
      title: {
        textBody: {
          bodyProperties: {},
          paragraphs: [{ properties: {}, runs: [{ type: "text", text: "My Pie Chart" }] }],
        },
        overlay: false,
      },
    };

    store.set(resourceId, {
      kind: "chart",
      source: "created",
      data: new ArrayBuffer(0),
      parsed: editedChart,
    });

    // UPDATE_SHAPE to trigger re-render (spread content.data for new reference)
    state = dispatch(state, {
      type: "UPDATE_SHAPE",
      shapeId: shape.nonVisual.id,
      updater: (s) => {
        if (s.type !== "graphicFrame" || s.content.type !== "chart") return s;
        return { ...s, content: { ...s.content, data: { ...s.content.data } } };
      },
    });

    // 4. Verify shape reference changed (triggers React re-render)
    const updatedSlide = getActiveSlide(state)!;
    const updatedShape = updatedSlide.slide.shapes[0] as GraphicFrame;
    expect(updatedShape).not.toBe(shape); // New reference
    expect(updatedShape.content.data.resourceId).toBe(resourceId); // Same resource ID

    // 5. Verify ResourceStore returns edited chart (what useChartSvg would read)
    const entry = store.get<Chart>(resourceId);
    expect(entry!.parsed).toBe(editedChart);
    expect(entry!.parsed!.title?.textBody?.paragraphs[0].runs[0]).toEqual({
      type: "text",
      text: "My Pie Chart",
    });
  });

  it("all CreationChartType values produce valid charts in ResourceStore", () => {
    const store = createResourceStore();
    const chartTypes = [
      { creation: "bar" as const, ecma: "barChart" as const },
      { creation: "line" as const, ecma: "lineChart" as const },
      { creation: "pie" as const, ecma: "pieChart" as const },
    ];

    for (const { creation, ecma } of chartTypes) {
      let state = createPresentationEditorState(createTestDocument());
      state = dispatch(state, {
        type: "ADD_CHART",
        chartType: creation,
        x: px(0),
        y: px(0),
        width: px(400),
        height: px(300),
      });

      const slide = getActiveSlide(state)!;
      const shape = slide.slide.shapes[0] as GraphicFrame;
      expect(shape.content.data.chartType).toBe(ecma);

      // Populate store and verify readable
      const chart = createDefaultChart(ecma);
      store.set(shape.content.data.resourceId as string, {
        kind: "chart",
        source: "created",
        data: new ArrayBuffer(0),
        parsed: chart,
      });

      const entry = store.get<Chart>(shape.content.data.resourceId as string);
      expect(entry!.parsed!.plotArea.charts[0].type).toBe(ecma);
    }
  });
});
