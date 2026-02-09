/** @file Unit tests for chart patching operations */
import { getByPath, getChild, getChildren, getTextByPath, parseXml, createElement } from "@aurochs/xml";
import { deg, px } from "@aurochs-office/drawing-ml/domain/units";
import { patchChart, patchChartElement, patchChartTransform } from "./chart-patcher";

describe("chart-patcher", () => {
  const graphicFrameXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:graphicFrame xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:nvGraphicFramePr>
    <p:cNvPr id="4" name="Chart 1"/>
    <p:cNvGraphicFramePr/>
    <p:nvPr/>
  </p:nvGraphicFramePr>
  <p:xfrm>
    <a:off x="0" y="0"/>
    <a:ext cx="100" cy="200"/>
  </p:xfrm>
  <a:graphic>
    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart r:id="rId2"/>
    </a:graphicData>
  </a:graphic>
</p:graphicFrame>`;

  const chartXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <c:chart>
    <c:plotArea>
      <c:lineChart>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:tx><c:v>Series 1</c:v></c:tx>
          <c:cat>
            <c:strLit>
              <c:ptCount val="2"/>
              <c:pt idx="0"><c:v>A</c:v></c:pt>
              <c:pt idx="1"><c:v>B</c:v></c:pt>
            </c:strLit>
          </c:cat>
          <c:val>
            <c:numLit>
              <c:ptCount val="2"/>
              <c:pt idx="0"><c:v>1</c:v></c:pt>
              <c:pt idx="1"><c:v>2</c:v></c:pt>
            </c:numLit>
          </c:val>
        </c:ser>
      </c:lineChart>
    </c:plotArea>
  </c:chart>
</c:chartSpace>`;

  it("updates chart title (slide label + chart part title)", () => {
    const frame = parseXml(graphicFrameXml).children.find((c) => c.type === "element");
    if (!frame || frame.type !== "element") {
      throw new Error("test: missing frame");
    }
    const doc = parseXml(chartXml);

    const result = patchChart({ graphicFrame: frame, chartXml: doc }, [{ type: "title", value: "New Title" }]);

    const cNvPr = getByPath(result.graphicFrame, ["p:nvGraphicFramePr", "p:cNvPr"]);
    expect(cNvPr?.attrs.name).toBe("New Title");

    const titleText = getTextByPath(result.chartXml, [
      "c:chartSpace",
      "c:chart",
      "c:title",
      "c:tx",
      "c:rich",
      "a:p",
      "a:r",
      "a:t",
    ]);
    expect(titleText).toBe("New Title");
  });

  it("updates chart position and size (p:xfrm)", () => {
    const frame = parseXml(graphicFrameXml).children.find((c) => c.type === "element");
    if (!frame || frame.type !== "element") {
      throw new Error("test: missing frame");
    }

    const patched = patchChartTransform(frame, {
      x: px(10),
      y: px(20),
      width: px(30),
      height: px(40),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    });

    const xfrm = getChild(patched, "p:xfrm");
    expect(getChild(xfrm!, "a:off")?.attrs.x).toBeDefined();
    expect(getChild(xfrm!, "a:off")?.attrs.y).toBeDefined();
    expect(getChild(xfrm!, "a:ext")?.attrs.cx).toBeDefined();
    expect(getChild(xfrm!, "a:ext")?.attrs.cy).toBeDefined();
  });

  it("adds a series via data patch", () => {
    const frame = parseXml(graphicFrameXml).children.find((c) => c.type === "element");
    if (!frame || frame.type !== "element") {
      throw new Error("test: missing frame");
    }
    const doc = parseXml(chartXml);

    const result = patchChart({ graphicFrame: frame, chartXml: doc }, [
      {
        type: "data",
        data: {
          categories: ["A", "B"],
          series: [
            { name: "Series 1", values: [1, 2] },
            { name: "Series 2", values: [3, 4] },
          ],
        },
      },
    ]);

    const plotArea = getByPath(result.chartXml, ["c:chartSpace", "c:chart", "c:plotArea"]);
    const lineChart = plotArea ? getChild(plotArea, "c:lineChart") : undefined;
    const series = lineChart ? getChildren(lineChart, "c:ser") : [];
    expect(series).toHaveLength(2);
  });

  it("applies style change via patchChart", () => {
    const frame = parseXml(graphicFrameXml).children.find((c) => c.type === "element");
    if (!frame || frame.type !== "element") {
      throw new Error("test: missing frame");
    }
    const doc = parseXml(chartXml);

    const result = patchChart({ graphicFrame: frame, chartXml: doc }, [
      { type: "style", style: { styleId: 5 } },
    ]);

    // Style is applied to chart XML, frame should remain unchanged structurally
    expect(result.graphicFrame.name).toBe("p:graphicFrame");
    expect(result.chartXml).toBeDefined();
  });

  it("applies multiple changes in one patchChart call", () => {
    const frame = parseXml(graphicFrameXml).children.find((c) => c.type === "element");
    if (!frame || frame.type !== "element") {
      throw new Error("test: missing frame");
    }
    const doc = parseXml(chartXml);

    const result = patchChart({ graphicFrame: frame, chartXml: doc }, [
      { type: "title", value: "Combined" },
      {
        type: "data",
        data: {
          categories: ["X", "Y"],
          series: [{ name: "S1", values: [10, 20] }],
        },
      },
      { type: "style", style: { styleId: 3 } },
    ]);

    const cNvPr = getByPath(result.graphicFrame, ["p:nvGraphicFramePr", "p:cNvPr"]);
    expect(cNvPr?.attrs.name).toBe("Combined");
  });

  it("handles empty changes array", () => {
    const frame = parseXml(graphicFrameXml).children.find((c) => c.type === "element");
    if (!frame || frame.type !== "element") {
      throw new Error("test: missing frame");
    }
    const doc = parseXml(chartXml);

    const result = patchChart({ graphicFrame: frame, chartXml: doc }, []);
    expect(result.graphicFrame).toBe(frame);
    expect(result.chartXml).toBe(doc);
  });
});

// =============================================================================
// patchChartElement
// =============================================================================

describe("patchChartElement", () => {
  it("throws when element is not p:graphicFrame", () => {
    const el = createElement("p:sp", {}, []);
    expect(() => patchChartElement(el, [])).toThrow("expected p:graphicFrame, got p:sp");
  });

  it("returns unchanged element for empty changes", () => {
    const gf = createElement("p:graphicFrame", {}, []);
    const result = patchChartElement(gf, []);
    expect(result).toBe(gf);
  });

  it("ignores data and style changes (those go to chart part)", () => {
    const gf = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [
        createElement("p:cNvPr", { id: "1", name: "Chart" }),
      ]),
    ]);
    const result = patchChartElement(gf, [
      { type: "data", data: { categories: ["A"], series: [{ name: "S", values: [1] }] } },
      { type: "style", style: { styleId: 2 } },
    ]);
    // Should not throw, and frame should be unchanged since data/style don't modify it
    expect(result.name).toBe("p:graphicFrame");
  });

  it("updates title on graphicFrame", () => {
    const gf = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, [
        createElement("p:cNvPr", { id: "1", name: "Old Title" }),
      ]),
    ]);
    const result = patchChartElement(gf, [{ type: "title", value: "New Title" }]);
    const cNvPr = getByPath(result, ["p:nvGraphicFramePr", "p:cNvPr"]);
    expect(cNvPr?.attrs.name).toBe("New Title");
  });

  it("throws when p:nvGraphicFramePr is missing during title patch", () => {
    const gf = createElement("p:graphicFrame", {}, []);
    expect(() => patchChartElement(gf, [{ type: "title", value: "Fail" }])).toThrow(
      "missing required child: p:nvGraphicFramePr",
    );
  });

  it("throws when p:cNvPr is missing during title patch", () => {
    const gf = createElement("p:graphicFrame", {}, [
      createElement("p:nvGraphicFramePr", {}, []),
    ]);
    expect(() => patchChartElement(gf, [{ type: "title", value: "Fail" }])).toThrow(
      "missing required child: p:cNvPr",
    );
  });
});

// =============================================================================
// patchChartTransform error cases
// =============================================================================

describe("patchChartTransform error cases", () => {
  it("throws when element is not p:graphicFrame", () => {
    const el = createElement("p:sp", {}, []);
    expect(() =>
      patchChartTransform(el, {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      }),
    ).toThrow("expected p:graphicFrame, got p:sp");
  });

  it("throws when p:xfrm is missing", () => {
    const gf = createElement("p:graphicFrame", {}, []);
    expect(() =>
      patchChartTransform(gf, {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      }),
    ).toThrow("missing p:xfrm");
  });
});
