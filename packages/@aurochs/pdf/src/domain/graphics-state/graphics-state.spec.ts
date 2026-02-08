/**
 * @file Tests for PDF graphics state management
 */

import {
  createGraphicsStateStack,
  IDENTITY_MATRIX,
  multiplyMatrices,
  transformPoint,
  invertMatrix,
  translationMatrix,
  scalingMatrix,
  rotationMatrix,
  isIdentityMatrix,
  isSimpleTransform,
  getMatrixScale,
  decomposeMatrix,
  hasShear,
} from "..";
import type { GraphicsStateStack } from "..";

describe("GraphicsStateStack", () => {
  const stack: GraphicsStateStack = createGraphicsStateStack();

  beforeEach(() => {
    stack.reset();
  });

  describe("initial state", () => {
    it("starts with identity CTM", () => {
      const state = stack.get();
      expect(state.ctm).toEqual(IDENTITY_MATRIX);
    });

    it("starts with default colors", () => {
      const state = stack.get();
      expect(state.fillColor.colorSpace).toBe("DeviceGray");
      expect(state.strokeColor.colorSpace).toBe("DeviceGray");
    });

    it("starts with default line style", () => {
      const state = stack.get();
      expect(state.lineWidth).toBe(1);
      expect(state.lineCap).toBe(0);
      expect(state.lineJoin).toBe(0);
    });
  });

  describe("push/pop", () => {
    it("saves and restores state", () => {
      stack.setLineWidth(5);
      stack.push();
      stack.setLineWidth(10);
      expect(stack.get().lineWidth).toBe(10);
      stack.pop();
      expect(stack.get().lineWidth).toBe(5);
    });

    it("handles multiple levels", () => {
      stack.setLineWidth(1);
      stack.push();
      stack.setLineWidth(2);
      stack.push();
      stack.setLineWidth(3);
      expect(stack.get().lineWidth).toBe(3);
      stack.pop();
      expect(stack.get().lineWidth).toBe(2);
      stack.pop();
      expect(stack.get().lineWidth).toBe(1);
    });

    it("handles pop on empty stack", () => {
      stack.pop();
      const state = stack.get();
      expect(state.lineWidth).toBe(1);
    });
  });

  describe("color operations", () => {
    it("sets fill gray", () => {
      stack.setFillGray(0.5);
      const state = stack.get();
      expect(state.fillColor.colorSpace).toBe("DeviceGray");
      expect(state.fillColor.components).toEqual([0.5]);
    });

    it("sets stroke gray", () => {
      stack.setStrokeGray(0.75);
      const state = stack.get();
      expect(state.strokeColor.colorSpace).toBe("DeviceGray");
      expect(state.strokeColor.components).toEqual([0.75]);
    });

    it("sets fill RGB", () => {
      stack.setFillRgb(1, 0, 0);
      const state = stack.get();
      expect(state.fillColor.colorSpace).toBe("DeviceRGB");
      expect(state.fillColor.components).toEqual([1, 0, 0]);
    });

    it("sets stroke RGB", () => {
      stack.setStrokeRgb(0, 1, 0);
      const state = stack.get();
      expect(state.strokeColor.colorSpace).toBe("DeviceRGB");
      expect(state.strokeColor.components).toEqual([0, 1, 0]);
    });

    it("sets fill CMYK", () => {
      stack.setFillCmyk({ c: 1, m: 0, y: 0, k: 0 });
      const state = stack.get();
      expect(state.fillColor.colorSpace).toBe("DeviceCMYK");
      expect(state.fillColor.components).toEqual([1, 0, 0, 0]);
    });

    it("sets stroke CMYK", () => {
      stack.setStrokeCmyk({ c: 0, m: 1, y: 0, k: 0 });
      const state = stack.get();
      expect(state.strokeColor.colorSpace).toBe("DeviceCMYK");
      expect(state.strokeColor.components).toEqual([0, 1, 0, 0]);
    });
  });

  describe("line style operations", () => {
    it("sets line width", () => {
      stack.setLineWidth(2.5);
      expect(stack.get().lineWidth).toBe(2.5);
    });

    it("sets line cap", () => {
      stack.setLineCap(1);
      expect(stack.get().lineCap).toBe(1);
    });

    it("sets line join", () => {
      stack.setLineJoin(2);
      expect(stack.get().lineJoin).toBe(2);
    });

    it("sets miter limit", () => {
      stack.setMiterLimit(15);
      expect(stack.get().miterLimit).toBe(15);
    });

    it("sets dash pattern", () => {
      stack.setDashPattern([3, 2], 1);
      const state = stack.get();
      expect(state.dashArray).toEqual([3, 2]);
      expect(state.dashPhase).toBe(1);
    });
  });

  describe("matrix operations", () => {
    it("concatenates translation", () => {
      stack.concatMatrix([1, 0, 0, 1, 100, 50]);
      const state = stack.get();
      expect(state.ctm[4]).toBe(100);
      expect(state.ctm[5]).toBe(50);
    });

    it("concatenates scale", () => {
      stack.concatMatrix([2, 0, 0, 2, 0, 0]);
      const state = stack.get();
      expect(state.ctm[0]).toBe(2);
      expect(state.ctm[3]).toBe(2);
    });

    it("concatenates multiple transforms", () => {
      stack.concatMatrix([1, 0, 0, 1, 100, 0]); // translate
      stack.concatMatrix([2, 0, 0, 2, 0, 0]); // scale
      const state = stack.get();
      // Pre-multiplication: translation remains, scale is applied
      expect(state.ctm[4]).toBe(100);
      expect(state.ctm[0]).toBe(2);
    });
  });

  describe("alpha operations", () => {
    it("sets fill alpha", () => {
      stack.setFillAlpha(0.5);
      expect(stack.get().fillAlpha).toBe(0.5);
    });

    it("sets stroke alpha", () => {
      stack.setStrokeAlpha(0.75);
      expect(stack.get().strokeAlpha).toBe(0.75);
    });
  });

  describe("text state operations (PDF Reference 9.3)", () => {
    it("has default text state values", () => {
      const state = stack.get();
      expect(state.charSpacing).toBe(0);
      expect(state.wordSpacing).toBe(0);
      expect(state.horizontalScaling).toBe(100);
      expect(state.textLeading).toBe(0);
      expect(state.textRenderingMode).toBe(0);
      expect(state.textRise).toBe(0);
    });

    it("sets character spacing (Tc)", () => {
      stack.setCharSpacing(2.5);
      expect(stack.get().charSpacing).toBe(2.5);
    });

    it("sets word spacing (Tw)", () => {
      stack.setWordSpacing(3.0);
      expect(stack.get().wordSpacing).toBe(3.0);
    });

    it("sets horizontal scaling (Tz)", () => {
      stack.setHorizontalScaling(150);
      expect(stack.get().horizontalScaling).toBe(150);
    });

    it("sets text leading (TL)", () => {
      stack.setTextLeading(12);
      expect(stack.get().textLeading).toBe(12);
    });

    it("sets text rendering mode (Tr)", () => {
      stack.setTextRenderingMode(3);
      expect(stack.get().textRenderingMode).toBe(3);
    });

    it("sets text rise (Ts)", () => {
      stack.setTextRise(-5);
      expect(stack.get().textRise).toBe(-5);
    });

    it("preserves text state across push/pop", () => {
      stack.setCharSpacing(1);
      stack.setWordSpacing(2);
      stack.setTextLeading(14);
      stack.push();
      stack.setCharSpacing(10);
      stack.setWordSpacing(20);
      expect(stack.get().charSpacing).toBe(10);
      expect(stack.get().wordSpacing).toBe(20);
      stack.pop();
      expect(stack.get().charSpacing).toBe(1);
      expect(stack.get().wordSpacing).toBe(2);
      expect(stack.get().textLeading).toBe(14);
    });
  });
});

describe("matrix operations", () => {
  describe("multiplyMatrices", () => {
    it("multiplies with identity", () => {
      const m: [number, number, number, number, number, number] = [2, 0, 0, 3, 10, 20];
      const result = multiplyMatrices(m, IDENTITY_MATRIX);
      expect(result).toEqual(m);
    });

    it("multiplies translation matrices", () => {
      const t1: [number, number, number, number, number, number] = [1, 0, 0, 1, 10, 0];
      const t2: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 20];
      const result = multiplyMatrices(t1, t2);
      expect(result[4]).toBe(10);
      expect(result[5]).toBe(20);
    });

    it("multiplies scale and translation", () => {
      const scale: [number, number, number, number, number, number] = [2, 0, 0, 2, 0, 0];
      const translate: [number, number, number, number, number, number] = [1, 0, 0, 1, 10, 10];
      const result = multiplyMatrices(scale, translate);
      // Pre-multiplication: result is scale then translate
      expect(result[0]).toBe(2);
      expect(result[3]).toBe(2);
      expect(result[4]).toBe(10);
      expect(result[5]).toBe(10);
    });
  });

  describe("transformPoint", () => {
    it("transforms with identity", () => {
      const point = { x: 10, y: 20 };
      const result = transformPoint(point, IDENTITY_MATRIX);
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
    });

    it("transforms with translation", () => {
      const point = { x: 0, y: 0 };
      const matrix: [number, number, number, number, number, number] = [1, 0, 0, 1, 100, 50];
      const result = transformPoint(point, matrix);
      expect(result.x).toBe(100);
      expect(result.y).toBe(50);
    });

    it("transforms with scale", () => {
      const point = { x: 10, y: 20 };
      const matrix: [number, number, number, number, number, number] = [2, 0, 0, 3, 0, 0];
      const result = transformPoint(point, matrix);
      expect(result.x).toBe(20);
      expect(result.y).toBe(60);
    });
  });

  describe("invertMatrix", () => {
    it("inverts identity", () => {
      const inv = invertMatrix(IDENTITY_MATRIX);
      expect(inv).not.toBeNull();
      if (inv) {
        expect(inv[0]).toBeCloseTo(1);
        expect(inv[1]).toBeCloseTo(0);
        expect(inv[2]).toBeCloseTo(0);
        expect(inv[3]).toBeCloseTo(1);
        expect(inv[4]).toBeCloseTo(0);
        expect(inv[5]).toBeCloseTo(0);
      }
    });

    it("inverts translation", () => {
      const matrix: [number, number, number, number, number, number] = [1, 0, 0, 1, 10, 20];
      const inv = invertMatrix(matrix);
      expect(inv).not.toBeNull();
      if (inv) {
        expect(inv[4]).toBeCloseTo(-10);
        expect(inv[5]).toBeCloseTo(-20);
      }
    });

    it("returns null for singular matrix", () => {
      const singular: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
      const inv = invertMatrix(singular);
      expect(inv).toBeNull();
    });
  });

  describe("matrix factories", () => {
    it("creates translation matrix", () => {
      const m = translationMatrix(10, 20);
      expect(m).toEqual([1, 0, 0, 1, 10, 20]);
    });

    it("creates scaling matrix", () => {
      const m = scalingMatrix(2, 3);
      expect(m).toEqual([2, 0, 0, 3, 0, 0]);
    });

    it("creates rotation matrix", () => {
      const m = rotationMatrix(Math.PI / 2);
      expect(m[0]).toBeCloseTo(0);
      expect(m[1]).toBeCloseTo(1);
      expect(m[2]).toBeCloseTo(-1);
      expect(m[3]).toBeCloseTo(0);
    });
  });

  describe("matrix checks", () => {
    it("identifies identity matrix", () => {
      expect(isIdentityMatrix(IDENTITY_MATRIX)).toBe(true);
      expect(isIdentityMatrix([1, 0, 0, 1, 0.0000001, 0])).toBe(true);
      expect(isIdentityMatrix([2, 0, 0, 1, 0, 0])).toBe(false);
    });

    it("identifies simple transform", () => {
      expect(isSimpleTransform([2, 0, 0, 3, 10, 20])).toBe(true);
      expect(isSimpleTransform([1, 0.5, 0, 1, 0, 0])).toBe(false);
    });

    it("extracts scale factors", () => {
      const scale = getMatrixScale([2, 0, 0, 3, 0, 0]);
      expect(scale.scaleX).toBe(2);
      expect(scale.scaleY).toBe(3);
    });
  });

  describe("decomposeMatrix", () => {
    it("decomposes identity matrix", () => {
      const result = decomposeMatrix(IDENTITY_MATRIX);
      expect(result.scaleX).toBeCloseTo(1);
      expect(result.scaleY).toBeCloseTo(1);
      expect(result.rotation).toBeCloseTo(0);
      expect(result.translateX).toBeCloseTo(0);
      expect(result.translateY).toBeCloseTo(0);
      expect(result.isSimple).toBe(true);
      expect(result.hasRotation).toBe(false);
      expect(result.hasScale).toBe(false);
    });

    it("decomposes translation matrix", () => {
      const result = decomposeMatrix([1, 0, 0, 1, 100, 50]);
      expect(result.scaleX).toBeCloseTo(1);
      expect(result.scaleY).toBeCloseTo(1);
      expect(result.translateX).toBeCloseTo(100);
      expect(result.translateY).toBeCloseTo(50);
      expect(result.isSimple).toBe(true);
    });

    it("decomposes scale matrix", () => {
      const result = decomposeMatrix([2, 0, 0, 3, 0, 0]);
      expect(result.scaleX).toBeCloseTo(2);
      expect(result.scaleY).toBeCloseTo(3);
      expect(result.rotation).toBeCloseTo(0);
      expect(result.isSimple).toBe(true);
      expect(result.hasScale).toBe(true);
    });

    it("decomposes 90-degree rotation matrix", () => {
      const cos90 = Math.cos(Math.PI / 2);
      const sin90 = Math.sin(Math.PI / 2);
      const result = decomposeMatrix([cos90, sin90, -sin90, cos90, 0, 0]);
      expect(result.rotation).toBeCloseTo(Math.PI / 2);
      expect(result.scaleX).toBeCloseTo(1);
      expect(result.scaleY).toBeCloseTo(1);
      expect(result.isSimple).toBe(true);
      expect(result.hasRotation).toBe(true);
    });

    it("decomposes 45-degree rotation with scale", () => {
      const cos45 = Math.cos(Math.PI / 4);
      const sin45 = Math.sin(Math.PI / 4);
      // Scale 2x with 45-degree rotation
      const result = decomposeMatrix([2 * cos45, 2 * sin45, -2 * sin45, 2 * cos45, 0, 0]);
      expect(result.rotation).toBeCloseTo(Math.PI / 4);
      expect(result.scaleX).toBeCloseTo(2);
      expect(result.scaleY).toBeCloseTo(2);
      expect(result.isSimple).toBe(true);
    });

    it("detects shear matrix", () => {
      // Shear matrix: [1, 0, 0.5, 1, 0, 0] (horizontal shear)
      const result = decomposeMatrix([1, 0, 0.5, 1, 0, 0]);
      expect(result.isSimple).toBe(false);
    });

    it("detects complex skew matrix", () => {
      // Matrix with both rotation and shear
      const result = decomposeMatrix([1, 0.3, 0.5, 1, 0, 0]);
      expect(result.isSimple).toBe(false);
    });

    it("handles negative scale (reflection)", () => {
      // Reflect in X-axis
      const result = decomposeMatrix([-1, 0, 0, 1, 0, 0]);
      expect(Math.abs(result.scaleX)).toBeCloseTo(1);
      expect(result.scaleY).toBeCloseTo(-1);
    });
  });

  describe("hasShear", () => {
    it("returns false for identity", () => {
      expect(hasShear(IDENTITY_MATRIX)).toBe(false);
    });

    it("returns false for pure rotation", () => {
      const cos = Math.cos(Math.PI / 4);
      const sin = Math.sin(Math.PI / 4);
      expect(hasShear([cos, sin, -sin, cos, 0, 0])).toBe(false);
    });

    it("returns false for pure scale", () => {
      expect(hasShear([2, 0, 0, 3, 0, 0])).toBe(false);
    });

    it("returns true for shear matrix", () => {
      expect(hasShear([1, 0, 0.5, 1, 0, 0])).toBe(true);
    });

    it("returns true for skewed matrix", () => {
      expect(hasShear([1, 0.2, 0.3, 1, 0, 0])).toBe(true);
    });
  });
});
