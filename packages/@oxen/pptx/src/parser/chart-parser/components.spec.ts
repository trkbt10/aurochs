/**
 * @file Tests for chart component parsing (markers, data labels, data points, trendlines, error bars)
 *
 * @see ECMA-376 Part 1, Section 21.2.2 - Chart Elements
 */

import type { XmlElement } from "@oxen/xml";
import {
  parseMarker,
  parseDataPoints,
  parseDataLabel,
  parseDataLabels,
  parseTrendlineLabel,
  parseTrendline,
  parseTrendlines,
  parseErrorBarsElement,
  parseErrorBars,
  parseUpDownBars,
} from "./components";

// Helper to create mock XmlElement
function el(
  name: string,
  attrs: Record<string, string> = {},
  children: (XmlElement | { type: "text"; value: string })[] = [],
): XmlElement {
  return { type: "element", name, attrs, children };
}

// Helper to create text element
function text(value: string): { type: "text"; value: string } {
  return { type: "text", value };
}

// =============================================================================
// parseMarker (ECMA-376 Section 21.2.2.97)
// =============================================================================

describe("parseMarker - c:marker (ECMA-376 Section 21.2.2.97)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseMarker(undefined)).toBeUndefined();
  });

  it("returns undefined when c:symbol is missing", () => {
    const marker = el("c:marker", {}, []);
    expect(parseMarker(marker)).toBeUndefined();
  });

  it("parses circle marker", () => {
    const marker = el("c:marker", {}, [el("c:symbol", { val: "circle" })]);
    const result = parseMarker(marker);

    expect(result).toBeDefined();
    expect(result?.symbol).toBe("circle");
  });

  it("parses diamond marker with size", () => {
    const marker = el("c:marker", {}, [el("c:symbol", { val: "diamond" }), el("c:size", { val: "8" })]);
    const result = parseMarker(marker);

    expect(result?.symbol).toBe("diamond");
    expect(result?.size).toBe(8); // Points branded type
  });

  it("parses marker with shape properties", () => {
    const marker = el("c:marker", {}, [
      el("c:symbol", { val: "square" }),
      el("c:spPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FF0000" })])]),
    ]);
    const result = parseMarker(marker);

    expect(result?.symbol).toBe("square");
    expect(result?.shapeProperties).toBeDefined();
  });

  it("returns undefined for unknown marker symbol", () => {
    const marker = el("c:marker", {}, [el("c:symbol", { val: "unknown" })]);
    expect(parseMarker(marker)).toBeUndefined();
  });

  it("parses none marker (hidden)", () => {
    const marker = el("c:marker", {}, [el("c:symbol", { val: "none" })]);
    const result = parseMarker(marker);

    expect(result?.symbol).toBe("none");
  });
});

// =============================================================================
// parseDataPoints (ECMA-376 Section 21.2.2.52)
// =============================================================================

describe("parseDataPoints - c:dPt (ECMA-376 Section 21.2.2.52)", () => {
  it("returns undefined when no c:dPt elements exist", () => {
    const ser = el("c:ser", {}, []);
    expect(parseDataPoints(ser)).toBeUndefined();
  });

  it("parses single data point", () => {
    const ser = el("c:ser", {}, [el("c:dPt", {}, [el("c:idx", { val: "0" })])]);
    const result = parseDataPoints(ser);

    expect(result).toBeDefined();
    expect(result?.length).toBe(1);
    expect(result?.[0].idx).toBe(0);
  });

  it("parses multiple data points", () => {
    const ser = el("c:ser", {}, [
      el("c:dPt", {}, [el("c:idx", { val: "0" })]),
      el("c:dPt", {}, [el("c:idx", { val: "2" })]),
      el("c:dPt", {}, [el("c:idx", { val: "5" })]),
    ]);
    const result = parseDataPoints(ser);

    expect(result?.length).toBe(3);
    expect(result?.[0].idx).toBe(0);
    expect(result?.[1].idx).toBe(2);
    expect(result?.[2].idx).toBe(5);
  });

  it("parses data point with invertIfNegative", () => {
    const ser = el("c:ser", {}, [el("c:dPt", {}, [el("c:idx", { val: "0" }), el("c:invertIfNegative", { val: "1" })])]);
    const result = parseDataPoints(ser);

    expect(result?.[0].invertIfNegative).toBe(true);
  });

  it("parses data point with bubble3D", () => {
    const ser = el("c:ser", {}, [el("c:dPt", {}, [el("c:idx", { val: "0" }), el("c:bubble3D", { val: "1" })])]);
    const result = parseDataPoints(ser);

    expect(result?.[0].bubble3D).toBe(true);
  });

  it("parses data point with explosion (pie chart)", () => {
    const ser = el("c:ser", {}, [el("c:dPt", {}, [el("c:idx", { val: "0" }), el("c:explosion", { val: "25" })])]);
    const result = parseDataPoints(ser);

    expect(result?.[0].explosion).toBe(25); // Percent branded type
  });

  it("skips data point without idx element", () => {
    const ser = el("c:ser", {}, [el("c:dPt", {}, [el("c:explosion", { val: "25" })])]);
    const result = parseDataPoints(ser);

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseDataLabels (ECMA-376 Section 21.2.2.49)
// =============================================================================

describe("parseDataLabels - c:dLbls (ECMA-376 Section 21.2.2.49)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseDataLabels(undefined)).toBeUndefined();
  });

  it("parses showVal flag", () => {
    const dLbls = el("c:dLbls", {}, [el("c:showVal", { val: "1" })]);
    const result = parseDataLabels(dLbls);

    expect(result?.showVal).toBe(true);
  });

  it("parses all show flags", () => {
    const dLbls = el("c:dLbls", {}, [
      el("c:showLegendKey", { val: "1" }),
      el("c:showVal", { val: "1" }),
      el("c:showCatName", { val: "0" }),
      el("c:showSerName", { val: "1" }),
      el("c:showPercent", { val: "1" }),
      el("c:showBubbleSize", { val: "0" }),
    ]);
    const result = parseDataLabels(dLbls);

    expect(result?.showLegendKey).toBe(true);
    expect(result?.showVal).toBe(true);
    expect(result?.showCatName).toBe(false);
    expect(result?.showSerName).toBe(true);
    expect(result?.showPercent).toBe(true);
    expect(result?.showBubbleSize).toBe(false);
  });

  it("parses separator", () => {
    const dLbls = el("c:dLbls", {}, [el("c:separator", {}, [text(", ")])]);
    const result = parseDataLabels(dLbls);

    expect(result?.separator).toBe(", ");
  });

  it("parses position", () => {
    const dLbls = el("c:dLbls", {}, [el("c:dLblPos", { val: "outEnd" })]);
    const result = parseDataLabels(dLbls);

    expect(result?.position).toBe("outEnd");
  });

  it("parses number format", () => {
    const dLbls = el("c:dLbls", {}, [el("c:numFmt", { formatCode: "0.00" })]);
    const result = parseDataLabels(dLbls);

    expect(result?.numFormat).toBe("0.00");
  });

  it("parses delete flag", () => {
    const dLbls = el("c:dLbls", {}, [el("c:delete", { val: "1" })]);
    const result = parseDataLabels(dLbls);

    expect(result?.delete).toBe(true);
  });

  it("parses individual data labels", () => {
    const dLbls = el("c:dLbls", {}, [
      el("c:dLbl", {}, [el("c:idx", { val: "0" }), el("c:showVal", { val: "1" })]),
      el("c:dLbl", {}, [el("c:idx", { val: "1" }), el("c:showCatName", { val: "1" })]),
    ]);
    const result = parseDataLabels(dLbls);

    expect(result?.labels?.length).toBe(2);
    expect(result?.labels?.[0].showVal).toBe(true);
    expect(result?.labels?.[1].showCatName).toBe(true);
  });

  it("parses showLeaderLines", () => {
    const dLbls = el("c:dLbls", {}, [el("c:showLeaderLines", { val: "1" })]);
    const result = parseDataLabels(dLbls);

    expect(result?.showLeaderLines).toBe(true);
  });

  it("parses leaderLines with shape properties", () => {
    const dLbls = el("c:dLbls", {}, [el("c:leaderLines", {}, [el("c:spPr", {}, [])])]);
    const result = parseDataLabels(dLbls);

    expect(result?.leaderLines).toBeDefined();
  });
});

// =============================================================================
// parseDataLabel (ECMA-376 Section 21.2.2.47)
// =============================================================================

describe("parseDataLabel - c:dLbl (ECMA-376 Section 21.2.2.47)", () => {
  it("returns undefined when idx is missing", () => {
    const dLbl = el("c:dLbl", {}, [el("c:showVal", { val: "1" })]);
    expect(parseDataLabel(dLbl)).toBeUndefined();
  });

  it("parses delete label", () => {
    const dLbl = el("c:dLbl", {}, [el("c:idx", { val: "2" }), el("c:delete", { val: "1" })]);
    const result = parseDataLabel(dLbl);

    expect(result?.idx).toBe(2);
    expect(result?.delete).toBe(true);
  });

  it("parses label shared fields", () => {
    const dLbl = el("c:dLbl", {}, [
      el("c:idx", { val: "3" }),
      el("c:numFmt", { formatCode: "0.0%" }),
      el("c:dLblPos", { val: "inEnd" }),
      el("c:showPercent", { val: "1" }),
    ]);
    const result = parseDataLabel(dLbl);

    expect(result?.idx).toBe(3);
    expect(result?.numFormat).toBe("0.0%");
    expect(result?.position).toBe("inEnd");
    expect(result?.showPercent).toBe(true);
  });
});

// =============================================================================
// parseTrendline (ECMA-376 Section 21.2.2.209)
// =============================================================================

describe("parseTrendline - c:trendline (ECMA-376 Section 21.2.2.209)", () => {
  it("parses linear trendline", () => {
    const trendline = el("c:trendline", {}, [el("c:trendlineType", { val: "linear" })]);
    const result = parseTrendline(trendline);

    expect(result.trendlineType).toBe("linear");
  });

  it("parses exponential trendline", () => {
    const trendline = el("c:trendline", {}, [el("c:trendlineType", { val: "exp" })]);
    const result = parseTrendline(trendline);

    expect(result.trendlineType).toBe("exp");
  });

  it("parses polynomial trendline with order", () => {
    const trendline = el("c:trendline", {}, [el("c:trendlineType", { val: "poly" }), el("c:order", { val: "3" })]);
    const result = parseTrendline(trendline);

    expect(result.trendlineType).toBe("poly");
    expect(result.order).toBe(3);
  });

  it("parses moving average with period", () => {
    const trendline = el("c:trendline", {}, [
      el("c:trendlineType", { val: "movingAvg" }),
      el("c:period", { val: "5" }),
    ]);
    const result = parseTrendline(trendline);

    expect(result.trendlineType).toBe("movingAvg");
    expect(result.period).toBe(5);
  });

  it("parses trendline with forward/backward projection", () => {
    const trendline = el("c:trendline", {}, [
      el("c:trendlineType", { val: "linear" }),
      el("c:forward", { val: "2.5" }),
      el("c:backward", { val: "1.0" }),
    ]);
    const result = parseTrendline(trendline);

    expect(result.forward).toBe(2.5);
    expect(result.backward).toBe(1);
  });

  it("parses trendline with intercept", () => {
    const trendline = el("c:trendline", {}, [
      el("c:trendlineType", { val: "linear" }),
      el("c:intercept", { val: "0" }),
    ]);
    const result = parseTrendline(trendline);

    expect(result.intercept).toBe(0);
  });

  it("parses trendline with display options", () => {
    const trendline = el("c:trendline", {}, [
      el("c:trendlineType", { val: "linear" }),
      el("c:dispRSqr", { val: "1" }),
      el("c:dispEq", { val: "1" }),
    ]);
    const result = parseTrendline(trendline);

    expect(result.dispRSqr).toBe(true);
    expect(result.dispEq).toBe(true);
  });

  it("parses trendline with name", () => {
    const trendline = el("c:trendline", {}, [
      el("c:name", {}, [text("Linear (Sales)")]),
      el("c:trendlineType", { val: "linear" }),
    ]);
    const result = parseTrendline(trendline);

    expect(result.name).toBe("Linear (Sales)");
  });
});

// =============================================================================
// parseTrendlines (ECMA-376 Section 21.2.2.209)
// =============================================================================

describe("parseTrendlines - c:trendline collection", () => {
  it("returns undefined when no trendlines exist", () => {
    const ser = el("c:ser", {}, []);
    expect(parseTrendlines(ser)).toBeUndefined();
  });

  it("parses multiple trendlines", () => {
    const ser = el("c:ser", {}, [
      el("c:trendline", {}, [el("c:trendlineType", { val: "linear" })]),
      el("c:trendline", {}, [el("c:trendlineType", { val: "exp" })]),
    ]);
    const result = parseTrendlines(ser);

    expect(result?.length).toBe(2);
    expect(result?.[0].trendlineType).toBe("linear");
    expect(result?.[1].trendlineType).toBe("exp");
  });
});

// =============================================================================
// parseTrendlineLabel (ECMA-376 Section 21.2.2.210)
// =============================================================================

describe("parseTrendlineLabel - c:trendlineLbl (ECMA-376 Section 21.2.2.210)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseTrendlineLabel(undefined)).toBeUndefined();
  });

  it("parses trendline label with number format", () => {
    const lbl = el("c:trendlineLbl", {}, [el("c:numFmt", { formatCode: "0.00" })]);
    const result = parseTrendlineLabel(lbl);

    expect(result?.numFormat).toBe("0.00");
  });

  it("parses trendline label with layout", () => {
    const lbl = el("c:trendlineLbl", {}, [
      el("c:layout", {}, [el("c:manualLayout", {}, [el("c:x", { val: "0.1" }), el("c:y", { val: "0.2" })])]),
    ]);
    const result = parseTrendlineLabel(lbl);

    expect(result?.layout).toBeDefined();
    expect(result?.layout?.manualLayout?.x).toBe(0.1);
  });
});

// =============================================================================
// parseErrorBarsElement (ECMA-376 Section 21.2.2.58)
// =============================================================================

describe("parseErrorBarsElement - c:errBars (ECMA-376 Section 21.2.2.58)", () => {
  it("parses error bar direction", () => {
    const errBars = el("c:errBars", {}, [el("c:errDir", { val: "y" })]);
    const result = parseErrorBarsElement(errBars);

    expect(result.errDir).toBe("y");
  });

  it("parses error bar type (both)", () => {
    const errBars = el("c:errBars", {}, [el("c:errBarType", { val: "both" })]);
    const result = parseErrorBarsElement(errBars);

    expect(result.errBarType).toBe("both");
  });

  it("parses error bar type (plus/minus)", () => {
    const errBarsPlus = el("c:errBars", {}, [el("c:errBarType", { val: "plus" })]);
    const errBarsMinus = el("c:errBars", {}, [el("c:errBarType", { val: "minus" })]);

    expect(parseErrorBarsElement(errBarsPlus).errBarType).toBe("plus");
    expect(parseErrorBarsElement(errBarsMinus).errBarType).toBe("minus");
  });

  it("parses error value type", () => {
    const errBars = el("c:errBars", {}, [el("c:errValType", { val: "percentage" })]);
    const result = parseErrorBarsElement(errBars);

    expect(result.errValType).toBe("percentage");
  });

  it("parses fixed value error bars", () => {
    const errBars = el("c:errBars", {}, [el("c:errValType", { val: "fixedVal" }), el("c:val", { val: "5" })]);
    const result = parseErrorBarsElement(errBars);

    expect(result.errValType).toBe("fixedVal");
    expect(result.val).toBe(5);
  });

  it("parses noEndCap option", () => {
    const errBars = el("c:errBars", {}, [el("c:noEndCap", { val: "1" })]);
    const result = parseErrorBarsElement(errBars);

    expect(result.noEndCap).toBe(true);
  });

  it("parses custom error bars with plus/minus references", () => {
    const errBars = el("c:errBars", {}, [
      el("c:errValType", { val: "cust" }),
      el("c:plus", {}, [el("c:numRef", {}, [el("c:f", {}, [text("Sheet1!$A$1:$A$3")])])]),
      el("c:minus", {}, [el("c:numRef", {}, [el("c:f", {}, [text("Sheet1!$B$1:$B$3")])])]),
    ]);
    const result = parseErrorBarsElement(errBars);

    expect(result.errValType).toBe("cust");
    expect(result.plus?.numRef?.formula).toBe("Sheet1!$A$1:$A$3");
    expect(result.minus?.numRef?.formula).toBe("Sheet1!$B$1:$B$3");
  });
});

// =============================================================================
// parseErrorBars collection
// =============================================================================

describe("parseErrorBars - c:errBars collection", () => {
  it("returns undefined when no error bars exist", () => {
    const ser = el("c:ser", {}, []);
    expect(parseErrorBars(ser)).toBeUndefined();
  });

  it("parses multiple error bars (x and y)", () => {
    const ser = el("c:ser", {}, [
      el("c:errBars", {}, [el("c:errDir", { val: "x" })]),
      el("c:errBars", {}, [el("c:errDir", { val: "y" })]),
    ]);
    const result = parseErrorBars(ser);

    expect(result?.length).toBe(2);
    expect(result?.[0].errDir).toBe("x");
    expect(result?.[1].errDir).toBe("y");
  });
});

// =============================================================================
// parseUpDownBars (ECMA-376 Section 21.2.2.221)
// =============================================================================

describe("parseUpDownBars - c:upDownBars (ECMA-376 Section 21.2.2.221)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseUpDownBars(undefined)).toBeUndefined();
  });

  it("parses gap width", () => {
    const upDownBars = el("c:upDownBars", {}, [el("c:gapWidth", { val: "150" })]);
    const result = parseUpDownBars(upDownBars);

    expect(result?.gapWidth).toBe(150); // Percent branded type
  });

  it("parses up bars with shape properties", () => {
    const upDownBars = el("c:upDownBars", {}, [
      el("c:upBars", {}, [el("c:spPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "00FF00" })])])]),
    ]);
    const result = parseUpDownBars(upDownBars);

    expect(result?.upBars).toBeDefined();
  });

  it("parses down bars with shape properties", () => {
    const upDownBars = el("c:upDownBars", {}, [
      el("c:downBars", {}, [el("c:spPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FF0000" })])])]),
    ]);
    const result = parseUpDownBars(upDownBars);

    expect(result?.downBars).toBeDefined();
  });

  it("parses complete up/down bars configuration", () => {
    const upDownBars = el("c:upDownBars", {}, [
      el("c:gapWidth", { val: "200" }),
      el("c:upBars", {}, [el("c:spPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "00FF00" })])])]),
      el("c:downBars", {}, [el("c:spPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FF0000" })])])]),
    ]);
    const result = parseUpDownBars(upDownBars);

    expect(result?.gapWidth).toBe(200); // Percent branded type
    expect(result?.upBars).toBeDefined();
    expect(result?.downBars).toBeDefined();
  });
});
