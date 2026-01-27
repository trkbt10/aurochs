import { getByPath, getChild, getChildren, getTextByPath, parseXml } from "@oxen/xml";
import { patchChartData } from "./chart-data-patcher";

function getFirstLineChartSeries(doc: ReturnType<typeof parseXml>) {
  const plotArea = getByPath(doc, ["c:chartSpace", "c:chart", "c:plotArea"]);
  if (!plotArea) {
    throw new Error("test: missing c:plotArea");
  }
  const lineChart = getChild(plotArea, "c:lineChart");
  if (!lineChart) {
    throw new Error("test: missing c:lineChart");
  }
  return getChildren(lineChart, "c:ser");
}

function getCategoryValues(ser: ReturnType<typeof getFirstLineChartSeries>[number]): string[] {
  const cat = getChild(ser, "c:cat");
  if (!cat) {
    throw new Error("test: missing c:cat");
  }
  const strLit = getChild(cat, "c:strLit");
  const strRef = getChild(cat, "c:strRef");
  const cache = strLit ? strLit : strRef ? getChild(strRef, "c:strCache") : undefined;
  if (!cache) {
    throw new Error("test: missing category cache");
  }
  return getChildren(cache, "c:pt").map((pt) => getTextByPath(pt, ["c:v"]) ?? "");
}

function getValueNumbers(ser: ReturnType<typeof getFirstLineChartSeries>[number]): number[] {
  const val = getChild(ser, "c:val");
  if (!val) {
    throw new Error("test: missing c:val");
  }
  const numLit = getChild(val, "c:numLit");
  const numRef = getChild(val, "c:numRef");
  const cache = numLit ? numLit : numRef ? getChild(numRef, "c:numCache") : undefined;
  if (!cache) {
    throw new Error("test: missing value cache");
  }
  return getChildren(cache, "c:pt").map((pt) => Number(getTextByPath(pt, ["c:v"]) ?? "NaN"));
}

function getSeriesName(ser: ReturnType<typeof getFirstLineChartSeries>[number]): string | undefined {
  return getTextByPath(ser, ["c:tx", "c:v"]);
}

describe("patchChartData", () => {
  const base = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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

  it("updates category labels", () => {
    const doc = parseXml(base);
    const patched = patchChartData(doc, {
      categories: ["X", "Y"],
      series: [{ name: "Series 1", values: [1, 2] }],
    });

    const serEl = getFirstLineChartSeries(patched)[0];
    if (!serEl) {
      throw new Error("test: missing c:ser");
    }
    expect(getCategoryValues(serEl)).toEqual(["X", "Y"]);
  });

  it("updates series values", () => {
    const doc = parseXml(base);
    const patched = patchChartData(doc, {
      categories: ["A", "B"],
      series: [{ name: "Series 1", values: [10, 20] }],
    });

    const serEl = getFirstLineChartSeries(patched)[0];
    if (!serEl) {
      throw new Error("test: missing c:ser");
    }
    expect(getValueNumbers(serEl)).toEqual([10, 20]);
  });

  it("updates series name", () => {
    const doc = parseXml(base);
    const patched = patchChartData(doc, {
      categories: ["A", "B"],
      series: [{ name: "Renamed", values: [1, 2] }],
    });

    const serEl = getFirstLineChartSeries(patched)[0];
    if (!serEl) {
      throw new Error("test: missing c:ser");
    }
    expect(getSeriesName(serEl)).toBe("Renamed");
  });

  it("expands point ranges", () => {
    const doc = parseXml(base);
    const patched = patchChartData(doc, {
      categories: ["A", "B", "C"],
      series: [{ name: "Series 1", values: [1, 2, 3] }],
    });

    const serEl = getFirstLineChartSeries(patched)[0];
    if (!serEl) {
      throw new Error("test: missing c:ser");
    }
    expect(getCategoryValues(serEl)).toEqual(["A", "B", "C"]);
    expect(getValueNumbers(serEl)).toEqual([1, 2, 3]);
  });
});
