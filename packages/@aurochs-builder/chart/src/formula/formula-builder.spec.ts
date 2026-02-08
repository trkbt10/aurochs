/**
 * @file Formula builder tests
 */

import { quoteSheetName, composeFormula } from "./formula-builder";

describe("quoteSheetName", () => {
  it("does not quote simple names", () => {
    expect(quoteSheetName("Sheet1")).toBe("Sheet1");
    expect(quoteSheetName("Data")).toBe("Data");
  });

  it("quotes names with spaces", () => {
    expect(quoteSheetName("My Sheet")).toBe("'My Sheet'");
  });

  it("quotes names with special characters", () => {
    expect(quoteSheetName("Sheet-1")).toBe("'Sheet-1'");
  });

  it("escapes single quotes", () => {
    expect(quoteSheetName("Data's")).toBe("'Data''s'");
  });

  it("quotes names starting with digits", () => {
    expect(quoteSheetName("1Sheet")).toBe("'1Sheet'");
  });
});

describe("composeFormula", () => {
  it("composes formula with unquoted sheet name", () => {
    expect(composeFormula("Sheet1", "$A$2:$A$10")).toBe("Sheet1!$A$2:$A$10");
  });

  it("composes formula with sheet name requiring quotes", () => {
    expect(composeFormula("My Sheet", "$B$1:$B$5")).toBe("'My Sheet'!$B$1:$B$5");
  });
});
