/**
 * @file TransitionEditor component tests
 *
 * Tests the TransitionEditor handles slide transitions correctly.
 */

// @vitest-environment jsdom

import type { SlideTransition } from "@oxen/pptx/domain/transition";
import { render, fireEvent } from "@testing-library/react";
import { TransitionEditor, createDefaultTransition } from "./TransitionEditor";

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

describe("TransitionEditor interactions", () => {
  function ensureScrollIntoView(): void {
    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        value: () => undefined,
        writable: true,
      });
    }
  }

  it("updates transition type from the selector", () => {
    ensureScrollIntoView();
    const state: { calls: number; lastType: string | null } = { calls: 0, lastType: null };
    const handleChange = (value: SlideTransition | undefined) => {
      state.calls += 1;
      state.lastType = value?.type ?? null;
    };

    const { getByRole, getByText } = render(
      <TransitionEditor value={undefined} onChange={handleChange} />
    );

    fireEvent.click(getByRole("button", { name: /none/i }));
    getByText("Fade");
    const fadeOption = Array.from(document.querySelectorAll("[data-option-index]"))
      .find((node) => node.textContent?.includes("Fade"));
    if (!fadeOption) {
      throw new Error("Fade option not found");
    }
    fireEvent.click(fadeOption);

    expect(state.calls).toBe(1);
    expect(state.lastType).toBe("fade");
  });

  it("clears transition when selecting None", () => {
    ensureScrollIntoView();
    const state: { lastValue: SlideTransition | undefined } = { lastValue: undefined };
    const handleChange = (value: SlideTransition | undefined) => {
      state.lastValue = value;
    };

    const { getByRole, getByText } = render(
      <TransitionEditor
        value={{ type: "fade", advanceOnClick: true }}
        onChange={handleChange}
      />
    );

    fireEvent.click(getByRole("button", { name: /fade/i }));
    fireEvent.click(getByText("None"));

    expect(state.lastValue).toBeUndefined();
  });
});
