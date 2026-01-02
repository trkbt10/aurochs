/**
 * @file Chart trendline and error bars parser tests
 *
 * Tests based on ECMA-376 specification:
 * - Trendline: ECMA-376 Part 1, Section 21.2.2.209
 * - Error Bars: ECMA-376 Part 1, Section 21.2.2.58
 */

import { parseXml, type XmlElement } from "../../../xml/index";
import { parseChart } from "./index";

describe("Chart Trendline Parsing (ECMA-376 21.2.2.209)", () => {
  /**
   * Test linear trendline parsing
   * @see ECMA-376 Part 1, Section 21.2.3.51 (ST_TrendlineType) - "linear"
   */
  test("parses linear trendline", () => {
    const chartXml = `
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart>
          <c:plotArea>
            <c:lineChart>
              <c:ser>
                <c:idx val="0"/>
                <c:order val="0"/>
                <c:trendline>
                  <c:trendlineType val="linear"/>
                </c:trendline>
                <c:val>
                  <c:numRef>
                    <c:numCache>
                      <c:ptCount val="3"/>
                      <c:pt idx="0"><c:v>1</c:v></c:pt>
                      <c:pt idx="1"><c:v>2</c:v></c:pt>
                      <c:pt idx="2"><c:v>3</c:v></c:pt>
                    </c:numCache>
                  </c:numRef>
                </c:val>
              </c:ser>
            </c:lineChart>
          </c:plotArea>
        </c:chart>
      </c:chartSpace>
    `;

    const xml = parseXml(chartXml) as XmlElement;
    const chart = parseChart(xml);

    expect(chart).toBeDefined();
    const lineChart = chart!.plotArea.charts[0];
    expect(lineChart?.type).toBe("lineChart");

    if (lineChart?.type === "lineChart") {
      const series = lineChart.series[0];
      expect(series?.trendlines).toBeDefined();
      expect(series?.trendlines?.length).toBe(1);
      expect(series?.trendlines?.[0]?.trendlineType).toBe("linear");
    }
  });

  /**
   * Test polynomial trendline with order
   * @see ECMA-376 Part 1, Section 21.2.2.209 - order element
   */
  test("parses polynomial trendline with order", () => {
    const chartXml = `
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart>
          <c:plotArea>
            <c:scatterChart>
              <c:ser>
                <c:idx val="0"/>
                <c:order val="0"/>
                <c:trendline>
                  <c:trendlineType val="poly"/>
                  <c:order val="3"/>
                </c:trendline>
                <c:yVal>
                  <c:numRef>
                    <c:numCache>
                      <c:ptCount val="3"/>
                      <c:pt idx="0"><c:v>1</c:v></c:pt>
                    </c:numCache>
                  </c:numRef>
                </c:yVal>
              </c:ser>
            </c:scatterChart>
          </c:plotArea>
        </c:chart>
      </c:chartSpace>
    `;

    const xml = parseXml(chartXml) as XmlElement;
    const chart = parseChart(xml);

    expect(chart).toBeDefined();
    const scatterChart = chart!.plotArea.charts[0];
    expect(scatterChart?.type).toBe("scatterChart");

    if (scatterChart?.type === "scatterChart") {
      const series = scatterChart.series[0];
      expect(series?.trendlines?.[0]?.trendlineType).toBe("poly");
      expect(series?.trendlines?.[0]?.order).toBe(3);
    }
  });

  /**
   * Test moving average trendline with period
   * @see ECMA-376 Part 1, Section 21.2.2.209 - period element
   */
  test("parses moving average trendline with period", () => {
    const chartXml = `
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart>
          <c:plotArea>
            <c:lineChart>
              <c:ser>
                <c:idx val="0"/>
                <c:order val="0"/>
                <c:trendline>
                  <c:trendlineType val="movingAvg"/>
                  <c:period val="5"/>
                </c:trendline>
                <c:val>
                  <c:numRef>
                    <c:numCache>
                      <c:ptCount val="1"/>
                      <c:pt idx="0"><c:v>1</c:v></c:pt>
                    </c:numCache>
                  </c:numRef>
                </c:val>
              </c:ser>
            </c:lineChart>
          </c:plotArea>
        </c:chart>
      </c:chartSpace>
    `;

    const xml = parseXml(chartXml) as XmlElement;
    const chart = parseChart(xml);

    const lineChart = chart!.plotArea.charts[0];
    if (lineChart?.type === "lineChart") {
      const trendline = lineChart.series[0]?.trendlines?.[0];
      expect(trendline?.trendlineType).toBe("movingAvg");
      expect(trendline?.period).toBe(5);
    }
  });

  /**
   * Test trendline with forecast forward/backward
   * @see ECMA-376 Part 1, Section 21.2.2.209 - forward, backward elements
   */
  test("parses trendline with forecast extension", () => {
    const chartXml = `
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart>
          <c:plotArea>
            <c:lineChart>
              <c:ser>
                <c:idx val="0"/>
                <c:order val="0"/>
                <c:trendline>
                  <c:trendlineType val="linear"/>
                  <c:forward val="2.5"/>
                  <c:backward val="1.0"/>
                </c:trendline>
                <c:val>
                  <c:numRef>
                    <c:numCache>
                      <c:ptCount val="1"/>
                      <c:pt idx="0"><c:v>1</c:v></c:pt>
                    </c:numCache>
                  </c:numRef>
                </c:val>
              </c:ser>
            </c:lineChart>
          </c:plotArea>
        </c:chart>
      </c:chartSpace>
    `;

    const xml = parseXml(chartXml) as XmlElement;
    const chart = parseChart(xml);

    const lineChart = chart!.plotArea.charts[0];
    if (lineChart?.type === "lineChart") {
      const trendline = lineChart.series[0]?.trendlines?.[0];
      expect(trendline?.forward).toBe(2.5);
      expect(trendline?.backward).toBe(1.0);
    }
  });

  /**
   * Test trendline display options
   * @see ECMA-376 Part 1, Section 21.2.2.209 - dispRSqr, dispEq elements
   */
  test("parses trendline display options", () => {
    const chartXml = `
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart>
          <c:plotArea>
            <c:lineChart>
              <c:ser>
                <c:idx val="0"/>
                <c:order val="0"/>
                <c:trendline>
                  <c:trendlineType val="linear"/>
                  <c:dispRSqr val="1"/>
                  <c:dispEq val="1"/>
                </c:trendline>
                <c:val>
                  <c:numRef>
                    <c:numCache>
                      <c:ptCount val="1"/>
                      <c:pt idx="0"><c:v>1</c:v></c:pt>
                    </c:numCache>
                  </c:numRef>
                </c:val>
              </c:ser>
            </c:lineChart>
          </c:plotArea>
        </c:chart>
      </c:chartSpace>
    `;

    const xml = parseXml(chartXml) as XmlElement;
    const chart = parseChart(xml);

    const lineChart = chart!.plotArea.charts[0];
    if (lineChart?.type === "lineChart") {
      const trendline = lineChart.series[0]?.trendlines?.[0];
      expect(trendline?.dispRSqr).toBe(true);
      expect(trendline?.dispEq).toBe(true);
    }
  });

  /**
   * Test all trendline types per ECMA-376 ST_TrendlineType
   * @see ECMA-376 Part 1, Section 21.2.3.51
   */
  test("parses all trendline types", () => {
    const trendlineTypes = ["exp", "linear", "log", "movingAvg", "poly", "power"] as const;

    for (const type of trendlineTypes) {
      const chartXml = `
        <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart>
            <c:plotArea>
              <c:lineChart>
                <c:ser>
                  <c:idx val="0"/>
                  <c:order val="0"/>
                  <c:trendline>
                    <c:trendlineType val="${type}"/>
                  </c:trendline>
                  <c:val>
                    <c:numRef>
                      <c:numCache>
                        <c:ptCount val="1"/>
                        <c:pt idx="0"><c:v>1</c:v></c:pt>
                      </c:numCache>
                    </c:numRef>
                  </c:val>
                </c:ser>
              </c:lineChart>
            </c:plotArea>
          </c:chart>
        </c:chartSpace>
      `;

      const xml = parseXml(chartXml) as XmlElement;
      const chart = parseChart(xml);

      const lineChart = chart!.plotArea.charts[0];
      if (lineChart?.type === "lineChart") {
        expect(lineChart.series[0]?.trendlines?.[0]?.trendlineType).toBe(type);
      }
    }
  });
});

describe("Chart Error Bars Parsing (ECMA-376 21.2.2.58)", () => {
  /**
   * Test error bar with fixed value
   * @see ECMA-376 Part 1, Section 21.2.3.19 (ST_ErrValType) - "fixedVal"
   */
  test("parses fixed value error bars", () => {
    const chartXml = `
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart>
          <c:plotArea>
            <c:barChart>
              <c:ser>
                <c:idx val="0"/>
                <c:order val="0"/>
                <c:errBars>
                  <c:errDir val="y"/>
                  <c:errBarType val="both"/>
                  <c:errValType val="fixedVal"/>
                  <c:val val="5"/>
                </c:errBars>
                <c:val>
                  <c:numRef>
                    <c:numCache>
                      <c:ptCount val="1"/>
                      <c:pt idx="0"><c:v>10</c:v></c:pt>
                    </c:numCache>
                  </c:numRef>
                </c:val>
              </c:ser>
            </c:barChart>
          </c:plotArea>
        </c:chart>
      </c:chartSpace>
    `;

    const xml = parseXml(chartXml) as XmlElement;
    const chart = parseChart(xml);

    expect(chart).toBeDefined();
    const barChart = chart!.plotArea.charts[0];
    expect(barChart?.type).toBe("barChart");

    if (barChart?.type === "barChart") {
      const errBars = barChart.series[0]?.errorBars?.[0];
      expect(errBars).toBeDefined();
      expect(errBars?.errDir).toBe("y");
      expect(errBars?.errBarType).toBe("both");
      expect(errBars?.errValType).toBe("fixedVal");
      expect(errBars?.val).toBe(5);
    }
  });

  /**
   * Test error bar types per ECMA-376 ST_ErrBarType
   * @see ECMA-376 Part 1, Section 21.2.3.18
   */
  test("parses error bar types: both, minus, plus", () => {
    const errBarTypes = ["both", "minus", "plus"] as const;

    for (const barType of errBarTypes) {
      const chartXml = `
        <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart>
            <c:plotArea>
              <c:lineChart>
                <c:ser>
                  <c:idx val="0"/>
                  <c:order val="0"/>
                  <c:errBars>
                    <c:errBarType val="${barType}"/>
                    <c:errValType val="fixedVal"/>
                    <c:val val="1"/>
                  </c:errBars>
                  <c:val>
                    <c:numRef>
                      <c:numCache>
                        <c:ptCount val="1"/>
                        <c:pt idx="0"><c:v>1</c:v></c:pt>
                      </c:numCache>
                    </c:numRef>
                  </c:val>
                </c:ser>
              </c:lineChart>
            </c:plotArea>
          </c:chart>
        </c:chartSpace>
      `;

      const xml = parseXml(chartXml) as XmlElement;
      const chart = parseChart(xml);

      const lineChart = chart!.plotArea.charts[0];
      if (lineChart?.type === "lineChart") {
        expect(lineChart.series[0]?.errorBars?.[0]?.errBarType).toBe(barType);
      }
    }
  });

  /**
   * Test error value types per ECMA-376 ST_ErrValType
   * @see ECMA-376 Part 1, Section 21.2.3.19
   */
  test("parses error value types: fixedVal, percentage, stdDev, stdErr", () => {
    const errValTypes = ["fixedVal", "percentage", "stdDev", "stdErr"] as const;

    for (const valType of errValTypes) {
      const chartXml = `
        <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart>
            <c:plotArea>
              <c:lineChart>
                <c:ser>
                  <c:idx val="0"/>
                  <c:order val="0"/>
                  <c:errBars>
                    <c:errBarType val="both"/>
                    <c:errValType val="${valType}"/>
                    <c:val val="10"/>
                  </c:errBars>
                  <c:val>
                    <c:numRef>
                      <c:numCache>
                        <c:ptCount val="1"/>
                        <c:pt idx="0"><c:v>1</c:v></c:pt>
                      </c:numCache>
                    </c:numRef>
                  </c:val>
                </c:ser>
              </c:lineChart>
            </c:plotArea>
          </c:chart>
        </c:chartSpace>
      `;

      const xml = parseXml(chartXml) as XmlElement;
      const chart = parseChart(xml);

      const lineChart = chart!.plotArea.charts[0];
      if (lineChart?.type === "lineChart") {
        expect(lineChart.series[0]?.errorBars?.[0]?.errValType).toBe(valType);
      }
    }
  });

  /**
   * Test error bar direction per ECMA-376 ST_ErrDir
   * @see ECMA-376 Part 1, Section 21.2.3.17
   */
  test("parses error bar direction: x and y", () => {
    const directions = ["x", "y"] as const;

    for (const dir of directions) {
      const chartXml = `
        <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart>
            <c:plotArea>
              <c:scatterChart>
                <c:ser>
                  <c:idx val="0"/>
                  <c:order val="0"/>
                  <c:errBars>
                    <c:errDir val="${dir}"/>
                    <c:errBarType val="both"/>
                    <c:errValType val="fixedVal"/>
                    <c:val val="1"/>
                  </c:errBars>
                  <c:yVal>
                    <c:numRef>
                      <c:numCache>
                        <c:ptCount val="1"/>
                        <c:pt idx="0"><c:v>1</c:v></c:pt>
                      </c:numCache>
                    </c:numRef>
                  </c:yVal>
                </c:ser>
              </c:scatterChart>
            </c:plotArea>
          </c:chart>
        </c:chartSpace>
      `;

      const xml = parseXml(chartXml) as XmlElement;
      const chart = parseChart(xml);

      const scatterChart = chart!.plotArea.charts[0];
      if (scatterChart?.type === "scatterChart") {
        expect(scatterChart.series[0]?.errorBars?.[0]?.errDir).toBe(dir);
      }
    }
  });

  /**
   * Test noEndCap attribute
   * @see ECMA-376 Part 1, Section 21.2.2.58 - noEndCap element
   */
  test("parses noEndCap attribute", () => {
    const chartXml = `
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart>
          <c:plotArea>
            <c:lineChart>
              <c:ser>
                <c:idx val="0"/>
                <c:order val="0"/>
                <c:errBars>
                  <c:errBarType val="both"/>
                  <c:errValType val="fixedVal"/>
                  <c:noEndCap val="1"/>
                  <c:val val="1"/>
                </c:errBars>
                <c:val>
                  <c:numRef>
                    <c:numCache>
                      <c:ptCount val="1"/>
                      <c:pt idx="0"><c:v>1</c:v></c:pt>
                    </c:numCache>
                  </c:numRef>
                </c:val>
              </c:ser>
            </c:lineChart>
          </c:plotArea>
        </c:chart>
      </c:chartSpace>
    `;

    const xml = parseXml(chartXml) as XmlElement;
    const chart = parseChart(xml);

    const lineChart = chart!.plotArea.charts[0];
    if (lineChart?.type === "lineChart") {
      expect(lineChart.series[0]?.errorBars?.[0]?.noEndCap).toBe(true);
    }
  });

  /**
   * Test series with both trendline and error bars
   * @see ECMA-376 Part 1, Section 21.2.2.163 (ser) - can contain both
   */
  test("parses series with both trendline and error bars", () => {
    const chartXml = `
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart>
          <c:plotArea>
            <c:lineChart>
              <c:ser>
                <c:idx val="0"/>
                <c:order val="0"/>
                <c:trendline>
                  <c:trendlineType val="linear"/>
                </c:trendline>
                <c:errBars>
                  <c:errBarType val="both"/>
                  <c:errValType val="percentage"/>
                  <c:val val="10"/>
                </c:errBars>
                <c:val>
                  <c:numRef>
                    <c:numCache>
                      <c:ptCount val="1"/>
                      <c:pt idx="0"><c:v>100</c:v></c:pt>
                    </c:numCache>
                  </c:numRef>
                </c:val>
              </c:ser>
            </c:lineChart>
          </c:plotArea>
        </c:chart>
      </c:chartSpace>
    `;

    const xml = parseXml(chartXml) as XmlElement;
    const chart = parseChart(xml);

    const lineChart = chart!.plotArea.charts[0];
    if (lineChart?.type === "lineChart") {
      const series = lineChart.series[0];
      expect(series?.trendlines).toBeDefined();
      expect(series?.trendlines?.[0]?.trendlineType).toBe("linear");
      expect(series?.errorBars).toBeDefined();
      expect(series?.errorBars?.[0]?.errValType).toBe("percentage");
      expect(series?.errorBars?.[0]?.val).toBe(10);
    }
  });
});
