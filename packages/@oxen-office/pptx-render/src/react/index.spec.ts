/**
 * @file Entry-point export tests for @oxen-office/pptx-render/react
 */

import { extractText3DRuns } from "@oxen-office/pptx-render/react";

describe("@oxen-office/pptx-render/react exports", () => {
  it("exports extractText3DRuns", () => {
    expect(typeof extractText3DRuns).toBe("function");
  });
});

