/**
 * @file grouping-strategy resolver tests.
 */

import { noGrouping } from "@aurochs/pdf/services/block-segmentation";
import { resolvePdfGroupingStrategy } from "./grouping-strategy";

describe("resolvePdfGroupingStrategy", () => {
  it("uses full-like defaults when grouping is omitted", () => {
    const resolved = resolvePdfGroupingStrategy({});

    expect(resolved.tablesEnabled).toBe(true);
    expect(resolved.detectTableRegions).toBe(true);
    expect(resolved.inferTablesFromTextGroups).toBe(true);
    expect(resolved.autoEnabled).toBe(false);
    expect(resolved.auto.qualityThreshold).toBeCloseTo(0.55, 6);
    expect(resolved.auto.maxOverheadRatio).toBeCloseTo(1.2, 6);
  });

  it("enables adaptive mode for preset auto", () => {
    const resolved = resolvePdfGroupingStrategy({
      grouping: { preset: "auto" },
    });

    expect(resolved.tablesEnabled).toBe(true);
    expect(resolved.detectTableRegions).toBe(true);
    expect(resolved.inferTablesFromTextGroups).toBe(true);
    expect(resolved.autoEnabled).toBe(true);
  });

  it("accepts adaptive threshold overrides", () => {
    const resolved = resolvePdfGroupingStrategy({
      grouping: {
        preset: "auto",
        auto: {
          qualityThreshold: 0.71,
          maxOverheadRatio: 1.35,
        },
      },
    });

    expect(resolved.autoEnabled).toBe(true);
    expect(resolved.auto.qualityThreshold).toBeCloseTo(0.71, 6);
    expect(resolved.auto.maxOverheadRatio).toBeCloseTo(1.35, 6);
  });

  it("keeps auto disabled for preset text", () => {
    const resolved = resolvePdfGroupingStrategy({
      grouping: { preset: "text" },
    });

    expect(resolved.tablesEnabled).toBe(false);
    expect(resolved.autoEnabled).toBe(false);
  });

  it("rejects mixed textGroupingFn and grouping.text", () => {
    expect(() =>
      resolvePdfGroupingStrategy({
        textGroupingFn: noGrouping,
        grouping: {
          text: { type: "none" },
        },
      }),
    ).toThrow("Specify either `textGroupingFn` or `grouping.text`, not both");
  });
});
