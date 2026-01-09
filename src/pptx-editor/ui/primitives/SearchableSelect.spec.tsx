/**
 * @file SearchableSelect event isolation tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { SearchableSelect } from "./SearchableSelect";

describe("SearchableSelect", () => {
  it("does not bubble clicks from dropdown to parent handlers", () => {
    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        value: () => undefined,
        writable: true,
      });
    }

    const counters = { parentClicks: 0, changeCalls: 0 };
    const onParentClick = () => {
      counters.parentClicks += 1;
    };
    const onChange = () => {
      counters.changeCalls += 1;
    };

    const { getByRole, getByPlaceholderText } = render(
      <div onClick={onParentClick}>
        <SearchableSelect
          value="a"
          onChange={onChange}
          options={[
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta" },
          ]}
          searchPlaceholder="Search..."
        />
      </div>
    );

    fireEvent.click(getByRole("button"));
    counters.parentClicks = 0;
    counters.changeCalls = 0;
    const searchInput = getByPlaceholderText("Search...");
    fireEvent.pointerDown(searchInput);
    fireEvent.click(searchInput);

    expect(counters.parentClicks).toBe(0);
    expect(counters.changeCalls).toBe(0);
  });

  it("hides options marked hiddenWhenEmptySearch until searching", () => {
    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        value: () => undefined,
        writable: true,
      });
    }

    const { getByRole, getByPlaceholderText, queryByText, getByText } = render(
      <SearchableSelect
        value="a"
        onChange={() => undefined}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta", hiddenWhenEmptySearch: true },
        ]}
        searchPlaceholder="Search..."
      />
    );

    fireEvent.click(getByRole("button"));
    expect(queryByText("Beta")).toBeNull();

    const searchInput = getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "Be" } });
    expect(getByText("Beta")).toBeTruthy();
  });
});
