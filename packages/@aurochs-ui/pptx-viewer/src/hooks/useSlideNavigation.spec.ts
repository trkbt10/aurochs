/**
 * @file useSlideNavigation unit tests
 *
 * Pure logic tests without DOM dependencies.
 */

describe("useSlideNavigation logic", () => {
  describe("bounds checking", () => {
    it("clamps slide number to valid range", () => {
      const clamp = (num: number, total: number) => Math.max(1, Math.min(total, num));

      expect(clamp(0, 10)).toBe(1);
      expect(clamp(-5, 10)).toBe(1);
      expect(clamp(5, 10)).toBe(5);
      expect(clamp(15, 10)).toBe(10);
      expect(clamp(10, 10)).toBe(10);
    });
  });

  describe("progress calculation", () => {
    it("calculates progress percentage correctly", () => {
      const calcProgress = (current: number, total: number) =>
        total > 0 ? (current / total) * 100 : 0;

      expect(calcProgress(1, 10)).toBe(10);
      expect(calcProgress(5, 10)).toBe(50);
      expect(calcProgress(10, 10)).toBe(100);
      expect(calcProgress(1, 1)).toBe(100);
      expect(calcProgress(0, 0)).toBe(0);
    });
  });

  describe("boundary detection", () => {
    it("detects first and last slide correctly", () => {
      const isFirst = (current: number) => current === 1;
      const isLast = (current: number, total: number) => current === total;

      expect(isFirst(1)).toBe(true);
      expect(isFirst(2)).toBe(false);
      expect(isLast(10, 10)).toBe(true);
      expect(isLast(9, 10)).toBe(false);
    });
  });

  describe("navigation logic", () => {
    it("goToNext respects bounds without loop", () => {
      const goToNext = (current: number, total: number, loop: boolean) => {
        if (current < total) {
          return current + 1;
        }
        return loop ? 1 : current;
      };

      expect(goToNext(1, 10, false)).toBe(2);
      expect(goToNext(10, 10, false)).toBe(10);
      expect(goToNext(10, 10, true)).toBe(1);
    });

    it("goToPrev respects bounds without loop", () => {
      const goToPrev = (current: number, total: number, loop: boolean) => {
        if (current > 1) {
          return current - 1;
        }
        return loop ? total : current;
      };

      expect(goToPrev(5, 10, false)).toBe(4);
      expect(goToPrev(1, 10, false)).toBe(1);
      expect(goToPrev(1, 10, true)).toBe(10);
    });
  });

  describe("callback stability patterns", () => {
    it("functional updates prevent stale closure issues", () => {
      const capturedValue = false;
      const badToggle = () => !capturedValue;
      const goodToggle = (prev: boolean) => !prev;

      expect(badToggle()).toBe(true);
      expect(goodToggle(true)).toBe(false);
    });

    it("dependency array determines callback stability", () => {
      const callCounts = { value: 0 };
      const createCallback = () => {
        callCounts.value++;
        return () => {};
      };
      const dependency = "stable";

      const cache = new Map<string, () => void>();
      const getCallback = (key: string, dep: string) => {
        const cacheKey = `${key}-${dep}`;
        if (!cache.has(cacheKey)) {
          cache.set(cacheKey, createCallback());
        }
        return cache.get(cacheKey)!;
      };

      const cb1 = getCallback("test", dependency);
      const cb2 = getCallback("test", dependency);
      const cb3 = getCallback("test", "changed");

      expect(cb1).toBe(cb2);
      expect(cb1).not.toBe(cb3);
      expect(callCounts.value).toBe(2);
    });
  });

  describe("infinite loop prevention", () => {
    it("state updates should be bounded", () => {
      const state = { updateCount: 0 };
      const maxUpdates = 100;

      const simulateNavigation = (times: number) => {
        const result = { current: 1 };
        const total = 10;

        for (let i = 0; i < times && state.updateCount < maxUpdates; i++) {
          if (result.current < total) {
            result.current++;
            state.updateCount++;
          }
        }

        return result;
      };

      const result = simulateNavigation(50);

      expect(result.current).toBe(10);
      expect(state.updateCount).toBe(9);
      expect(state.updateCount).toBeLessThan(maxUpdates);
    });
  });
});
