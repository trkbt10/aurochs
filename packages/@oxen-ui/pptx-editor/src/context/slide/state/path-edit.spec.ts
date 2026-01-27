/**
 * @file Path editing state tests
 */

import { describe, it, expect } from "vitest";
import { px } from "@oxen/ooxml/domain/units";
import type { CustomGeometry } from "@oxen/pptx/domain";
import {
  createInactivePathEditState,
  createActivePathEditState,
  createDefaultPathEditTool,
  isPathEditInactive,
  isPathEditActive,
} from "./path-edit";

const createMinimalGeometry = (): CustomGeometry => ({
  type: "custom",
  paths: [
    {
      width: px(1),
      height: px(1),
      fill: "none",
      stroke: false,
      extrusionOk: false,
      commands: [],
    },
  ],
});

describe("createInactivePathEditState", () => {
  it("creates inactive state", () => {
    const state = createInactivePathEditState();
    expect(state.type).toBe("inactive");
    expect(isPathEditInactive(state)).toBe(true);
  });
});

describe("createActivePathEditState", () => {
  it("creates active state", () => {
    const geometry = createMinimalGeometry();
    const state = createActivePathEditState("shape-1", 0, geometry);
    expect(state.type).toBe("active");
    expect(isPathEditActive(state)).toBe(true);
  });
});

describe("createDefaultPathEditTool", () => {
  it("creates default tool", () => {
    const tool = createDefaultPathEditTool();
    expect(tool.type).toBe("directSelection");
  });
});
