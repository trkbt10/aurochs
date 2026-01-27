/**
 * @file Tests for chart mapping functions
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import {
  mapMarkerSymbol,
  mapDataLabelPosition,
  mapLegendPosition,
  mapTrendlineType,
  mapErrorBarDirection,
  mapErrorBarType,
  mapErrorValueType,
} from "./mapping";

// =============================================================================
// mapMarkerSymbol (ECMA-376 Section 21.2.3.27)
// =============================================================================

describe("mapMarkerSymbol - ST_MarkerStyle (ECMA-376 Section 21.2.3.27)", () => {
  it("maps circle marker", () => {
    expect(mapMarkerSymbol("circle")).toBe("circle");
  });

  it("maps dash marker", () => {
    expect(mapMarkerSymbol("dash")).toBe("dash");
  });

  it("maps diamond marker", () => {
    expect(mapMarkerSymbol("diamond")).toBe("diamond");
  });

  it("maps dot marker", () => {
    expect(mapMarkerSymbol("dot")).toBe("dot");
  });

  it("maps none marker", () => {
    expect(mapMarkerSymbol("none")).toBe("none");
  });

  it("maps picture marker", () => {
    expect(mapMarkerSymbol("picture")).toBe("picture");
  });

  it("maps plus marker", () => {
    expect(mapMarkerSymbol("plus")).toBe("plus");
  });

  it("maps square marker", () => {
    expect(mapMarkerSymbol("square")).toBe("square");
  });

  it("maps star marker", () => {
    expect(mapMarkerSymbol("star")).toBe("star");
  });

  it("maps triangle marker", () => {
    expect(mapMarkerSymbol("triangle")).toBe("triangle");
  });

  it("maps x marker", () => {
    expect(mapMarkerSymbol("x")).toBe("x");
  });

  it("returns undefined for unknown marker", () => {
    expect(mapMarkerSymbol("unknown")).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(mapMarkerSymbol(undefined)).toBeUndefined();
  });
});

// =============================================================================
// mapDataLabelPosition (ECMA-376 Section 21.2.3.8)
// =============================================================================

describe("mapDataLabelPosition - ST_DLblPos (ECMA-376 Section 21.2.3.8)", () => {
  it("maps bestFit position", () => {
    expect(mapDataLabelPosition("bestFit")).toBe("bestFit");
  });

  it("maps b (bottom) position", () => {
    expect(mapDataLabelPosition("b")).toBe("b");
  });

  it("maps ctr (center) position", () => {
    expect(mapDataLabelPosition("ctr")).toBe("ctr");
  });

  it("maps inBase position", () => {
    expect(mapDataLabelPosition("inBase")).toBe("inBase");
  });

  it("maps inEnd position", () => {
    expect(mapDataLabelPosition("inEnd")).toBe("inEnd");
  });

  it("maps l (left) position", () => {
    expect(mapDataLabelPosition("l")).toBe("l");
  });

  it("maps outEnd position", () => {
    expect(mapDataLabelPosition("outEnd")).toBe("outEnd");
  });

  it("maps r (right) position", () => {
    expect(mapDataLabelPosition("r")).toBe("r");
  });

  it("maps t (top) position", () => {
    expect(mapDataLabelPosition("t")).toBe("t");
  });

  it("returns undefined for unknown position", () => {
    expect(mapDataLabelPosition("unknown")).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(mapDataLabelPosition(undefined)).toBeUndefined();
  });
});

// =============================================================================
// mapLegendPosition (ECMA-376 Section 21.2.3.24)
// =============================================================================

describe("mapLegendPosition - ST_LegendPos (ECMA-376 Section 21.2.3.24)", () => {
  it("maps b (bottom) position", () => {
    expect(mapLegendPosition("b")).toBe("b");
  });

  it("maps l (left) position", () => {
    expect(mapLegendPosition("l")).toBe("l");
  });

  it("maps r (right) position", () => {
    expect(mapLegendPosition("r")).toBe("r");
  });

  it("maps t (top) position", () => {
    expect(mapLegendPosition("t")).toBe("t");
  });

  it("maps tr (top-right) position", () => {
    expect(mapLegendPosition("tr")).toBe("tr");
  });

  it("defaults to r (right) for unknown position", () => {
    expect(mapLegendPosition("unknown")).toBe("r");
  });

  it("defaults to r (right) for undefined input", () => {
    expect(mapLegendPosition(undefined)).toBe("r");
  });
});

// =============================================================================
// mapTrendlineType (ECMA-376 Section 21.2.3.51)
// =============================================================================

describe("mapTrendlineType - ST_TrendlineType (ECMA-376 Section 21.2.3.51)", () => {
  it("maps exp (exponential) type", () => {
    expect(mapTrendlineType("exp")).toBe("exp");
  });

  it("maps linear type", () => {
    expect(mapTrendlineType("linear")).toBe("linear");
  });

  it("maps log (logarithmic) type", () => {
    expect(mapTrendlineType("log")).toBe("log");
  });

  it("maps movingAvg type", () => {
    expect(mapTrendlineType("movingAvg")).toBe("movingAvg");
  });

  it("maps poly (polynomial) type", () => {
    expect(mapTrendlineType("poly")).toBe("poly");
  });

  it("maps power type", () => {
    expect(mapTrendlineType("power")).toBe("power");
  });

  it("defaults to linear for unknown type", () => {
    expect(mapTrendlineType("unknown")).toBe("linear");
  });

  it("defaults to linear for undefined input", () => {
    expect(mapTrendlineType(undefined)).toBe("linear");
  });
});

// =============================================================================
// mapErrorBarDirection (ECMA-376 Section 21.2.3.17)
// =============================================================================

describe("mapErrorBarDirection - ST_ErrDir (ECMA-376 Section 21.2.3.17)", () => {
  it("maps x direction", () => {
    expect(mapErrorBarDirection("x")).toBe("x");
  });

  it("maps y direction", () => {
    expect(mapErrorBarDirection("y")).toBe("y");
  });

  it("returns undefined for unknown direction", () => {
    expect(mapErrorBarDirection("unknown")).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(mapErrorBarDirection(undefined)).toBeUndefined();
  });
});

// =============================================================================
// mapErrorBarType (ECMA-376 Section 21.2.3.18)
// =============================================================================

describe("mapErrorBarType - ST_ErrBarType (ECMA-376 Section 21.2.3.18)", () => {
  it("maps both type", () => {
    expect(mapErrorBarType("both")).toBe("both");
  });

  it("maps minus type", () => {
    expect(mapErrorBarType("minus")).toBe("minus");
  });

  it("maps plus type", () => {
    expect(mapErrorBarType("plus")).toBe("plus");
  });

  it("defaults to both for unknown type", () => {
    expect(mapErrorBarType("unknown")).toBe("both");
  });

  it("defaults to both for undefined input", () => {
    expect(mapErrorBarType(undefined)).toBe("both");
  });
});

// =============================================================================
// mapErrorValueType (ECMA-376 Section 21.2.3.19)
// =============================================================================

describe("mapErrorValueType - ST_ErrValType (ECMA-376 Section 21.2.3.19)", () => {
  it("maps cust (custom) type", () => {
    expect(mapErrorValueType("cust")).toBe("cust");
  });

  it("maps fixedVal type", () => {
    expect(mapErrorValueType("fixedVal")).toBe("fixedVal");
  });

  it("maps percentage type", () => {
    expect(mapErrorValueType("percentage")).toBe("percentage");
  });

  it("maps stdDev type", () => {
    expect(mapErrorValueType("stdDev")).toBe("stdDev");
  });

  it("maps stdErr type", () => {
    expect(mapErrorValueType("stdErr")).toBe("stdErr");
  });

  it("defaults to fixedVal for unknown type", () => {
    expect(mapErrorValueType("unknown")).toBe("fixedVal");
  });

  it("defaults to fixedVal for undefined input", () => {
    expect(mapErrorValueType(undefined)).toBe("fixedVal");
  });
});
