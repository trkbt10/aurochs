/**
 * @file Tests for coordinate mapper re-exports from drawing-ml
 */
import { createMapperConfig, mapBoundsToGrid } from "@aurochs-renderer/drawing-ml/ascii";

describe("coordinate-mapper (pptx re-export)", () => {
  it("re-exports coordinate mapper from drawing-ml", () => {
    const config = createMapperConfig(960, 540, 80);
    expect(config.gridWidth).toBe(80);
    expect(config.gridHeight).toBe(23);
  });

  it("maps bounds to grid correctly", () => {
    const config = createMapperConfig(960, 540, 80);
    const rect = mapBoundsToGrid(config, { x: 0, y: 0, width: 960, height: 540 });
    expect(rect).toEqual({ col: 0, row: 0, width: 80, height: 23 });
  });
});
