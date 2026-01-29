/**
 * @file Tests for axis parsing
 *
 * @see ECMA-376 Part 1, Section 21.2.2.25 (catAx)
 * @see ECMA-376 Part 1, Section 21.2.2.226 (valAx)
 * @see ECMA-376 Part 1, Section 21.2.2.43 (dateAx)
 * @see ECMA-376 Part 1, Section 21.2.2.175 (serAx)
 */

import type { XmlElement } from "@oxen/xml";
import {
  parseDisplayUnits,
  parseAxisBase,
  parseCategoryAxis,
  parseValueAxis,
  parseDateAxis,
  parseSeriesAxis,
  parseAxes,
} from "./axis";

// Helper to create mock XmlElement
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

// =============================================================================
// parseDisplayUnits (ECMA-376 Section 21.2.2.47)
// =============================================================================

describe("parseDisplayUnits - c:dispUnits (ECMA-376 Section 21.2.2.47)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseDisplayUnits(undefined)).toBeUndefined();
  });

  it("parses built-in unit - thousands", () => {
    const dispUnits = el("c:dispUnits", {}, [el("c:builtInUnit", { val: "thousands" })]);
    const result = parseDisplayUnits(dispUnits);

    expect(result?.builtInUnit).toBe("thousands");
  });

  it("parses built-in unit - millions", () => {
    const dispUnits = el("c:dispUnits", {}, [el("c:builtInUnit", { val: "millions" })]);
    const result = parseDisplayUnits(dispUnits);

    expect(result?.builtInUnit).toBe("millions");
  });

  it("parses built-in unit - billions", () => {
    const dispUnits = el("c:dispUnits", {}, [el("c:builtInUnit", { val: "billions" })]);
    const result = parseDisplayUnits(dispUnits);

    expect(result?.builtInUnit).toBe("billions");
  });

  it("parses custom unit", () => {
    const dispUnits = el("c:dispUnits", {}, [el("c:custUnit", { val: "100000" })]);
    const result = parseDisplayUnits(dispUnits);

    expect(result?.customUnit).toBe(100000);
  });

  it("parses display units label", () => {
    const dispUnits = el("c:dispUnits", {}, [el("c:builtInUnit", { val: "thousands" }), el("c:dispUnitsLbl", {}, [])]);
    const result = parseDisplayUnits(dispUnits);

    expect(result?.dispUnitsLbl).toBeDefined();
  });
});

// =============================================================================
// parseAxisBase (common axis properties)
// =============================================================================

describe("parseAxisBase - common axis properties", () => {
  it("parses axis ID", () => {
    const axis = el("c:catAx", {}, [el("c:axId", { val: "12345" })]);
    const result = parseAxisBase(axis);

    expect(result?.id).toBe(12345);
  });

  it("parses axis position", () => {
    const axisBottom = el("c:catAx", {}, [el("c:axPos", { val: "b" })]);
    const axisLeft = el("c:valAx", {}, [el("c:axPos", { val: "l" })]);

    expect(parseAxisBase(axisBottom)?.position).toBe("b");
    expect(parseAxisBase(axisLeft)?.position).toBe("l");
  });

  it("defaults position to bottom", () => {
    const axis = el("c:catAx", {}, []);
    expect(parseAxisBase(axis)?.position).toBe("b");
  });

  it("parses orientation from scaling", () => {
    const axis = el("c:catAx", {}, [el("c:scaling", {}, [el("c:orientation", { val: "maxMin" })])]);
    const result = parseAxisBase(axis);

    expect(result?.orientation).toBe("maxMin");
  });

  it("defaults orientation to minMax", () => {
    const axis = el("c:catAx", {}, []);
    expect(parseAxisBase(axis)?.orientation).toBe("minMax");
  });

  it("parses delete flag", () => {
    const axis = el("c:catAx", {}, [el("c:delete", { val: "1" })]);
    const result = parseAxisBase(axis);

    expect(result?.delete).toBe(true);
  });

  it("parses major tick mark", () => {
    const axis = el("c:catAx", {}, [el("c:majorTickMark", { val: "out" })]);
    const result = parseAxisBase(axis);

    expect(result?.majorTickMark).toBe("out");
  });

  it("parses minor tick mark", () => {
    const axis = el("c:catAx", {}, [el("c:minorTickMark", { val: "in" })]);
    const result = parseAxisBase(axis);

    expect(result?.minorTickMark).toBe("in");
  });

  it("defaults tick marks to none", () => {
    const axis = el("c:catAx", {}, []);
    const result = parseAxisBase(axis);

    expect(result?.majorTickMark).toBe("none");
    expect(result?.minorTickMark).toBe("none");
  });

  it("parses tick label position", () => {
    const axis = el("c:catAx", {}, [el("c:tickLblPos", { val: "low" })]);
    const result = parseAxisBase(axis);

    expect(result?.tickLabelPosition).toBe("low");
  });

  it("defaults tick label position to nextTo", () => {
    const axis = el("c:catAx", {}, []);
    expect(parseAxisBase(axis)?.tickLabelPosition).toBe("nextTo");
  });

  it("parses cross axis ID", () => {
    const axis = el("c:catAx", {}, [el("c:crossAx", { val: "67890" })]);
    const result = parseAxisBase(axis);

    expect(result?.crossAxisId).toBe(67890);
  });

  it("parses crosses attribute", () => {
    const axis = el("c:catAx", {}, [el("c:crosses", { val: "autoZero" })]);
    const result = parseAxisBase(axis);

    expect(result?.crosses).toBe("autoZero");
  });

  it("parses crossesAt value", () => {
    const axis = el("c:catAx", {}, [el("c:crossesAt", { val: "100" })]);
    const result = parseAxisBase(axis);

    expect(result?.crossesAt).toBe(100);
  });

  it("parses major gridlines", () => {
    const axis = el("c:catAx", {}, [el("c:majorGridlines", {}, [el("c:spPr", {}, [])])]);
    const result = parseAxisBase(axis);

    expect(result?.majorGridlines).toBeDefined();
  });

  it("parses minor gridlines", () => {
    const axis = el("c:catAx", {}, [el("c:minorGridlines", {}, [el("c:spPr", {}, [])])]);
    const result = parseAxisBase(axis);

    expect(result?.minorGridlines).toBeDefined();
  });
});

// =============================================================================
// parseCategoryAxis (ECMA-376 Section 21.2.2.25)
// =============================================================================

describe("parseCategoryAxis - c:catAx (ECMA-376 Section 21.2.2.25)", () => {
  it("parses category axis with type", () => {
    const catAx = el("c:catAx", {}, [el("c:axId", { val: "1" })]);
    const result = parseCategoryAxis(catAx);

    expect(result?.type).toBe("catAx");
  });

  it("parses auto flag", () => {
    const catAx = el("c:catAx", {}, [el("c:auto", { val: "1" })]);
    const result = parseCategoryAxis(catAx);

    expect(result?.auto).toBe(true);
  });

  it("parses label alignment", () => {
    const catAxCenter = el("c:catAx", {}, [el("c:lblAlgn", { val: "ctr" })]);
    const catAxLeft = el("c:catAx", {}, [el("c:lblAlgn", { val: "l" })]);

    expect(parseCategoryAxis(catAxCenter)?.labelAlignment).toBe("ctr");
    expect(parseCategoryAxis(catAxLeft)?.labelAlignment).toBe("l");
  });

  it("parses label offset", () => {
    const catAx = el("c:catAx", {}, [el("c:lblOffset", { val: "100" })]);
    const result = parseCategoryAxis(catAx);

    expect(result?.labelOffset).toBe(100); // Percent branded type
  });

  it("parses tick label skip", () => {
    const catAx = el("c:catAx", {}, [el("c:tickLblSkip", { val: "2" })]);
    const result = parseCategoryAxis(catAx);

    expect(result?.tickLabelSkip).toBe(2);
  });

  it("parses tick mark skip", () => {
    const catAx = el("c:catAx", {}, [el("c:tickMarkSkip", { val: "3" })]);
    const result = parseCategoryAxis(catAx);

    expect(result?.tickMarkSkip).toBe(3);
  });

  it("parses noMultiLevelLabels flag", () => {
    const catAx = el("c:catAx", {}, [el("c:noMultiLvlLbl", { val: "1" })]);
    const result = parseCategoryAxis(catAx);

    expect(result?.noMultiLevelLabels).toBe(true);
  });
});

// =============================================================================
// parseValueAxis (ECMA-376 Section 21.2.2.226)
// =============================================================================

describe("parseValueAxis - c:valAx (ECMA-376 Section 21.2.2.226)", () => {
  it("parses value axis with type", () => {
    const valAx = el("c:valAx", {}, [el("c:axId", { val: "1" })]);
    const result = parseValueAxis(valAx);

    expect(result?.type).toBe("valAx");
  });

  it("parses crossBetween", () => {
    const valAxBetween = el("c:valAx", {}, [el("c:crossBetween", { val: "between" })]);
    const valAxMidCat = el("c:valAx", {}, [el("c:crossBetween", { val: "midCat" })]);

    expect(parseValueAxis(valAxBetween)?.crossBetween).toBe("between");
    expect(parseValueAxis(valAxMidCat)?.crossBetween).toBe("midCat");
  });

  it("parses major unit", () => {
    const valAx = el("c:valAx", {}, [el("c:majorUnit", { val: "10" })]);
    const result = parseValueAxis(valAx);

    expect(result?.majorUnit).toBe(10);
  });

  it("parses minor unit", () => {
    const valAx = el("c:valAx", {}, [el("c:minorUnit", { val: "2" })]);
    const result = parseValueAxis(valAx);

    expect(result?.minorUnit).toBe(2);
  });

  it("parses min and max from scaling", () => {
    const valAx = el("c:valAx", {}, [el("c:scaling", {}, [el("c:min", { val: "0" }), el("c:max", { val: "100" })])]);
    const result = parseValueAxis(valAx);

    expect(result?.min).toBe(0);
    expect(result?.max).toBe(100);
  });

  it("parses logBase from scaling", () => {
    const valAx = el("c:valAx", {}, [el("c:scaling", {}, [el("c:logBase", { val: "10" })])]);
    const result = parseValueAxis(valAx);

    expect(result?.logBase).toBe(10);
  });

  it("parses display units", () => {
    const valAx = el("c:valAx", {}, [el("c:dispUnits", {}, [el("c:builtInUnit", { val: "millions" })])]);
    const result = parseValueAxis(valAx);

    expect(result?.dispUnits?.builtInUnit).toBe("millions");
  });
});

// =============================================================================
// parseDateAxis (ECMA-376 Section 21.2.2.43)
// =============================================================================

describe("parseDateAxis - c:dateAx (ECMA-376 Section 21.2.2.43)", () => {
  it("parses date axis with type", () => {
    const dateAx = el("c:dateAx", {}, [el("c:axId", { val: "1" })]);
    const result = parseDateAxis(dateAx);

    expect(result?.type).toBe("dateAx");
  });

  it("parses auto flag", () => {
    const dateAx = el("c:dateAx", {}, [el("c:auto", { val: "1" })]);
    const result = parseDateAxis(dateAx);

    expect(result?.auto).toBe(true);
  });

  it("parses baseTimeUnit", () => {
    const dateAx = el("c:dateAx", {}, [el("c:baseTimeUnit", { val: "months" })]);
    const result = parseDateAxis(dateAx);

    expect(result?.baseTimeUnit).toBe("months");
  });

  it("parses major/minor time units", () => {
    const dateAx = el("c:dateAx", {}, [
      el("c:majorTimeUnit", { val: "years" }),
      el("c:minorTimeUnit", { val: "months" }),
    ]);
    const result = parseDateAxis(dateAx);

    expect(result?.majorTimeUnit).toBe("years");
    expect(result?.minorTimeUnit).toBe("months");
  });

  it("parses major/minor units", () => {
    const dateAx = el("c:dateAx", {}, [el("c:majorUnit", { val: "1" }), el("c:minorUnit", { val: "3" })]);
    const result = parseDateAxis(dateAx);

    expect(result?.majorUnit).toBe(1);
    expect(result?.minorUnit).toBe(3);
  });

  it("parses min/max from scaling", () => {
    const dateAx = el("c:dateAx", {}, [
      el("c:scaling", {}, [el("c:min", { val: "44562" }), el("c:max", { val: "44926" })]),
    ]);
    const result = parseDateAxis(dateAx);

    expect(result?.min).toBe(44562);
    expect(result?.max).toBe(44926);
  });
});

// =============================================================================
// parseSeriesAxis (ECMA-376 Section 21.2.2.175)
// =============================================================================

describe("parseSeriesAxis - c:serAx (ECMA-376 Section 21.2.2.175)", () => {
  it("parses series axis with type", () => {
    const serAx = el("c:serAx", {}, [el("c:axId", { val: "1" })]);
    const result = parseSeriesAxis(serAx);

    expect(result?.type).toBe("serAx");
  });

  it("parses tick label skip", () => {
    const serAx = el("c:serAx", {}, [el("c:tickLblSkip", { val: "2" })]);
    const result = parseSeriesAxis(serAx);

    expect(result?.tickLabelSkip).toBe(2);
  });

  it("parses tick mark skip", () => {
    const serAx = el("c:serAx", {}, [el("c:tickMarkSkip", { val: "3" })]);
    const result = parseSeriesAxis(serAx);

    expect(result?.tickMarkSkip).toBe(3);
  });
});

// =============================================================================
// parseAxes (from plot area)
// =============================================================================

describe("parseAxes - parse all axes from plot area", () => {
  it("returns empty array when no axes exist", () => {
    const plotArea = el("c:plotArea", {}, []);
    const result = parseAxes(plotArea);

    expect(result).toEqual([]);
  });

  it("parses category and value axes", () => {
    const plotArea = el("c:plotArea", {}, [
      el("c:catAx", {}, [el("c:axId", { val: "1" })]),
      el("c:valAx", {}, [el("c:axId", { val: "2" })]),
    ]);
    const result = parseAxes(plotArea);

    expect(result.length).toBe(2);
    expect(result[0].type).toBe("catAx");
    expect(result[1].type).toBe("valAx");
  });

  it("parses multiple axis types", () => {
    const plotArea = el("c:plotArea", {}, [
      el("c:catAx", {}, [el("c:axId", { val: "1" })]),
      el("c:valAx", {}, [el("c:axId", { val: "2" })]),
      el("c:dateAx", {}, [el("c:axId", { val: "3" })]),
      el("c:serAx", {}, [el("c:axId", { val: "4" })]),
    ]);
    const result = parseAxes(plotArea);

    expect(result.length).toBe(4);
    expect(result[0].type).toBe("catAx");
    expect(result[1].type).toBe("valAx");
    expect(result[2].type).toBe("dateAx");
    expect(result[3].type).toBe("serAx");
  });

  it("parses secondary axes", () => {
    // parseAxes iterates through axis types in order: catAx, valAx, dateAx, serAx
    const plotArea = el("c:plotArea", {}, [
      el("c:catAx", {}, [el("c:axId", { val: "1" }), el("c:axPos", { val: "b" })]),
      el("c:valAx", {}, [el("c:axId", { val: "2" }), el("c:axPos", { val: "l" })]),
      el("c:catAx", {}, [el("c:axId", { val: "3" }), el("c:axPos", { val: "t" })]),
      el("c:valAx", {}, [el("c:axId", { val: "4" }), el("c:axPos", { val: "r" })]),
    ]);
    const result = parseAxes(plotArea);

    expect(result.length).toBe(4);
    // catAx elements are processed first, then valAx
    expect(result[0].position).toBe("b"); // first catAx
    expect(result[1].position).toBe("t"); // second catAx
    expect(result[2].position).toBe("l"); // first valAx
    expect(result[3].position).toBe("r"); // second valAx
  });
});
