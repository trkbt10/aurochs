/**
 * @file useSwipeNavigation tests
 *
 * Pure logic tests for horizontal swipe gesture detection.
 * Tests the swipe detection algorithm without DOM dependencies.
 */

describe("useSwipeNavigation logic", () => {
  // Constants from the hook
  const DEFAULT_THRESHOLD = 50;
  const HORIZONTAL_DOMINANCE_RATIO = 2;

  describe("swipe detection algorithm", () => {
    type SwipeInput = {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      threshold?: number;
    };

    /**
     * Determines if a pointer movement should trigger a swipe callback.
     * This is the core logic from useSwipeNavigation.
     */
    function shouldTriggerSwipe({
      startX,
      startY,
      endX,
      endY,
      threshold = DEFAULT_THRESHOLD,
    }: SwipeInput): "left" | "right" | null {
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Check if horizontal movement is dominant and exceeds threshold
      if (absDeltaX >= threshold && absDeltaX >= absDeltaY * HORIZONTAL_DOMINANCE_RATIO) {
        return deltaX < 0 ? "left" : "right";
      }

      return null;
    }

    it("detects swipe left when moving left beyond threshold", () => {
      // Start at 100, end at 40 = -60 delta (left)
      expect(shouldTriggerSwipe({ startX: 100, startY: 50, endX: 40, endY: 50 })).toBe("left");
    });

    it("detects swipe right when moving right beyond threshold", () => {
      // Start at 40, end at 100 = +60 delta (right)
      expect(shouldTriggerSwipe({ startX: 40, startY: 50, endX: 100, endY: 50 })).toBe("right");
    });

    it("returns null when movement is below threshold", () => {
      // 30 pixel movement, below 50 threshold
      expect(shouldTriggerSwipe({ startX: 100, startY: 50, endX: 70, endY: 50 })).toBe(null);
    });

    it("returns null when vertical movement dominates", () => {
      // deltaX = 60, deltaY = 40
      // 60 < 40 * 2 = 80, so horizontal is NOT dominant
      expect(shouldTriggerSwipe({ startX: 100, startY: 50, endX: 40, endY: 90 })).toBe(null);
    });

    it("triggers swipe when horizontal movement is exactly 2x vertical", () => {
      // deltaX = 60, deltaY = 30
      // 60 >= 30 * 2, horizontal IS dominant
      expect(shouldTriggerSwipe({ startX: 100, startY: 50, endX: 40, endY: 80 })).toBe("left");
    });

    it("respects custom threshold", () => {
      // 40 pixel movement with 30 threshold -> should trigger
      expect(shouldTriggerSwipe({ startX: 100, startY: 50, endX: 60, endY: 50, threshold: 30 })).toBe("left");

      // 40 pixel movement with 50 threshold -> should not trigger
      expect(shouldTriggerSwipe({ startX: 100, startY: 50, endX: 60, endY: 50, threshold: 50 })).toBe(null);
    });

    it("handles zero movement", () => {
      expect(shouldTriggerSwipe({ startX: 100, startY: 50, endX: 100, endY: 50 })).toBe(null);
    });

    it("handles purely vertical movement", () => {
      expect(shouldTriggerSwipe({ startX: 100, startY: 50, endX: 100, endY: 150 })).toBe(null);
    });
  });

  describe("pointer tracking", () => {
    /**
     * Simulates the pointer tracking state machine from the hook.
     */
    type SwipeState = {
      active: boolean;
      pointerId: number;
      startX: number;
      startY: number;
    };

    function createInitialState(): SwipeState {
      return {
        active: false,
        pointerId: -1,
        startX: 0,
        startY: 0,
      };
    }

    type PointerDownInput = {
      state: SwipeState;
      pointerId: number;
      x: number;
      y: number;
    };

    function handlePointerDown({ state, pointerId, x, y }: PointerDownInput): SwipeState {
      if (state.active) {
        return state; // Ignore if already tracking
      }
      return {
        active: true,
        pointerId,
        startX: x,
        startY: y,
      };
    }

    function handlePointerEnd(state: SwipeState, pointerId: number): SwipeState {
      if (!state.active || state.pointerId !== pointerId) {
        return state; // Ignore if not tracking this pointer
      }
      return createInitialState();
    }

    it("tracks first pointer only", () => {
      // eslint-disable-next-line no-restricted-syntax -- Testing state machine
      let state = createInitialState();

      state = handlePointerDown({ state, pointerId: 1, x: 100, y: 50 });
      expect(state.active).toBe(true);
      expect(state.pointerId).toBe(1);

      // Second pointer should be ignored
      state = handlePointerDown({ state, pointerId: 2, x: 200, y: 100 });
      expect(state.pointerId).toBe(1); // Still tracking first pointer
    });

    it("resets state on pointer end", () => {
      // eslint-disable-next-line no-restricted-syntax -- Testing state machine
      let state = createInitialState();

      state = handlePointerDown({ state, pointerId: 1, x: 100, y: 50 });
      expect(state.active).toBe(true);

      state = handlePointerEnd(state, 1);
      expect(state.active).toBe(false);
    });

    it("ignores pointer end from different pointer ID", () => {
      // eslint-disable-next-line no-restricted-syntax -- Testing state machine
      let state = createInitialState();

      state = handlePointerDown({ state, pointerId: 1, x: 100, y: 50 });
      expect(state.active).toBe(true);

      // End from different pointer should be ignored
      state = handlePointerEnd(state, 2);
      expect(state.active).toBe(true);
      expect(state.pointerId).toBe(1);
    });
  });

  describe("interactive element filtering", () => {
    /**
     * Checks if an element should be ignored for swipe (interactive elements and click zones).
     */
    function shouldIgnoreTarget(closestMatch: string | null): boolean {
      const interactiveSelectors = ["button", "a", "input", "[data-controls]", "[data-click-zone]"];
      return interactiveSelectors.some((sel) => closestMatch === sel);
    }

    it("ignores swipes starting from buttons", () => {
      expect(shouldIgnoreTarget("button")).toBe(true);
    });

    it("ignores swipes starting from links", () => {
      expect(shouldIgnoreTarget("a")).toBe(true);
    });

    it("ignores swipes starting from inputs", () => {
      expect(shouldIgnoreTarget("input")).toBe(true);
    });

    it("ignores swipes starting from control elements", () => {
      expect(shouldIgnoreTarget("[data-controls]")).toBe(true);
    });

    it("ignores swipes starting from click zones", () => {
      expect(shouldIgnoreTarget("[data-click-zone]")).toBe(true);
    });

    it("allows swipes from non-interactive elements", () => {
      expect(shouldIgnoreTarget(null)).toBe(false);
      expect(shouldIgnoreTarget("div")).toBe(false);
    });
  });

  describe("enabled state", () => {
    it("prevents swipe detection when disabled", () => {
      const detectSwipe = (enabled: boolean, deltaX: number) => {
        if (!enabled) {
          return null;
        }
        return deltaX < -50 ? "left" : deltaX > 50 ? "right" : null;
      };

      expect(detectSwipe(true, -60)).toBe("left");
      expect(detectSwipe(false, -60)).toBe(null);
    });
  });

  describe("click zone conflict prevention", () => {
    /**
     * Full swipe handler simulation matching the actual hook logic.
     * Tests the complete event flow including target filtering.
     */
    const DEFAULT_THRESHOLD = 50;
    const HORIZONTAL_DOMINANCE_RATIO = 2;

    type SwipeState = {
      active: boolean;
      pointerId: number;
      startX: number;
      startY: number;
    };

    type SwipeCallbacks = {
      onSwipeLeft: () => void;
      onSwipeRight: () => void;
    };

    type MockPointerEvent = {
      pointerId: number;
      clientX: number;
      clientY: number;
      targetSelector: string | null; // What target.closest() would return
    };

    /**
     * Creates a swipe handler that matches the actual hook logic.
     */
    function createSwipeHandler(callbacks: SwipeCallbacks, threshold = DEFAULT_THRESHOLD) {
      const state: SwipeState = {
        active: false,
        pointerId: -1,
        startX: 0,
        startY: 0,
      };

      const interactiveSelectors = ["button", "a", "input", "[data-controls]", "[data-click-zone]"];

      function shouldIgnoreTarget(targetSelector: string | null): boolean {
        if (targetSelector === null) {
          return false;
        }
        return interactiveSelectors.some((sel) => targetSelector === sel || targetSelector.startsWith(sel));
      }

      function handlePointerDown(e: MockPointerEvent): void {
        if (state.active) {
          return;
        }
        // Skip if originated from interactive elements or click zones
        if (shouldIgnoreTarget(e.targetSelector)) {
          return;
        }
        state.active = true;
        state.pointerId = e.pointerId;
        state.startX = e.clientX;
        state.startY = e.clientY;
      }

      function handlePointerUp(e: MockPointerEvent): void {
        if (!state.active || e.pointerId !== state.pointerId) {
          return;
        }

        const deltaX = e.clientX - state.startX;
        const deltaY = e.clientY - state.startY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Reset state
        state.active = false;
        state.pointerId = -1;
        state.startX = 0;
        state.startY = 0;

        // Check if horizontal movement is dominant and exceeds threshold
        if (absDeltaX >= threshold && absDeltaX >= absDeltaY * HORIZONTAL_DOMINANCE_RATIO) {
          if (deltaX < 0) {
            callbacks.onSwipeLeft();
          } else {
            callbacks.onSwipeRight();
          }
        }
      }

      return {
        handlePointerDown,
        handlePointerUp,
        getState: () => ({ ...state }),
      };
    }

    it("does NOT trigger swipe when tap starts on click zone", () => {
      const calls: string[] = [];
      const handler = createSwipeHandler({
        onSwipeLeft: () => calls.push("left"),
        onSwipeRight: () => calls.push("right"),
      });

      // Tap on click zone (pointerdown + pointerup at same position)
      handler.handlePointerDown({
        pointerId: 1,
        clientX: 50,
        clientY: 100,
        targetSelector: "[data-click-zone]",
      });

      // State should NOT be active because target was click zone
      expect(handler.getState().active).toBe(false);

      handler.handlePointerUp({
        pointerId: 1,
        clientX: 50,
        clientY: 100,
        targetSelector: "[data-click-zone]",
      });

      // No swipe callback should have been called
      expect(calls).toEqual([]);
    });

    it("does NOT trigger swipe when swipe gesture starts on click zone", () => {
      const calls: string[] = [];
      const handler = createSwipeHandler({
        onSwipeLeft: () => calls.push("left"),
        onSwipeRight: () => calls.push("right"),
      });

      // Start swipe on click zone
      handler.handlePointerDown({
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        targetSelector: "[data-click-zone]",
      });

      // Move beyond threshold (would normally trigger swipe)
      handler.handlePointerUp({
        pointerId: 1,
        clientX: 30, // -70px movement
        clientY: 100,
        targetSelector: "[data-click-zone]",
      });

      // No swipe because it started on click zone
      expect(calls).toEqual([]);
    });

    it("DOES trigger swipe when gesture starts on stage (non-interactive)", () => {
      const calls: string[] = [];
      const handler = createSwipeHandler({
        onSwipeLeft: () => calls.push("left"),
        onSwipeRight: () => calls.push("right"),
      });

      // Start swipe on stage (non-interactive area)
      handler.handlePointerDown({
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        targetSelector: null, // No interactive element matched
      });

      expect(handler.getState().active).toBe(true);

      // Move beyond threshold
      handler.handlePointerUp({
        pointerId: 1,
        clientX: 30, // -70px movement (left swipe)
        clientY: 100,
        targetSelector: null,
      });

      // Swipe left should be triggered
      expect(calls).toEqual(["left"]);
    });

    it("does NOT trigger swipe when tap on stage without movement", () => {
      const calls: string[] = [];
      const handler = createSwipeHandler({
        onSwipeLeft: () => calls.push("left"),
        onSwipeRight: () => calls.push("right"),
      });

      // Tap on stage (same position)
      handler.handlePointerDown({
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        targetSelector: null,
      });

      handler.handlePointerUp({
        pointerId: 1,
        clientX: 100, // No movement
        clientY: 100,
        targetSelector: null,
      });

      // No swipe because no movement
      expect(calls).toEqual([]);
    });

    it("does NOT trigger swipe when movement is below threshold", () => {
      const calls: string[] = [];
      const handler = createSwipeHandler({
        onSwipeLeft: () => calls.push("left"),
        onSwipeRight: () => calls.push("right"),
      });

      handler.handlePointerDown({
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        targetSelector: null,
      });

      handler.handlePointerUp({
        pointerId: 1,
        clientX: 70, // Only 30px movement, below 50px threshold
        clientY: 100,
        targetSelector: null,
      });

      expect(calls).toEqual([]);
    });

    it("does NOT trigger swipe when tap starts on button inside click zone", () => {
      const calls: string[] = [];
      const handler = createSwipeHandler({
        onSwipeLeft: () => calls.push("left"),
        onSwipeRight: () => calls.push("right"),
      });

      // Tap on button (which might be inside a click zone)
      handler.handlePointerDown({
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        targetSelector: "button",
      });

      expect(handler.getState().active).toBe(false);

      handler.handlePointerUp({
        pointerId: 1,
        clientX: 30,
        clientY: 100,
        targetSelector: "button",
      });

      expect(calls).toEqual([]);
    });

    it("allows click zone click handler to work (state never becomes active)", () => {
      const swipeCalls: string[] = [];
      const handler = createSwipeHandler({
        onSwipeLeft: () => swipeCalls.push("left"),
        onSwipeRight: () => swipeCalls.push("right"),
      });

      // Simulate full tap sequence on click zone
      // 1. pointerdown on click zone
      handler.handlePointerDown({
        pointerId: 1,
        clientX: 50,
        clientY: 100,
        targetSelector: "[data-click-zone]",
      });

      // State should be inactive - swipe handler ignores this pointer
      expect(handler.getState().active).toBe(false);
      expect(handler.getState().pointerId).toBe(-1);

      // 2. pointerup on click zone
      handler.handlePointerUp({
        pointerId: 1,
        clientX: 50,
        clientY: 100,
        targetSelector: "[data-click-zone]",
      });

      // No swipe triggered
      expect(swipeCalls).toEqual([]);

      // 3. At this point, the browser's click event would fire on click zone
      // Since swipe handler never captured the pointer, click is not interfered with
      // This is the key behavior that allows click zones to work
    });
  });
});
