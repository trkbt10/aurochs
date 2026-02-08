/**
 * @file ContextMenuItem interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { ContextMenuItem } from "./ContextMenuItem";
import type { MenuItem } from "./types";

describe("ContextMenuItem", () => {
  it("calls onClick when enabled", () => {
    const calls: { id?: string } = {};
    const item: MenuItem = { id: "copy", label: "Copy" };
    const handleClick = (id: string) => {
      calls.id = id;
    };

    const { getByText } = render(
      <ContextMenuItem item={item} onClick={handleClick} />
    );

    fireEvent.click(getByText("Copy"));
    expect(calls.id).toBe("copy");
  });

  it("does not call onClick when disabled", () => {
    const calls: { count: number } = { count: 0 };
    const item: MenuItem = { id: "copy", label: "Copy", disabled: true };
    const handleClick = () => {
      calls.count += 1;
    };

    const { getByText } = render(
      <ContextMenuItem item={item} onClick={handleClick} />
    );

    fireEvent.click(getByText("Copy"));
    expect(calls.count).toBe(0);
  });
});
