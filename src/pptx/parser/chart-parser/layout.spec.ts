/**
 * @file Tests for chart layout parsing
 *
 * @see ECMA-376 Part 1, Section 21.2.2.81 (layout)
 * @see ECMA-376 Part 1, Section 21.2.2.95 (manualLayout)
 */

import type { XmlElement } from "../../../xml";
import { parseLayout, parseManualLayout } from "./layout";

// Helper to create mock XmlElement
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

// =============================================================================
// parseManualLayout (ECMA-376 Section 21.2.2.95)
// =============================================================================

describe("parseManualLayout - c:manualLayout (ECMA-376 Section 21.2.2.95)", () => {
  it("parses all layout attributes", () => {
    const manualLayout = el("c:manualLayout", {}, [
      el("c:layoutTarget", { val: "inner" }),
      el("c:xMode", { val: "edge" }),
      el("c:yMode", { val: "factor" }),
      el("c:wMode", { val: "edge" }),
      el("c:hMode", { val: "factor" }),
      el("c:x", { val: "0.1" }),
      el("c:y", { val: "0.2" }),
      el("c:w", { val: "0.8" }),
      el("c:h", { val: "0.6" }),
    ]);
    const result = parseManualLayout(manualLayout);

    expect(result.layoutTarget).toBe("inner");
    expect(result.xMode).toBe("edge");
    expect(result.yMode).toBe("factor");
    expect(result.wMode).toBe("edge");
    expect(result.hMode).toBe("factor");
    expect(result.x).toBe(0.1);
    expect(result.y).toBe(0.2);
    expect(result.w).toBe(0.8);
    expect(result.h).toBe(0.6);
  });

  it("parses outer layout target", () => {
    const manualLayout = el("c:manualLayout", {}, [el("c:layoutTarget", { val: "outer" })]);
    const result = parseManualLayout(manualLayout);

    expect(result.layoutTarget).toBe("outer");
  });

  it("handles missing attributes", () => {
    const manualLayout = el("c:manualLayout", {}, []);
    const result = parseManualLayout(manualLayout);

    expect(result.layoutTarget).toBeUndefined();
    expect(result.xMode).toBeUndefined();
    expect(result.yMode).toBeUndefined();
    expect(result.wMode).toBeUndefined();
    expect(result.hMode).toBeUndefined();
    expect(result.x).toBeUndefined();
    expect(result.y).toBeUndefined();
    expect(result.w).toBeUndefined();
    expect(result.h).toBeUndefined();
  });

  it("parses partial layout", () => {
    const manualLayout = el("c:manualLayout", {}, [el("c:x", { val: "0.5" }), el("c:y", { val: "0.5" })]);
    const result = parseManualLayout(manualLayout);

    expect(result.x).toBe(0.5);
    expect(result.y).toBe(0.5);
    expect(result.w).toBeUndefined();
    expect(result.h).toBeUndefined();
  });
});

// =============================================================================
// parseLayout (ECMA-376 Section 21.2.2.81)
// =============================================================================

describe("parseLayout - c:layout (ECMA-376 Section 21.2.2.81)", () => {
  it("returns undefined for undefined input", () => {
    expect(parseLayout(undefined)).toBeUndefined();
  });

  it("returns empty object for empty layout element", () => {
    const layout = el("c:layout", {}, []);
    const result = parseLayout(layout);

    expect(result).toBeDefined();
    expect(result?.manualLayout).toBeUndefined();
  });

  it("parses manual layout", () => {
    const layout = el("c:layout", {}, [
      el("c:manualLayout", {}, [
        el("c:layoutTarget", { val: "inner" }),
        el("c:x", { val: "0.25" }),
        el("c:y", { val: "0.25" }),
        el("c:w", { val: "0.5" }),
        el("c:h", { val: "0.5" }),
      ]),
    ]);
    const result = parseLayout(layout);

    expect(result).toBeDefined();
    expect(result?.manualLayout).toBeDefined();
    expect(result?.manualLayout?.layoutTarget).toBe("inner");
    expect(result?.manualLayout?.x).toBe(0.25);
    expect(result?.manualLayout?.y).toBe(0.25);
    expect(result?.manualLayout?.w).toBe(0.5);
    expect(result?.manualLayout?.h).toBe(0.5);
  });
});
