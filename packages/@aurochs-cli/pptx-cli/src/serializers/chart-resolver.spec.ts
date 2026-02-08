/**
 * @file Tests for chart-resolver
 */

import { resolveChartsForSlide } from "./chart-resolver";

describe("chart-resolver", () => {
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>`;

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

  it("resolves chart parts via slide .rels and parses summary", () => {
    const files = new Map<string, string>([
      ["ppt/slides/_rels/slide1.xml.rels", relsXml],
      ["ppt/charts/chart1.xml", chartXml],
    ]);

    const zipPackage = {
      readText: (path: string) => files.get(path) ?? null,
    };

    const result = resolveChartsForSlide({
      zipPackage,
      slideFilename: "slide1",
      chartResourceIds: ["rId2"],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.error).toBeUndefined();
    expect(result[0]?.partPath).toBe("ppt/charts/chart1.xml");
    expect(result[0]?.chart?.types).toEqual(["lineChart"]);

    const series0 = result[0]?.chart?.series[0];
    expect(series0?.type).toBe("lineChart");
    expect(series0?.items[0]?.name).toBe("Series 1");
    expect(series0?.items[0]?.categories?.values).toEqual(["A", "B"]);
    expect(series0?.items[0]?.values?.values).toEqual([1, 2]);
  });

  it("returns an error when slide relationships are missing", () => {
    const zipPackage = {
      readText: (_path: string) => null,
    };

    const result = resolveChartsForSlide({
      zipPackage,
      slideFilename: "slide1",
      chartResourceIds: ["rId2"],
    });

    expect(result).toEqual([
      {
        resourceId: "rId2",
        error: "Could not read slide relationships: ppt/slides/_rels/slide1.xml.rels",
      },
    ]);
  });
});

