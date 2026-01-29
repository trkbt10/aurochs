/**
 * @file Entry-point export tests for @oxen-renderer/pptx/react
 */

import { extractText3DRuns } from "@oxen-renderer/pptx/react";

describe("@oxen-renderer/pptx/react exports", () => {
  it("exports extractText3DRuns", () => {
    expect(typeof extractText3DRuns).toBe("function");
  });
});

