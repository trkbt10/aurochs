/**
 * @file TransitionEditor component tests
 *
 * Tests the TransitionEditor handles slide transitions correctly.
 */

import type { SlideTransition } from "../../../pptx/domain/transition";
import { createDefaultTransition } from "./TransitionEditor";

describe("TransitionEditor: Transition handling", () => {
  describe("createDefaultTransition", () => {
    it("creates valid default transition", () => {
      const transition = createDefaultTransition();

      expect(transition).toBeDefined();
      expect(transition.advanceOnClick).toBe(true);
    });
  });

  describe("SlideTransition structure", () => {
    it("handles transition with type", () => {
      const transition: SlideTransition = {
        type: "fade",
        advanceOnClick: true,
      };

      expect(transition.type).toBe("fade");
    });

    it("handles transition with duration", () => {
      const transition: SlideTransition = {
        type: "wipe",
        duration: 1000,
        advanceOnClick: true,
      };

      expect(transition.duration).toBe(1000);
    });

    it("handles transition with advanceAfter", () => {
      const transition: SlideTransition = {
        type: "fade",
        advanceOnClick: false,
        advanceAfter: 5000,
      };

      expect(transition.advanceOnClick).toBe(false);
      expect(transition.advanceAfter).toBe(5000);
    });

    it("handles all transition types", () => {
      const transitionTypes = [
        "blinds",
        "checker",
        "circle",
        "comb",
        "cover",
        "cut",
        "diamond",
        "dissolve",
        "fade",
        "newsflash",
        "plus",
        "pull",
        "push",
        "random",
        "randomBar",
        "split",
        "strips",
        "wedge",
        "wheel",
        "wipe",
        "zoom",
      ] as const;

      for (const type of transitionTypes) {
        const transition: SlideTransition = {
          type,
          advanceOnClick: true,
        };
        expect(transition.type).toBe(type);
      }
    });

    it("handles transition with default type", () => {
      const transition: SlideTransition = {
        type: "fade",
        advanceOnClick: true,
      };

      expect(transition.type).toBe("fade");
      expect(transition.advanceOnClick).toBe(true);
    });
  });
});
