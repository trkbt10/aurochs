/**
 * @file ContextMenuSubmenu interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { ContextMenuSubmenu } from "./ContextMenuSubmenu";
import type { MenuSubmenu } from "./types";

describe("ContextMenuSubmenu", () => {
  it("opens submenu on hover and triggers action", () => {
    const calls: { id?: string } = {};
    const item: MenuSubmenu = {
      type: "submenu",
      id: "arrange",
      label: "Arrange",
      children: [
        { id: "front", label: "Bring to Front" },
      ],
    };

    const handleAction = (id: string) => {
      calls.id = id;
    };

    const { getByText, queryByText } = render(
      <ContextMenuSubmenu item={item} onAction={handleAction} />
    );

    const label = getByText("Arrange");
    fireEvent.mouseEnter(label);
    expect(getByText("Bring to Front")).toBeTruthy();

    fireEvent.click(getByText("Bring to Front"));
    expect(calls.id).toBe("front");

    const submenuItem = queryByText("Bring to Front");
    if (!submenuItem) {
      throw new Error("Submenu item missing");
    }
    const submenu = submenuItem.parentElement;
    if (!submenu) {
      throw new Error("Submenu container missing");
    }
    fireEvent.mouseLeave(submenu);
    expect(queryByText("Bring to Front")).toBeNull();
  });
});
