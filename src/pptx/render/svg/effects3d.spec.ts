/**
 * @file Tests for 3D Effects Renderer
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Scene/Shape Properties)
 */

import {
  calculateCameraTransform,
  calculateLightingGradient,
  renderBevelEffect,
  renderExtrusionEffect,
  render3dEffects,
  has3dEffects,
} from "./effects3d";
import type { Scene3d, Shape3d, LightRig, Bevel3d } from "../../domain";
import { px } from "../../domain/types";

describe("effects3d - ECMA-376 compliance", () => {
  describe("calculateCameraTransform (ECMA-376 20.1.5.2)", () => {
    it("returns no transform for orthographicFront", () => {
      const result = calculateCameraTransform("orthographicFront");

      expect(result.transform).toBe("");
      expect(result.skewX).toBe(0);
      expect(result.skewY).toBe(0);
      expect(result.scaleX).toBe(1);
      expect(result.scaleY).toBe(1);
    });

    it("applies skew for isometric views", () => {
      const result = calculateCameraTransform("isometricTopUp");

      expect(result.skewX).toBe(-30);
      expect(result.skewY).toBe(30);
      expect(result.transform).toContain("skewX");
      expect(result.transform).toContain("skewY");
    });

    it("applies skew for oblique views", () => {
      const topLeft = calculateCameraTransform("obliqueTopLeft");
      expect(topLeft.skewX).toBe(-15);
      expect(topLeft.skewY).toBe(-15);

      const bottomRight = calculateCameraTransform("obliqueBottomRight");
      expect(bottomRight.skewX).toBe(15);
      expect(bottomRight.skewY).toBe(15);
    });

    it("applies scale for perspective views", () => {
      const result = calculateCameraTransform("perspectiveFront");

      expect(result.scaleY).toBeLessThan(1);
      expect(result.transform).toContain("scale");
    });

    it("handles unknown presets with default transform", () => {
      const result = calculateCameraTransform("unknownPreset");

      expect(result.transform).toBe("");
      expect(result.skewX).toBe(0);
    });
  });

  describe("calculateLightingGradient (ECMA-376 20.1.5.6)", () => {
    it("creates gradient with correct direction for tl light", () => {
      const lightRig: LightRig = { rig: "threePt", direction: "tl" };
      const result = calculateLightingGradient(lightRig, "test-gradient");

      expect(result).toContain('id="test-gradient"');
      expect(result).toContain("linearGradient");
      expect(result).toContain('x1="0%"');
      expect(result).toContain('y1="0%"');
    });

    it("creates gradient with correct direction for br light", () => {
      const lightRig: LightRig = { rig: "threePt", direction: "br" };
      const result = calculateLightingGradient(lightRig, "test-gradient");

      expect(result).toContain('x1="100%"');
      expect(result).toContain('y1="100%"');
    });

    it("adjusts intensity for harsh lighting", () => {
      const lightRig: LightRig = { rig: "harsh", direction: "t" };
      const result = calculateLightingGradient(lightRig, "test-gradient");

      // Harsh lighting has higher opacity values
      expect(result).toContain("stop-opacity");
    });

    it("adjusts intensity for soft lighting", () => {
      const lightRig: LightRig = { rig: "soft", direction: "t" };
      const result = calculateLightingGradient(lightRig, "test-gradient");

      expect(result).toContain("stop-opacity");
    });
  });

  describe("renderBevelEffect (ECMA-376 20.1.5.1)", () => {
    it("returns empty string for zero-size bevel", () => {
      const bevel: Bevel3d = { width: px(0), height: px(0), preset: "circle" };
      const result = renderBevelEffect(bevel, 100, 100);

      expect(result).toBe("");
    });

    it("creates bevel paths for valid dimensions", () => {
      const bevel: Bevel3d = { width: px(10), height: px(10), preset: "circle" };
      const result = renderBevelEffect(bevel, 100, 100);

      expect(result).toContain("bevel-effect");
      expect(result).toContain("<path");
      expect(result).toContain("rgba");
    });

    it("limits bevel size to quarter of shape", () => {
      const bevel: Bevel3d = { width: px(100), height: px(100), preset: "circle" };
      const result = renderBevelEffect(bevel, 40, 40);

      // Should be clamped to 10 (40 / 4)
      expect(result).toContain("<path");
    });

    it("applies highlight based on light direction", () => {
      const bevel: Bevel3d = { width: px(10), height: px(10), preset: "circle" };

      const tlResult = renderBevelEffect(bevel, 100, 100, "tl");
      expect(tlResult).toContain("255,255,255"); // White highlight

      const brResult = renderBevelEffect(bevel, 100, 100, "br");
      expect(brResult).toContain("255,255,255"); // Highlight on different sides
    });
  });

  describe("renderExtrusionEffect (ECMA-376 20.1.5.9)", () => {
    const testPath = "M 0,0 L 100,0 L 100,100 L 0,100 Z";

    it("returns empty string for zero height", () => {
      const result = renderExtrusionEffect(testPath, 0);
      expect(result).toBe("");
    });

    it("returns empty string for negative height", () => {
      const result = renderExtrusionEffect(testPath, -10);
      expect(result).toBe("");
    });

    it("creates extrusion layers for valid height", () => {
      const result = renderExtrusionEffect(testPath, 20);

      expect(result).toContain("extrusion-effect");
      expect(result).toContain("<path");
      expect(result).toContain("translate");
    });

    it("uses specified extrusion color", () => {
      const result = renderExtrusionEffect(testPath, 20, "#ff0000");

      expect(result).toContain('fill="#ff0000"');
    });

    it("adjusts offset based on camera preset", () => {
      const obliqueResult = renderExtrusionEffect(testPath, 20, "#666666", "obliqueTopRight");
      const frontResult = renderExtrusionEffect(testPath, 20, "#666666", "orthographicFront");

      // Different camera angles should produce different offsets
      expect(obliqueResult).not.toBe(frontResult);
    });
  });

  describe("render3dEffects", () => {
    const testPath = "M 0,0 L 100,0 L 100,100 L 0,100 Z";

    it("returns empty result when no 3D properties", () => {
      const result = render3dEffects(undefined, undefined, testPath, 100, 100, "test");

      expect(result.extrusionElements).toBe("");
      expect(result.bevelElements).toBe("");
      expect(result.gradientDefs).toBe("");
      expect(result.transform.transform).toBe("");
    });

    it("generates extrusion when specified", () => {
      const shape3d: Shape3d = {
        extrusionHeight: px(20),
      };
      const result = render3dEffects(undefined, shape3d, testPath, 100, 100, "test");

      expect(result.extrusionElements).toContain("extrusion-effect");
    });

    it("generates bevel when specified", () => {
      const shape3d: Shape3d = {
        bevel: { width: px(10), height: px(10), preset: "circle" },
      };
      const result = render3dEffects(undefined, shape3d, testPath, 100, 100, "test");

      expect(result.bevelElements).toContain("bevel-effect");
    });

    it("generates lighting gradient when lightRig specified", () => {
      const scene3d: Scene3d = {
        camera: { preset: "orthographicFront" },
        lightRig: { rig: "threePt", direction: "tl" },
      };
      const result = render3dEffects(scene3d, undefined, testPath, 100, 100, "test");

      expect(result.gradientDefs).toContain("linearGradient");
      expect(result.gradientDefs).toContain("lighting-test");
    });

    it("applies camera transform from scene", () => {
      const scene3d: Scene3d = {
        camera: { preset: "isometricTopUp" },
        lightRig: { rig: "threePt", direction: "tl" },
      };
      const result = render3dEffects(scene3d, undefined, testPath, 100, 100, "test");

      expect(result.transform.skewX).toBe(-30);
      expect(result.transform.skewY).toBe(30);
    });

    it("combines scene and shape 3D effects", () => {
      const scene3d: Scene3d = {
        camera: { preset: "obliqueTopRight" },
        lightRig: { rig: "harsh", direction: "tr" },
      };
      const shape3d: Shape3d = {
        extrusionHeight: px(15),
        bevel: { width: px(5), height: px(5), preset: "softRound" },
      };
      const result = render3dEffects(scene3d, shape3d, testPath, 100, 100, "test");

      expect(result.extrusionElements).toContain("extrusion-effect");
      expect(result.bevelElements).toContain("bevel-effect");
      expect(result.gradientDefs).toContain("linearGradient");
      expect(result.transform.skewX).toBe(15);
    });
  });

  describe("has3dEffects", () => {
    it("returns false when no 3D properties", () => {
      expect(has3dEffects(undefined, undefined)).toBe(false);
    });

    it("returns true when extrusion is specified", () => {
      const shape3d: Shape3d = { extrusionHeight: px(10) };
      expect(has3dEffects(undefined, shape3d)).toBe(true);
    });

    it("returns true when bevel is specified", () => {
      const shape3d: Shape3d = {
        bevel: { width: px(5), height: px(5), preset: "circle" },
      };
      expect(has3dEffects(undefined, shape3d)).toBe(true);
    });

    it("returns true when non-front camera is specified", () => {
      const scene3d: Scene3d = {
        camera: { preset: "isometricTopUp" },
        lightRig: { rig: "threePt", direction: "tl" },
      };
      expect(has3dEffects(scene3d, undefined)).toBe(true);
    });

    it("returns false for front camera without shape 3D", () => {
      const scene3d: Scene3d = {
        camera: { preset: "orthographicFront" },
        lightRig: { rig: "threePt", direction: "tl" },
      };
      expect(has3dEffects(scene3d, undefined)).toBe(false);
    });

    it("returns false for zero extrusion height", () => {
      const shape3d: Shape3d = { extrusionHeight: px(0) };
      expect(has3dEffects(undefined, shape3d)).toBe(false);
    });
  });
});
