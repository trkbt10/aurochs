/**
 * @file CursorCaret unit tests
 */

// @vitest-environment jsdom

import { render, act } from "@testing-library/react";
import { CursorCaret } from "./CursorCaret";

const BLINK_INTERVAL_MS = 530;

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("CursorCaret", () => {
  it("renders a caret line at the specified position/height", () => {
    const { container } = render(
      <svg>
        <CursorCaret x={10} y={20} height={30} isBlinking={false} />
      </svg>,
    );

    const line = container.querySelector("line");
    expect(line).not.toBeNull();
    expect(line?.getAttribute("x1")).toBe("10");
    expect(line?.getAttribute("y1")).toBe("20");
    expect(line?.getAttribute("x2")).toBe("10");
    expect(line?.getAttribute("y2")).toBe("50");
    expect(line?.getAttribute("stroke")).toBe("var(--text-inverse)");
  });

  it("applies a custom color", () => {
    const { container } = render(
      <svg>
        <CursorCaret x={0} y={0} height={10} isBlinking={false} color="#f00" />
      </svg>,
    );

    const line = container.querySelector("line");
    expect(line?.getAttribute("stroke")).toBe("#f00");
  });

  it("blinks when isBlinking=true", async () => {
    const { container } = render(
      <svg>
        <CursorCaret x={0} y={0} height={10} isBlinking={true} />
      </svg>,
    );

    expect(container.querySelector("line")).not.toBeNull();

    await act(async () => {
      await waitMs(BLINK_INTERVAL_MS + 30);
    });
    expect(container.querySelector("line")).toBeNull();

    await act(async () => {
      await waitMs(BLINK_INTERVAL_MS + 30);
    });
    expect(container.querySelector("line")).not.toBeNull();
  });

  it("stays visible when isBlinking=false", async () => {
    const { container } = render(
      <svg>
        <CursorCaret x={0} y={0} height={10} isBlinking={false} />
      </svg>,
    );

    expect(container.querySelector("line")).not.toBeNull();

    await act(async () => {
      await waitMs(BLINK_INTERVAL_MS + 30);
    });
    expect(container.querySelector("line")).not.toBeNull();
  });
});

