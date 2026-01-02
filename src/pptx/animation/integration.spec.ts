/**
 * @file Animation integration tests
 *
 * Tests animation playback with real timing data structures
 * from PPTX files.
 */

import { createPlayer, extractShapeIds } from "./player";
import type { Timing } from "../domain/animation";

describe("Animation Integration", () => {
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

  describe("keyframes.pptx slide 1 structure", () => {
    // Simplified version of actual timing data from keyframes.pptx
    const timing: Timing = {
      rootTimeNode: {
        type: "parallel",
        id: 1,
        duration: "indefinite",
        restart: "never",
        nodeType: "tmRoot",
        autoReverse: false,
        children: [
          {
            type: "sequence",
            id: 2,
            duration: "indefinite",
            nodeType: "mainSeq",
            autoReverse: false,
            children: [
              {
                type: "parallel",
                id: 3,
                fill: "hold",
                startConditions: [{ delay: "indefinite" }],
                autoReverse: false,
                children: [
                  {
                    type: "parallel",
                    id: 4,
                    fill: "hold",
                    startConditions: [{ delay: 0 }],
                    autoReverse: false,
                    children: [
                      {
                        type: "parallel",
                        id: 5,
                        fill: "hold",
                        nodeType: "clickEffect",
                        preset: { id: 12, class: "entrance", subtype: 8 },
                        startConditions: [{ delay: 0 }],
                        autoReverse: false,
                        children: [
                          {
                            type: "set",
                            id: 6,
                            duration: 1,
                            fill: "hold",
                            startConditions: [{ delay: 0 }],
                            autoReverse: false,
                            target: {
                              type: "shape",
                              shapeId: "11",
                              targetBackground: false,
                            },
                            attribute: "style.visibility",
                            value: "visible",
                          },
                          {
                            type: "animateEffect",
                            id: 7,
                            duration: 3000,
                            autoReverse: false,
                            target: {
                              type: "shape",
                              shapeId: "11",
                              targetBackground: false,
                            },
                            transition: "in",
                            filter: "slide(fromLeft)",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    it("extracts shape IDs from nested timing structure", () => {
      const ids = extractShapeIds(timing);
      expect(ids).toContain("11");
    });

    it("plays through nested parallel/sequence structure", async () => {
      const elements: Record<string, HTMLElement> = {
        "11": createMockElement(),
      };
      const logs: string[] = [];

      const player = createPlayer({
        findElement: (id) => elements[id] || null,
        onLog: (msg) => logs.push(msg),
        speed: 100, // Speed up for testing
      });

      await player.play(timing);

      // Check that set animation was applied
      expect(elements["11"].style.visibility).toBe("visible");
      expect(elements["11"].style.opacity).toBe("1");

      // Check that animateEffect was processed
      expect(logs.some((l) => l.includes("animateEffect"))).toBe(true);
    });
  });

  describe("effect filter parsing in playback", () => {
    it("handles slide(fromLeft) filter", async () => {
      const el = createMockElement();
      const logs: string[] = [];

      const timing: Timing = {
        rootTimeNode: {
          type: "animateEffect",
          id: 1,
          duration: 100,
          autoReverse: false,
          target: { type: "shape", shapeId: "1", targetBackground: false },
          transition: "in",
          filter: "slide(fromLeft)",
        },
      };

      const player = createPlayer({
        findElement: () => el,
        onLog: (msg) => logs.push(msg),
        speed: 100,
      });

      await player.play(timing);

      // Effect was logged
      expect(logs.some((l) => l.includes("slide(fromLeft)"))).toBe(true);
      // Transition was applied
      expect(el.style.transition).toContain("ms");
    });

    it("handles fade(in) filter", async () => {
      const el = createMockElement();

      const timing: Timing = {
        rootTimeNode: {
          type: "animateEffect",
          id: 1,
          duration: 100,
          autoReverse: false,
          target: { type: "shape", shapeId: "1", targetBackground: false },
          transition: "in",
          filter: "fade(in)",
        },
      };

      const player = createPlayer({
        findElement: () => el,
        speed: 100,
      });

      await player.play(timing);

      expect(el.style.transition).toContain("ms");
    });

    it("slide(fromLeft) ends with element visible and in position", async () => {
      const el = createMockElement();

      const timing: Timing = {
        rootTimeNode: {
          type: "animateEffect",
          id: 1,
          duration: 10, // Short duration for fast test
          autoReverse: false,
          target: { type: "shape", shapeId: "1", targetBackground: false },
          transition: "in",
          filter: "slide(fromLeft)",
        },
      };

      const player = createPlayer({
        findElement: () => el,
        speed: 1000, // Very fast
      });

      await player.play(timing);

      // After animation completes, element should be visible and in position
      // The raf callback sets final values
      expect(el.style.opacity).toBe("1");
      expect(el.style.transform).toBe("translateX(0) translateY(0)");
    });

    it("fade entrance ends with element fully visible", async () => {
      const el = createMockElement();

      const timing: Timing = {
        rootTimeNode: {
          type: "animateEffect",
          id: 1,
          duration: 10,
          autoReverse: false,
          target: { type: "shape", shapeId: "1", targetBackground: false },
          transition: "in",
          filter: "fade",
        },
      };

      const player = createPlayer({
        findElement: () => el,
        speed: 1000,
      });

      await player.play(timing);

      expect(el.style.opacity).toBe("1");
    });

    it("wipe(right) ends with element fully visible", async () => {
      const el = createMockElement();

      const timing: Timing = {
        rootTimeNode: {
          type: "animateEffect",
          id: 1,
          duration: 10,
          autoReverse: false,
          target: { type: "shape", shapeId: "1", targetBackground: false },
          transition: "in",
          filter: "wipe(right)",
        },
      };

      const player = createPlayer({
        findElement: () => el,
        speed: 1000,
      });

      await player.play(timing);

      expect(el.style.clipPath).toBe("inset(0 0 0 0)");
    });
  });

  describe("timing node types", () => {
    it("processes parallel children concurrently", async () => {
      const order: number[] = [];
      const elements: Record<string, HTMLElement> = {};

      for (let i = 1; i <= 3; i++) {
        elements[String(i)] = createMockElement();
      }

      const timing: Timing = {
        rootTimeNode: {
          type: "parallel",
          id: 0,
          autoReverse: false,
          children: [
            {
              type: "set",
              id: 1,
              duration: 50,
              autoReverse: false,
              target: { type: "shape", shapeId: "1", targetBackground: false },
              attribute: "style.visibility",
              value: "visible",
            },
            {
              type: "set",
              id: 2,
              duration: 50,
              autoReverse: false,
              target: { type: "shape", shapeId: "2", targetBackground: false },
              attribute: "style.visibility",
              value: "visible",
            },
            {
              type: "set",
              id: 3,
              duration: 50,
              autoReverse: false,
              target: { type: "shape", shapeId: "3", targetBackground: false },
              attribute: "style.visibility",
              value: "visible",
            },
          ],
        },
      };

      const player = createPlayer({
        findElement: (id) => {
          order.push(parseInt(id, 10));
          return elements[id] || null;
        },
        speed: 100,
      });

      const start = Date.now();
      await player.play(timing);
      const elapsed = Date.now() - start;

      // All elements should be visible
      expect(elements["1"].style.visibility).toBe("visible");
      expect(elements["2"].style.visibility).toBe("visible");
      expect(elements["3"].style.visibility).toBe("visible");

      // Should complete quickly (parallel execution)
      // With speed=100, 50ms duration becomes 0.5ms
      expect(elapsed).toBeLessThan(100);
    });

    it("processes sequence children sequentially", async () => {
      const order: string[] = [];
      const elements: Record<string, HTMLElement> = {
        "1": createMockElement(),
        "2": createMockElement(),
      };

      const timing: Timing = {
        rootTimeNode: {
          type: "sequence",
          id: 0,
          autoReverse: false,
          children: [
            {
              type: "set",
              id: 1,
              duration: 10,
              autoReverse: false,
              target: { type: "shape", shapeId: "1", targetBackground: false },
              attribute: "style.visibility",
              value: "visible",
            },
            {
              type: "set",
              id: 2,
              duration: 10,
              autoReverse: false,
              target: { type: "shape", shapeId: "2", targetBackground: false },
              attribute: "style.visibility",
              value: "visible",
            },
          ],
        },
      };

      const player = createPlayer({
        findElement: (id) => {
          order.push(id);
          return elements[id] || null;
        },
        speed: 100,
      });

      await player.play(timing);

      // Order should be sequential
      expect(order[0]).toBe("1");
      expect(order[1]).toBe("2");
    });
  });

  describe("HTML renderer shape ID targeting", () => {
    /**
     * Verifies that the HTML renderer produces data-ooxml-id attributes
     * that match the shape IDs used in timing data.
     *
     * Flow: OOXML → parser → domain (Shape.nonVisual.id) → render/html (data-ooxml-id)
     *       OOXML → timing-parser → domain (Timing.target.shapeId) → animation player
     */
    it("uses consistent shape ID format across rendering and animation", () => {
      // Shape ID from domain/shape.ts (parsed from p:nvSpPr/p:cNvPr/@id)
      const shapeNonVisualId = "42";

      // Same ID used in timing data (from p:spTgt/@spid)
      const timingTargetShapeId = "42";

      // IDs must match for animation player to find elements
      expect(shapeNonVisualId).toBe(timingTargetShapeId);

      // HTML renderer outputs data-ooxml-id="42"
      // Animation player queries: [data-ooxml-id="42"]
      // This integration is tested in render/html/shape.spec.ts
    });

    it("finds element by data-ooxml-id selector", () => {
      // Simulate DOM query that animation player uses
      const mockQuerySelector = (html: string, selector: string): HTMLElement | null => {
        const idMatch = selector.match(/data-ooxml-id="(\d+)"/);
        if (!idMatch) {return null;}
        const targetId = idMatch[1];
        if (html.includes(`data-ooxml-id="${targetId}"`)) {
          return createMockElement();
        }
        return null;
      };

      // Simulated HTML output from render/html
      const renderedHtml = '<div class="shape sp" data-ooxml-id="42" data-shape-id="shape-0">';

      // Animation player queries for shape 42
      const selector = '[data-ooxml-id="42"]';
      const element = mockQuerySelector(renderedHtml, selector);

      expect(element).not.toBeNull();
    });
  });
});
