/** @file Layer node presentation rule tests. */

import { resolveLayerNodePresentation } from "./layer-node-presentation";

describe("resolveLayerNodePresentation", () => {
  it("decorates structural node types with stable badges and backgrounds", () => {
    expect(resolveLayerNodePresentation("FRAME", false)).toMatchObject({
      iconColor: "#248EFF",
      rowStyle: { backgroundColor: "rgba(36, 142, 255, 0.05)" },
      badge: { label: "Frame", color: "#248EFF" },
    });
    expect(resolveLayerNodePresentation("COMPONENT", false)).toMatchObject({
      iconColor: "#9747FF",
      rowStyle: { backgroundColor: "rgba(151, 71, 255, 0.08)" },
      badge: { label: "Component", color: "#9747FF" },
    });
    expect(resolveLayerNodePresentation("SYMBOL", false)).toMatchObject({
      iconColor: "#10B981",
      rowStyle: { backgroundColor: "rgba(16, 185, 129, 0.07)" },
      badge: { label: "Symbol", color: "#10B981" },
    });
  });

  it("marks all rows inside an instance as inherited", () => {
    expect(resolveLayerNodePresentation("RECTANGLE", true)).toMatchObject({
      iconColor: "#9747FF",
      rowStyle: { backgroundColor: "rgba(151, 71, 255, 0.06)" },
      badge: { label: "Inherited", color: "#9747FF" },
    });
  });

  it("keeps primitive rows undecorated outside special contexts", () => {
    expect(resolveLayerNodePresentation("RECTANGLE", false)).toEqual({
      iconColor: undefined,
      rowStyle: undefined,
      badge: undefined,
    });
  });
});
