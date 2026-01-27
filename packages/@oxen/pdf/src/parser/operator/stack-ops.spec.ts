/**
 * @file Tests for operand stack operations
 */

import {
  popNumber,
  popString,
  popArray,
  popNumbers,
  pushValue,
  pushValues,
  finalizeArray,
  collectColorComponents,
} from "./stack-ops";

describe("stack-ops", () => {
  describe("popNumber", () => {
    it("pops number from stack", () => {
      const [value, newStack] = popNumber([1, 2, 3]);
      expect(value).toBe(3);
      expect(newStack).toEqual([1, 2]);
    });

    it("returns 0 for empty stack", () => {
      const [value, newStack] = popNumber([]);
      expect(value).toBe(0);
      expect(newStack).toEqual([]);
    });

    it("returns 0 for non-number value", () => {
      const [value, newStack] = popNumber([1, "string"]);
      expect(value).toBe(0);
      expect(newStack).toEqual([1]);
    });
  });

  describe("popString", () => {
    it("pops string from stack", () => {
      const [value, newStack] = popString([1, "hello"]);
      expect(value).toBe("hello");
      expect(newStack).toEqual([1]);
    });

    it("returns empty string for empty stack", () => {
      const [value, newStack] = popString([]);
      expect(value).toBe("");
      expect(newStack).toEqual([]);
    });

    it("returns empty string for non-string value", () => {
      const [value, newStack] = popString([1, 42]);
      expect(value).toBe("");
      expect(newStack).toEqual([1]);
    });
  });

  describe("popArray", () => {
    it("pops array from stack", () => {
      const [value, newStack] = popArray([1, [10, 20]]);
      expect(value).toEqual([10, 20]);
      expect(newStack).toEqual([1]);
    });

    it("returns empty array for empty stack", () => {
      const [value, newStack] = popArray([]);
      expect(value).toEqual([]);
      expect(newStack).toEqual([]);
    });

    it("returns empty array for non-array value", () => {
      const [value, newStack] = popArray([1, 42]);
      expect(value).toEqual([]);
      expect(newStack).toEqual([1]);
    });
  });

  describe("popNumbers", () => {
    it("pops multiple numbers in original order", () => {
      const [values, newStack] = popNumbers([1, 2, 3, 4, 5, 6], 6);
      expect(values).toEqual([1, 2, 3, 4, 5, 6]);
      expect(newStack).toEqual([]);
    });

    it("handles partial pop", () => {
      const [values, newStack] = popNumbers([1, 2, 3, 4], 2);
      expect(values).toEqual([3, 4]);
      expect(newStack).toEqual([1, 2]);
    });
  });

  describe("pushValue", () => {
    it("pushes value onto stack", () => {
      const newStack = pushValue([1, 2], 3);
      expect(newStack).toEqual([1, 2, 3]);
    });

    it("pushes to empty stack", () => {
      const newStack = pushValue([], "hello");
      expect(newStack).toEqual(["hello"]);
    });
  });

  describe("pushValues", () => {
    it("pushes multiple values onto stack", () => {
      const newStack = pushValues([1], [2, 3, 4]);
      expect(newStack).toEqual([1, 2, 3, 4]);
    });
  });

  describe("finalizeArray", () => {
    it("collects elements since array start marker", () => {
      // Stack: [..., [], 1, 2, 3] where [] is array start marker
      const stack = [100, [], 1, 2, 3];
      const newStack = finalizeArray(stack);
      expect(newStack).toEqual([100, [1, 2, 3]]);
    });

    it("handles empty array", () => {
      const stack = [100, []];
      const newStack = finalizeArray(stack);
      expect(newStack).toEqual([100, []]);
    });

    it("handles nested content", () => {
      const stack = [[], "a", 10, "b"];
      const newStack = finalizeArray(stack);
      expect(newStack).toEqual([["a", 10, "b"]]);
    });
  });

  describe("collectColorComponents", () => {
    it("collects numeric values from stack", () => {
      const [components, newStack] = collectColorComponents(["/CS", 0.5, 0.3, 0.2]);
      expect(components).toEqual([0.5, 0.3, 0.2]);
      expect(newStack).toEqual(["/CS"]);
    });

    it("stops at non-numeric value", () => {
      const [components, newStack] = collectColorComponents(["name", 1, 0, 0, 0.5]);
      expect(components).toEqual([1, 0, 0, 0.5]);
      expect(newStack).toEqual(["name"]);
    });

    it("handles all-numeric stack", () => {
      const [components, newStack] = collectColorComponents([0.1, 0.2, 0.3]);
      expect(components).toEqual([0.1, 0.2, 0.3]);
      expect(newStack).toEqual([]);
    });

    it("handles empty stack", () => {
      const [components, newStack] = collectColorComponents([]);
      expect(components).toEqual([]);
      expect(newStack).toEqual([]);
    });
  });
});
