/**
 * @file src/pdf/native/encryption/saslprep.spec.ts
 */

import { saslprep } from "./saslprep";

describe("saslprep()", () => {
  it("passes ASCII through unchanged", () => {
    expect(saslprep("password")).toBe("password");
  });

  it("maps non-ASCII spaces to ASCII space", () => {
    expect(saslprep("\u00a0")).toBe(" "); // NO-BREAK SPACE
  });

  it("removes commonly-mapped-to-nothing code points", () => {
    expect(saslprep(`I\u00adX`)).toBe("IX"); // SOFT HYPHEN
  });

  it("applies NFKC normalization", () => {
    expect(saslprep("\u212a")).toBe("K"); // KELVIN SIGN
  });

  it("rejects prohibited characters", () => {
    expect(() => saslprep("\u0007")).toThrow(/Prohibited character/);
  });

  it("rejects unassigned code points by default", () => {
    expect(() => saslprep("\u0221")).toThrow(/Unassigned code point/);
  });

  it("allows unassigned code points when allowUnassigned=true", () => {
    expect(() => saslprep("\u0221", { allowUnassigned: true })).not.toThrow();
  });

  it("enforces bidirectional rules", () => {
    expect(() => saslprep("\u0627a\u0627")).toThrow(/RandALCat and LCat/);
  });
});

