/**
 * @file Effect module integration tests
 */

import { dropShadow, innerShadow, layerBlur, effects } from "./index";

describe("effects utility", () => {
  it("combines multiple effects into array", () => {
    const result = effects(
      dropShadow().offset(0, 4).blur(4),
      innerShadow().offset(0, 2).blur(2),
      layerBlur().radius(5)
    );

    expect(result).toHaveLength(3);
    expect(result[0].type.name).toBe("DROP_SHADOW");
    expect(result[1].type.name).toBe("INNER_SHADOW");
    expect(result[2].type.name).toBe("FOREGROUND_BLUR");
  });

  it("creates empty array when no effects provided", () => {
    const result = effects();

    expect(result).toHaveLength(0);
  });

  it("allows single effect", () => {
    const result = effects(dropShadow());

    expect(result).toHaveLength(1);
  });
});
