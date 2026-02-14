/**
 * @file GroupedList interaction tests
 *
 * Tests for basic operations and edge cases:
 * - Item selection
 * - Inline rename editing
 * - Context menu operations (create, rename, delete)
 * - Drag-drop reordering within groups
 */

// @vitest-environment jsdom

import { render, fireEvent, waitFor } from "@testing-library/react";
import type { GroupedListItemData, GroupedListGroupData } from "./index";
import { GroupedList } from "./GroupedList";

// =============================================================================
// Test Fixtures
// =============================================================================

type TestMeta = { value: number };

const mockGroups: readonly GroupedListGroupData[] = [
  { id: "group1", label: "Group 1", order: 0, canCreate: true },
  { id: "group2", label: "Group 2", order: 1, canCreate: true },
  { id: "group3", label: "Group 3", order: 2, canCreate: false },
];

const mockItems: readonly GroupedListItemData<TestMeta>[] = [
  { id: "item1", label: "Item 1", groupId: "group1", canRename: true, canDelete: true, meta: { value: 1 } },
  { id: "item2", label: "Item 2", groupId: "group1", canRename: true, canDelete: true, meta: { value: 2 } },
  { id: "item3", label: "Item 3", groupId: "group2", canRename: true, canDelete: true, meta: { value: 3 } },
  { id: "item4", label: "Item 4", groupId: "group2", canRename: false, canDelete: false, meta: { value: 4 } },
];

// =============================================================================
// Helper functions
// =============================================================================

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

function createDragEvent(type: string, dataTransfer: DataTransfer): React.DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as unknown as React.DragEvent;
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  return event;
}

// =============================================================================
// Tests
// =============================================================================

describe("GroupedList", () => {
  describe("rendering", () => {
    it("renders groups and items", () => {
      const { getByText } = render(
        <GroupedList items={mockItems} groups={mockGroups} />
      );

      expect(getByText("Group 1")).toBeTruthy();
      expect(getByText("Group 2")).toBeTruthy();
      expect(getByText("Item 1")).toBeTruthy();
      expect(getByText("Item 2")).toBeTruthy();
      expect(getByText("Item 3")).toBeTruthy();
      expect(getByText("Item 4")).toBeTruthy();
    });

    it("renders empty message when no items", () => {
      const { getByText } = render(
        <GroupedList items={[]} groups={mockGroups} emptyMessage="No items available" />
      );

      expect(getByText("No items available")).toBeTruthy();
    });

    it("does not render empty groups", () => {
      const { queryByText } = render(
        <GroupedList items={mockItems} groups={mockGroups} />
      );

      // Group 3 has no items, should not be rendered
      expect(queryByText("Group 3")).toBeNull();
    });
  });

  describe("item selection", () => {
    it("calls onItemClick when item is clicked", () => {
      const calls: string[] = [];
      const { getByText } = render(
        <GroupedList
          items={mockItems}
          groups={mockGroups}
          onItemClick={(id) => calls.push(id)}
        />
      );

      fireEvent.click(getByText("Item 1"));
      expect(calls).toEqual(["item1"]);

      fireEvent.click(getByText("Item 3"));
      expect(calls).toEqual(["item1", "item3"]);
    });

    it("highlights active item", () => {
      const { getByText, rerender } = render(
        <GroupedList items={mockItems} groups={mockGroups} activeItemId="item1" />
      );

      const item1 = getByText("Item 1").parentElement;
      expect(item1?.getAttribute("aria-selected")).toBe("true");

      rerender(
        <GroupedList items={mockItems} groups={mockGroups} activeItemId="item2" />
      );

      const item2 = getByText("Item 2").parentElement;
      expect(item2?.getAttribute("aria-selected")).toBe("true");
    });
  });

  describe("inline rename editing", () => {
    it("enters edit mode on double-click in editable mode", async () => {
      const { getByText, getByDisplayValue } = render(
        <GroupedList items={mockItems} groups={mockGroups} mode="editable" />
      );

      fireEvent.doubleClick(getByText("Item 1"));

      await waitFor(() => {
        expect(getByDisplayValue("Item 1")).toBeTruthy();
      });
    });

    it("does not enter edit mode in readonly mode", async () => {
      const { getByText, queryByDisplayValue } = render(
        <GroupedList items={mockItems} groups={mockGroups} mode="readonly" />
      );

      fireEvent.doubleClick(getByText("Item 1"));

      // Should not have input field
      expect(queryByDisplayValue("Item 1")).toBeNull();
    });

    it("does not enter edit mode for canRename=false items", async () => {
      const { getByText, queryByDisplayValue } = render(
        <GroupedList items={mockItems} groups={mockGroups} mode="editable" />
      );

      fireEvent.doubleClick(getByText("Item 4")); // canRename: false

      expect(queryByDisplayValue("Item 4")).toBeNull();
    });

    it("calls onItemRename on Enter key", async () => {
      const calls: { id: string; newLabel: string }[] = [];
      const { getByText, getByDisplayValue } = render(
        <GroupedList
          items={mockItems}
          groups={mockGroups}
          mode="editable"
          onItemRename={(id, newLabel) => calls.push({ id, newLabel })}
        />
      );

      fireEvent.doubleClick(getByText("Item 1"));

      const input = await waitFor(() => getByDisplayValue("Item 1"));
      fireEvent.change(input, { target: { value: "Renamed Item" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(calls).toEqual([{ id: "item1", newLabel: "Renamed Item" }]);
    });

    it("cancels edit on Escape key", async () => {
      const calls: { id: string; newLabel: string }[] = [];
      const { getByText, getByDisplayValue, queryByDisplayValue } = render(
        <GroupedList
          items={mockItems}
          groups={mockGroups}
          mode="editable"
          onItemRename={(id, newLabel) => calls.push({ id, newLabel })}
        />
      );

      fireEvent.doubleClick(getByText("Item 1"));

      const input = await waitFor(() => getByDisplayValue("Item 1"));
      fireEvent.change(input, { target: { value: "Changed" } });
      fireEvent.keyDown(input, { key: "Escape" });

      // Input should be gone
      expect(queryByDisplayValue("Changed")).toBeNull();
      // onItemRename should not have been called
      expect(calls).toEqual([]);
    });

    it("does not rename if value unchanged", async () => {
      const calls: { id: string; newLabel: string }[] = [];
      const { getByText, getByDisplayValue } = render(
        <GroupedList
          items={mockItems}
          groups={mockGroups}
          mode="editable"
          onItemRename={(id, newLabel) => calls.push({ id, newLabel })}
        />
      );

      fireEvent.doubleClick(getByText("Item 1"));

      const input = await waitFor(() => getByDisplayValue("Item 1"));
      // Press Enter without changing value
      fireEvent.keyDown(input, { key: "Enter" });

      expect(calls).toEqual([]);
    });
  });

  describe("context menu", () => {
    it("shows context menu on right-click", async () => {
      const { getByText } = render(
        <GroupedList items={mockItems} groups={mockGroups} mode="editable" />
      );

      fireEvent.contextMenu(getByText("Item 1"));

      await waitFor(() => {
        expect(getByText("Rename")).toBeTruthy();
        expect(getByText("Delete")).toBeTruthy();
      });
    });

    it("shows New submenu when right-clicking on group", async () => {
      const { getByText } = render(
        <GroupedList items={mockItems} groups={mockGroups} mode="editable" />
      );

      fireEvent.contextMenu(getByText("Group 1"));

      await waitFor(() => {
        expect(getByText("New")).toBeTruthy();
      });
    });

    it("calls onItemDelete from context menu", async () => {
      const calls: string[] = [];
      const { getByText } = render(
        <GroupedList
          items={mockItems}
          groups={mockGroups}
          mode="editable"
          onItemDelete={(id) => calls.push(id)}
        />
      );

      fireEvent.contextMenu(getByText("Item 1"));

      await waitFor(() => {
        expect(getByText("Delete")).toBeTruthy();
      });

      fireEvent.click(getByText("Delete"));
      expect(calls).toEqual(["item1"]);
    });

    it("starts rename from context menu", async () => {
      const { getByText, getByDisplayValue } = render(
        <GroupedList items={mockItems} groups={mockGroups} mode="editable" />
      );

      fireEvent.contextMenu(getByText("Item 1"));

      await waitFor(() => {
        expect(getByText("Rename")).toBeTruthy();
      });

      fireEvent.click(getByText("Rename"));

      await waitFor(() => {
        expect(getByDisplayValue("Item 1")).toBeTruthy();
      });
    });

    it("closes context menu on backdrop click", async () => {
      const { getByText, queryByText } = render(
        <GroupedList items={mockItems} groups={mockGroups} mode="editable" />
      );

      fireEvent.contextMenu(getByText("Item 1"));

      await waitFor(() => {
        expect(getByText("Rename")).toBeTruthy();
      });

      const backdrop = findBackdrop();
      if (!backdrop) {
        throw new Error("Backdrop not found");
      }
      fireEvent.click(backdrop);

      await waitFor(() => {
        expect(queryByText("Rename")).toBeNull();
      });
    });
  });

  describe("group collapse", () => {
    it("toggles group collapse on header click", async () => {
      const { getByText, container } = render(
        <GroupedList items={mockItems} groups={mockGroups} />
      );

      // Initially visible - content div has display: block
      const group1 = container.querySelector('[data-group-id="group1"]');
      const contentDiv = group1?.querySelector('div:nth-child(2)') as HTMLElement;
      expect(contentDiv?.style.display).toBe("block");

      // Click header to collapse
      fireEvent.click(getByText("Group 1"));

      await waitFor(() => {
        expect(contentDiv?.style.display).toBe("none");
      });

      // Click again to expand
      fireEvent.click(getByText("Group 1"));

      await waitFor(() => {
        expect(contentDiv?.style.display).toBe("block");
      });
    });

    it("calls onGroupCollapseChange", () => {
      const calls: { groupId: string; collapsed: boolean }[] = [];
      const { getByText } = render(
        <GroupedList
          items={mockItems}
          groups={mockGroups}
          onGroupCollapseChange={(groupId, collapsed) => calls.push({ groupId, collapsed })}
        />
      );

      fireEvent.click(getByText("Group 1"));
      expect(calls).toEqual([{ groupId: "group1", collapsed: true }]);

      fireEvent.click(getByText("Group 1"));
      expect(calls).toEqual([
        { groupId: "group1", collapsed: true },
        { groupId: "group1", collapsed: false },
      ]);
    });

    it("respects initialCollapsedGroups", () => {
      const { container, getByText } = render(
        <GroupedList
          items={mockItems}
          groups={mockGroups}
          initialCollapsedGroups={["group1"]}
        />
      );

      // Group 1 content should be hidden (display: none)
      const group1 = container.querySelector('[data-group-id="group1"]');
      const contentDiv1 = group1?.querySelector('div:nth-child(2)') as HTMLElement;
      expect(contentDiv1?.style.display).toBe("none");

      // Group 2 content should be visible (display: block)
      const group2 = container.querySelector('[data-group-id="group2"]');
      const contentDiv2 = group2?.querySelector('div:nth-child(2)') as HTMLElement;
      expect(contentDiv2?.style.display).toBe("block");
    });
  });

  describe("drag and drop", () => {
    it("starts drag on item in editable mode", () => {
      const { getByText } = render(
        <GroupedList items={mockItems} groups={mockGroups} mode="editable" />
      );

      const item = getByText("Item 1").parentElement;
      expect(item?.getAttribute("draggable")).toBe("true");
    });

    it("does not start drag in readonly mode", () => {
      const { getByText } = render(
        <GroupedList items={mockItems} groups={mockGroups} mode="readonly" />
      );

      const item = getByText("Item 1").parentElement;
      expect(item?.getAttribute("draggable")).toBe("false");
    });

    it("calls onItemReorder when dropping within same group", async () => {
      const calls: { itemId: string; newIndex: number; groupId: string }[] = [];
      const { getByText } = render(
        <GroupedList
          items={mockItems}
          groups={mockGroups}
          mode="editable"
          onItemReorder={(itemId, newIndex, groupId) =>
            calls.push({ itemId, newIndex, groupId })
          }
        />
      );

      const item1 = getByText("Item 1").parentElement;
      const item2 = getByText("Item 2").parentElement;

      if (!item1 || !item2) {
        throw new Error("Items not found");
      }

      // Create mock DataTransfer
      const dataTransfer = {
        effectAllowed: "none" as const,
        dropEffect: "none" as const,
        setData: () => {},
        getData: () => "item1",
      } as unknown as DataTransfer;

      // Simulate drag start
      fireEvent.dragStart(item1, { dataTransfer });

      // Simulate drag over item2
      fireEvent.dragOver(item2, { dataTransfer });

      // Simulate drop
      fireEvent.drop(item2, { dataTransfer });

      expect(calls).toEqual([{ itemId: "item1", newIndex: 1, groupId: "group1" }]);
    });

    it("does not reorder when dropping on item from different group", async () => {
      const calls: { itemId: string; newIndex: number; groupId: string }[] = [];
      const { getByText } = render(
        <GroupedList
          items={mockItems}
          groups={mockGroups}
          mode="editable"
          onItemReorder={(itemId, newIndex, groupId) =>
            calls.push({ itemId, newIndex, groupId })
          }
        />
      );

      const item1 = getByText("Item 1").parentElement; // group1
      const item3 = getByText("Item 3").parentElement; // group2

      if (!item1 || !item3) {
        throw new Error("Items not found");
      }

      const dataTransfer = {
        effectAllowed: "none" as const,
        dropEffect: "none" as const,
        setData: () => {},
        getData: () => "item1",
      } as unknown as DataTransfer;

      fireEvent.dragStart(item1, { dataTransfer });
      fireEvent.dragOver(item3, { dataTransfer });
      fireEvent.drop(item3, { dataTransfer });

      // Should not call onItemReorder for cross-group drop
      expect(calls).toEqual([]);
    });

    it("does not reorder when dropping on same position", async () => {
      const calls: { itemId: string; newIndex: number; groupId: string }[] = [];
      const { getByText } = render(
        <GroupedList
          items={mockItems}
          groups={mockGroups}
          mode="editable"
          onItemReorder={(itemId, newIndex, groupId) =>
            calls.push({ itemId, newIndex, groupId })
          }
        />
      );

      const item1 = getByText("Item 1").parentElement;

      if (!item1) {
        throw new Error("Item not found");
      }

      const dataTransfer = {
        effectAllowed: "none" as const,
        dropEffect: "none" as const,
        setData: () => {},
        getData: () => "item1",
      } as unknown as DataTransfer;

      // Drop on self
      fireEvent.dragStart(item1, { dataTransfer });
      fireEvent.dragOver(item1, { dataTransfer });
      fireEvent.drop(item1, { dataTransfer });

      // Should not call onItemReorder when dropping on same item
      expect(calls).toEqual([]);
    });

    it("resets drag state on dragEnd", async () => {
      const { getByText, container } = render(
        <GroupedList items={mockItems} groups={mockGroups} mode="editable" />
      );

      const item1 = getByText("Item 1").parentElement;

      if (!item1) {
        throw new Error("Item not found");
      }

      const dataTransfer = {
        effectAllowed: "none" as const,
        dropEffect: "none" as const,
        setData: () => {},
        getData: () => "item1",
      } as unknown as DataTransfer;

      fireEvent.dragStart(item1, { dataTransfer });

      // Should be in dragging state (opacity changed)
      expect(item1.style.opacity).toBe("0.5");

      fireEvent.dragEnd(item1);

      // Should be back to normal
      await waitFor(() => {
        expect(item1.style.opacity).not.toBe("0.5");
      });
    });
  });

  describe("create item", () => {
    it("calls onItemCreate when creating from context menu", async () => {
      const calls: string[] = [];
      const { getByText } = render(
        <GroupedList
          items={mockItems}
          groups={mockGroups}
          mode="editable"
          onItemCreate={(groupId) => calls.push(groupId)}
        />
      );

      // Right-click on group header to show context menu
      fireEvent.contextMenu(getByText("Group 1"));

      await waitFor(() => {
        expect(getByText("New")).toBeTruthy();
      });

      // Hover over "New" to show submenu
      fireEvent.mouseEnter(getByText("New"));

      await waitFor(() => {
        expect(getByText("Group 1", { selector: "[role='menuitem'] span" })).toBeTruthy();
      });

      // Click on the group in submenu
      const menuItem = getByText("Group 1", { selector: "[role='menuitem'] span" });
      fireEvent.click(menuItem);

      expect(calls).toEqual(["group1"]);
    });
  });
});
