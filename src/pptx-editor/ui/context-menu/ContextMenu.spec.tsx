/**
 * @file ContextMenu interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent, waitFor } from "@testing-library/react";
import type { MenuEntry } from "./types";
import { ContextMenu } from "./ContextMenu";

const menuRect = {
  width: 200,
  height: 200,
  left: 0,
  top: 0,
  right: 200,
  bottom: 200,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

function stubBoundingClientRect(): void {
  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    value: () => menuRect,
    configurable: true,
  });
}

function findBackdrop(): HTMLDivElement | null {
  const nodes = Array.from(document.body.querySelectorAll("div"));
  const match = nodes.find((node) => {
    if (node.style.position !== "fixed") {
      return false;
    }
    if (node.style.inset === "0px" || node.style.inset === "0") {
      return true;
    }
    return node.getAttribute("style")?.includes("inset: 0") ?? false;
  });
  return match ?? null;
}

describe("ContextMenu", () => {
  it("calls onAction and onClose when item clicked", () => {
    const calls: { action?: string; closeCount: number } = { closeCount: 0 };
    const items: readonly MenuEntry[] = [
      { id: "copy", label: "Copy" },
    ];

    const handleAction = (id: string) => {
      calls.action = id;
    };
    const handleClose = () => {
      calls.closeCount += 1;
    };

    const { getByText } = render(
      <ContextMenu x={10} y={10} items={items} onAction={handleAction} onClose={handleClose} />
    );

    fireEvent.click(getByText("Copy"));
    expect(calls.action).toBe("copy");
    expect(calls.closeCount).toBe(1);
  });

  it("closes on backdrop click", () => {
    const calls: { closeCount: number } = { closeCount: 0 };
    const items: readonly MenuEntry[] = [
      { id: "paste", label: "Paste" },
    ];

    const handleClose = () => {
      calls.closeCount += 1;
    };

    render(
      <ContextMenu x={10} y={10} items={items} onAction={() => {}} onClose={handleClose} />
    );

    const backdrop = findBackdrop();
    if (!backdrop) {
      throw new Error("Backdrop not found");
    }
    fireEvent.click(backdrop);
    expect(calls.closeCount).toBe(1);
  });

  it("closes on Escape key", () => {
    const calls: { closeCount: number } = { closeCount: 0 };
    const items: readonly MenuEntry[] = [
      { id: "delete", label: "Delete" },
    ];

    const handleClose = () => {
      calls.closeCount += 1;
    };

    render(
      <ContextMenu x={10} y={10} items={items} onAction={() => {}} onClose={handleClose} />
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(calls.closeCount).toBe(1);
  });

  it("adjusts position to stay within viewport", async () => {
    stubBoundingClientRect();
    Object.defineProperty(window, "innerWidth", { value: 300, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 300, configurable: true });

    const items: readonly MenuEntry[] = [
      { id: "copy", label: "Copy" },
    ];

    const { getByText } = render(
      <ContextMenu x={290} y={290} items={items} onAction={() => {}} onClose={() => {}} />
    );

    const item = getByText("Copy");
    const menu = item.parentElement?.parentElement;
    if (!menu) {
      throw new Error("Menu container not found");
    }

    await waitFor(() => {
      expect(menu.style.left).toBe("90px");
      expect(menu.style.top).toBe("90px");
    });
  });
});
