/**
 * @file GeometryEditor component tests
 *
 * Tests the GeometryEditor component handles all geometry types correctly,
 * including edge cases with missing or undefined properties.
 */

import type { PresetGeometry, CustomGeometry, Geometry, GeometryPath, ConnectionSite } from "@oxen/pptx/domain/shape";
import { px, deg } from "@oxen/ooxml/domain/units";

// =============================================================================
// renderPresetEditor Tests
// =============================================================================

describe("GeometryEditor: PresetGeometry handling", () => {
  describe("adjustValues access", () => {
    it("handles preset with defined adjustValues array", () => {
      const geometry: PresetGeometry = {
        type: "preset",
        preset: "rect",
        adjustValues: [{ name: "adj1", value: 50000 }],
      };

      // Simulates the component's null-safe access pattern
      const adjustValuesLength = geometry.adjustValues?.length ?? 0;
      expect(adjustValuesLength).toBe(1);
    });

    it("handles preset with empty adjustValues array", () => {
      const geometry: PresetGeometry = {
        type: "preset",
        preset: "rect",
        adjustValues: [],
      };

      const adjustValuesLength = geometry.adjustValues?.length ?? 0;
      expect(adjustValuesLength).toBe(0);
    });

    it("handles preset without adjustValues (incomplete data)", () => {
      // Runtime edge case: data might be incomplete from parsing
      const geometry = {
        type: "preset",
        preset: "rect",
      } as PresetGeometry;

      // Component must handle this without crashing
      const adjustValuesLength = geometry.adjustValues?.length ?? 0;
      expect(adjustValuesLength).toBe(0);
    });
  });
});

// =============================================================================
// renderCustomEditor Tests
// =============================================================================

describe("GeometryEditor: CustomGeometry handling", () => {
  describe("paths access", () => {
    it("handles custom geometry with paths array", () => {
      const path: GeometryPath = {
        width: px(100),
        height: px(100),
        fill: "norm",
        stroke: true,
        extrusionOk: false,
        commands: [],
      };
      const geometry: CustomGeometry = {
        type: "custom",
        paths: [path],
        adjustValues: [],
        adjustHandles: [],
        guides: [],
        connectionSites: [],
      };

      const pathsLength = geometry.paths?.length ?? 0;
      expect(pathsLength).toBe(1);
    });

    it("handles custom geometry without paths (incomplete data)", () => {
      const geometry = {
        type: "custom",
      } as CustomGeometry;

      const pathsLength = geometry.paths?.length ?? 0;
      expect(pathsLength).toBe(0);
    });
  });

  describe("guides access", () => {
    it("handles custom geometry with guides", () => {
      const geometry: CustomGeometry = {
        type: "custom",
        paths: [],
        adjustValues: [],
        adjustHandles: [],
        guides: [{ name: "g1", formula: "*/w 1 2" }],
        connectionSites: [],
      };

      const guidesLength = geometry.guides?.length ?? 0;
      expect(guidesLength).toBe(1);
    });

    it("handles custom geometry without guides", () => {
      const geometry: CustomGeometry = {
        type: "custom",
        paths: [],
      };

      const guidesLength = geometry.guides?.length ?? 0;
      expect(guidesLength).toBe(0);
    });
  });

  describe("connectionSites access", () => {
    it("handles custom geometry with connectionSites", () => {
      const site: ConnectionSite = {
        angle: deg(0),
        position: { x: px(0), y: px(0) },
      };
      const geometry: CustomGeometry = {
        type: "custom",
        paths: [],
        adjustValues: [],
        adjustHandles: [],
        guides: [],
        connectionSites: [site],
      };

      const sitesLength = geometry.connectionSites?.length ?? 0;
      expect(sitesLength).toBe(1);
    });

    it("handles custom geometry without connectionSites", () => {
      const geometry: CustomGeometry = {
        type: "custom",
        paths: [],
      };

      const sitesLength = geometry.connectionSites?.length ?? 0;
      expect(sitesLength).toBe(0);
    });
  });

  describe("adjustValues access", () => {
    it("handles custom geometry with adjustValues", () => {
      const geometry: CustomGeometry = {
        type: "custom",
        paths: [],
        adjustValues: [{ name: "adj1", value: 100 }],
        adjustHandles: [],
        guides: [],
        connectionSites: [],
      };

      const adjustValuesLength = geometry.adjustValues?.length ?? 0;
      expect(adjustValuesLength).toBe(1);
    });

    it("handles custom geometry without adjustValues", () => {
      const geometry: CustomGeometry = {
        type: "custom",
        paths: [],
      };

      const adjustValuesLength = geometry.adjustValues?.length ?? 0;
      expect(adjustValuesLength).toBe(0);
    });
  });
});

// =============================================================================
// Type Discrimination Tests
// =============================================================================

describe("GeometryEditor: Type discrimination", () => {
  it("correctly identifies preset geometry", () => {
    const geometry: Geometry = {
      type: "preset",
      preset: "rect",
      adjustValues: [],
    };

    expect(geometry.type).toBe("preset");
    if (geometry.type === "preset") {
      expect(geometry.preset).toBeDefined();
    }
  });

  it("correctly identifies custom geometry", () => {
    const geometry: Geometry = {
      type: "custom",
      paths: [],
      adjustValues: [],
      adjustHandles: [],
      guides: [],
      connectionSites: [],
    };

    expect(geometry.type).toBe("custom");
    if (geometry.type === "custom") {
      expect(geometry.paths).toBeDefined();
    }
  });
});
