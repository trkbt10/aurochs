/**
 * @file Tests for autoFilter menu configuration based on column data type.
 *
 * Verifies that the correct sort labels and filter submenu items
 * are produced for each ColumnDataType.
 */

import {
  getSortLabels,
  getFilterSubmenuItems,
  getOperatorOptions,
  buildCustomFilter,
} from "./auto-filter-menu-config";

describe("getSortLabels", () => {
  it("should return text labels for 'text' type", () => {
    const labels = getSortLabels("text");
    expect(labels.ascending).toBe("昇順 (A→Z)");
    expect(labels.descending).toBe("降順 (Z→A)");
  });

  it("should return numeric labels for 'number' type", () => {
    const labels = getSortLabels("number");
    expect(labels.ascending).toBe("小さい順");
    expect(labels.descending).toBe("大きい順");
  });

  it("should return date labels for 'date' type", () => {
    const labels = getSortLabels("date");
    expect(labels.ascending).toBe("古い順");
    expect(labels.descending).toBe("新しい順");
  });

  it("should return text labels for 'mixed' type (fallback)", () => {
    const labels = getSortLabels("mixed");
    expect(labels.ascending).toBe("昇順 (A→Z)");
    expect(labels.descending).toBe("降順 (Z→A)");
  });
});

describe("getFilterSubmenuItems", () => {
  it("should return text filter items for 'text' type", () => {
    const items = getFilterSubmenuItems("text");
    expect(items!.submenuLabel).toBe("テキストフィルター");
    const ids = items!.items.map((i) => i.id);
    expect(ids).toContain("equal");
    expect(ids).toContain("notEqual");
    expect(ids).toContain("beginsWith");
    expect(ids).toContain("endsWith");
    expect(ids).toContain("contains");
    expect(ids).toContain("notContains");
  });

  it("should return number filter items for 'number' type", () => {
    const items = getFilterSubmenuItems("number");
    expect(items!.submenuLabel).toBe("数値フィルター");
    const ids = items!.items.map((i) => i.id);
    expect(ids).toContain("equal");
    expect(ids).toContain("notEqual");
    expect(ids).toContain("greaterThan");
    expect(ids).toContain("greaterThanOrEqual");
    expect(ids).toContain("lessThan");
    expect(ids).toContain("lessThanOrEqual");
    expect(ids).toContain("between");
    expect(ids).toContain("top10");
    expect(ids).toContain("aboveAverage");
    expect(ids).toContain("belowAverage");
  });

  it("should return date filter items for 'date' type", () => {
    const items = getFilterSubmenuItems("date");
    expect(items!.submenuLabel).toBe("日付フィルター");
    const ids = items!.items.map((i) => i.id);
    expect(ids).toContain("equal");
    expect(ids).toContain("before");
    expect(ids).toContain("after");
    expect(ids).toContain("between");
    expect(ids).toContain("today");
    expect(ids).toContain("yesterday");
    expect(ids).toContain("thisWeek");
    expect(ids).toContain("lastWeek");
    expect(ids).toContain("thisMonth");
    expect(ids).toContain("lastMonth");
    expect(ids).toContain("thisYear");
    expect(ids).toContain("lastYear");
  });

  it("should return undefined for 'mixed' type (no submenu)", () => {
    const items = getFilterSubmenuItems("mixed");
    expect(items).toBeUndefined();
  });
});

describe("getOperatorOptions", () => {
  it("should return text operators for 'text' type", () => {
    const ops = getOperatorOptions("text");
    expect(ops.map((o) => o.value)).toContain("contains");
    expect(ops.map((o) => o.value)).toContain("beginsWith");
  });

  it("should return number operators for 'number' type", () => {
    const ops = getOperatorOptions("number");
    expect(ops.map((o) => o.value)).toContain("greaterThan");
    expect(ops.map((o) => o.value)).toContain("lessThanOrEqual");
  });

  it("should return date operators for 'date' type", () => {
    const ops = getOperatorOptions("date");
    expect(ops.map((o) => o.value)).toContain("before");
    expect(ops.map((o) => o.value)).toContain("after");
  });

  it("should return text operators for 'mixed' type", () => {
    const ops = getOperatorOptions("mixed");
    expect(ops.map((o) => o.value)).toContain("contains");
  });
});

describe("buildCustomFilter", () => {
  it("should build equal filter", () => {
    const f = buildCustomFilter("equal", "100");
    expect(f.type).toBe("customFilters");
    expect(f.conditions).toEqual([{ operator: "equal", val: "100" }]);
  });

  it("should build notEqual filter", () => {
    const f = buildCustomFilter("notEqual", "hello");
    expect(f.conditions).toEqual([{ operator: "notEqual", val: "hello" }]);
  });

  it("should build greaterThan filter", () => {
    const f = buildCustomFilter("greaterThan", "50");
    expect(f.conditions).toEqual([{ operator: "greaterThan", val: "50" }]);
  });

  it("should build lessThanOrEqual filter", () => {
    const f = buildCustomFilter("lessThanOrEqual", "99");
    expect(f.conditions).toEqual([{ operator: "lessThanOrEqual", val: "99" }]);
  });

  it("should build 'contains' as wildcard equal", () => {
    const f = buildCustomFilter("contains", "foo");
    expect(f.conditions).toEqual([{ operator: "equal", val: "*foo*" }]);
  });

  it("should build 'notContains' as wildcard notEqual", () => {
    const f = buildCustomFilter("notContains", "bar");
    expect(f.conditions).toEqual([{ operator: "notEqual", val: "*bar*" }]);
  });

  it("should build 'beginsWith' as wildcard prefix", () => {
    const f = buildCustomFilter("beginsWith", "abc");
    expect(f.conditions).toEqual([{ operator: "equal", val: "abc*" }]);
  });

  it("should build 'endsWith' as wildcard suffix", () => {
    const f = buildCustomFilter("endsWith", "xyz");
    expect(f.conditions).toEqual([{ operator: "equal", val: "*xyz" }]);
  });

  it("should build 'between' as AND range", () => {
    const f = buildCustomFilter("between", "10", "90");
    expect(f.and).toBe(true);
    expect(f.conditions).toEqual([
      { operator: "greaterThanOrEqual", val: "10" },
      { operator: "lessThanOrEqual", val: "90" },
    ]);
  });

  it("should escape wildcards in user input for contains/beginsWith/endsWith", () => {
    const f = buildCustomFilter("contains", "a*b");
    // * in user input must be escaped with ~ so it's treated as literal
    expect(f.conditions).toEqual([{ operator: "equal", val: "*a~*b*" }]);
  });

  it("should build 'before' as lessThan (date context)", () => {
    const f = buildCustomFilter("before", "2024-01-01");
    expect(f.conditions).toEqual([{ operator: "lessThan", val: "2024-01-01" }]);
  });

  it("should build 'after' as greaterThan (date context)", () => {
    const f = buildCustomFilter("after", "2024-12-31");
    expect(f.conditions).toEqual([{ operator: "greaterThan", val: "2024-12-31" }]);
  });
});
