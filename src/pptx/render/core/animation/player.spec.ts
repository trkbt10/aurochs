/**
 * @file Animation player tests
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

import { createPlayer, extractShapeIds } from "./player";
import type { Timing } from "../../../domain/animation";

describe("extractShapeIds", () => {
  it("extracts shape IDs from timing tree", () => {
    const timing: Timing = {
      rootTimeNode: {
        type: "parallel",
        id: 1,
        autoReverse: false,
        children: [
          {
            type: "set",
            id: 2,
            autoReverse: false,
            target: { type: "shape", shapeId: "11", targetBackground: false },
            attribute: "style.visibility",
            value: "visible",
          },
          {
            type: "animateEffect",
            id: 3,
            autoReverse: false,
            target: { type: "shape", shapeId: "12", targetBackground: false },
            transition: "in",
            filter: "fade(in)",
          },
        ],
      },
    };

    const ids = extractShapeIds(timing);
    expect(ids).toContain("11");
    expect(ids).toContain("12");
    expect(ids.length).toBe(2);
  });

  it("extracts nested shape IDs", () => {
    const timing: Timing = {
      rootTimeNode: {
        type: "parallel",
        id: 1,
        autoReverse: false,
        children: [
          {
            type: "sequence",
            id: 2,
            autoReverse: false,
            children: [
              {
                type: "parallel",
                id: 3,
                autoReverse: false,
                children: [
                  {
                    type: "set",
                    id: 4,
                    autoReverse: false,
                    target: { type: "shape", shapeId: "5", targetBackground: false },
                    attribute: "style.visibility",
                    value: "visible",
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const ids = extractShapeIds(timing);
    expect(ids).toContain("5");
  });

  it("deduplicates shape IDs", () => {
    const timing: Timing = {
      rootTimeNode: {
        type: "parallel",
        id: 1,
        autoReverse: false,
        children: [
          {
            type: "set",
            id: 2,
            autoReverse: false,
            target: { type: "shape", shapeId: "11", targetBackground: false },
            attribute: "style.visibility",
            value: "visible",
          },
          {
            type: "animateEffect",
            id: 3,
            autoReverse: false,
            target: { type: "shape", shapeId: "11", targetBackground: false },
            transition: "in",
            filter: "fade(in)",
          },
        ],
      },
    };

    const ids = extractShapeIds(timing);
    expect(ids.length).toBe(1);
    expect(ids[0]).toBe("11");
  });

  it("returns empty array for null timing", () => {
    const ids = extractShapeIds(null as unknown as Timing);
    expect(ids).toEqual([]);
  });

  it("returns empty array for timing without rootTimeNode", () => {
    const ids = extractShapeIds({} as Timing);
    expect(ids).toEqual([]);
  });
});

describe("createPlayer", () => {
  function createMockElement(): HTMLElement {
    return {
      style: {
        transition: "",
        opacity: "",
        visibility: "",
        transform: "",
        clipPath: "",
        filter: "",
        transformOrigin: "",
        maskImage: "",
        maskSize: "",
        maskPosition: "",
        maskRepeat: "",
      },
    } as unknown as HTMLElement;
  }

  it("creates player instance", () => {
    const player = createPlayer({
      findElement: () => null,
    });

    expect(player.getState()).toBe("idle");
    expect(typeof player.play).toBe("function");
    expect(typeof player.stop).toBe("function");
    expect(typeof player.resetAll).toBe("function");
    expect(typeof player.showAll).toBe("function");
    expect(typeof player.hideAll).toBe("function");
  });

  it("shows all shapes", () => {
    const elements: Record<string, HTMLElement> = {
      "1": createMockElement(),
      "2": createMockElement(),
    };

    const player = createPlayer({
      findElement: (id) => elements[id] || null,
    });

    player.showAll(["1", "2"]);

    expect(elements["1"].style.opacity).toBe("1");
    expect(elements["1"].style.visibility).toBe("visible");
    expect(elements["2"].style.opacity).toBe("1");
    expect(elements["2"].style.visibility).toBe("visible");
  });

  it("hides all shapes", () => {
    const elements: Record<string, HTMLElement> = {
      "1": createMockElement(),
      "2": createMockElement(),
    };

    const player = createPlayer({
      findElement: (id) => elements[id] || null,
    });

    player.hideAll(["1", "2"]);

    expect(elements["1"].style.opacity).toBe("0");
    expect(elements["1"].style.visibility).toBe("hidden");
    expect(elements["2"].style.opacity).toBe("0");
    expect(elements["2"].style.visibility).toBe("hidden");
  });

  it("resets all shapes", () => {
    const elements: Record<string, HTMLElement> = {
      "1": createMockElement(),
    };
    elements["1"].style.transform = "translateX(100px)";
    elements["1"].style.opacity = "0.5";

    const player = createPlayer({
      findElement: (id) => elements[id] || null,
    });

    player.resetAll(["1"]);

    expect(elements["1"].style.transition).toBe("none");
    expect(elements["1"].style.transform).toBe("");
    expect(elements["1"].style.opacity).toBe("");
  });

  it("plays simple set animation", async () => {
    const el = createMockElement();
    const logs: string[] = [];

    const player = createPlayer({
      findElement: () => el,
      onLog: (msg) => logs.push(msg),
    });

    const timing: Timing = {
      rootTimeNode: {
        type: "set",
        id: 1,
        autoReverse: false,
        duration: 1,
        target: { type: "shape", shapeId: "11", targetBackground: false },
        attribute: "style.visibility",
        value: "visible",
      },
    };

    await player.play(timing);

    expect(el.style.visibility).toBe("visible");
    expect(el.style.opacity).toBe("1");
    expect(logs.some((l) => l.includes("Processing"))).toBe(true);
  });

  it("calls onStart and onComplete callbacks", async () => {
    let started = false;
    let completed = false;

    const player = createPlayer({
      findElement: () => null,
      onStart: () => {
        started = true;
      },
      onComplete: () => {
        completed = true;
      },
    });

    const timing: Timing = {
      rootTimeNode: {
        type: "parallel",
        id: 1,
        autoReverse: false,
        children: [],
      },
    };

    await player.play(timing);

    expect(started).toBe(true);
    expect(completed).toBe(true);
  });

  it("handles missing timing data", async () => {
    const logs: string[] = [];

    const player = createPlayer({
      findElement: () => null,
      onLog: (msg) => logs.push(msg),
    });

    await player.play(null as unknown as Timing);

    expect(logs.some((l) => l.includes("No timing data"))).toBe(true);
  });

  it("processes parallel children concurrently", async () => {
    const elements: Record<string, HTMLElement> = {
      "1": createMockElement(),
      "2": createMockElement(),
    };
    const processOrder: string[] = [];

    const player = createPlayer({
      findElement: (id) => {
        processOrder.push(id);
        return elements[id] || null;
      },
    });

    const timing: Timing = {
      rootTimeNode: {
        type: "parallel",
        id: 1,
        autoReverse: false,
        children: [
          {
            type: "set",
            id: 2,
            autoReverse: false,
            duration: 1,
            target: { type: "shape", shapeId: "1", targetBackground: false },
            attribute: "style.visibility",
            value: "visible",
          },
          {
            type: "set",
            id: 3,
            autoReverse: false,
            duration: 1,
            target: { type: "shape", shapeId: "2", targetBackground: false },
            attribute: "style.visibility",
            value: "visible",
          },
        ],
      },
    };

    await player.play(timing);

    // Both should be processed
    expect(elements["1"].style.visibility).toBe("visible");
    expect(elements["2"].style.visibility).toBe("visible");
  });
});
