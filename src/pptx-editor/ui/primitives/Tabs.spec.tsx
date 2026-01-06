/**
 * @file Tabs interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { Tabs } from "./Tabs";

describe("Tabs", () => {
  it("switches tabs in uncontrolled mode", () => {
    const { getByRole, queryByText } = render(
      <Tabs
        defaultValue="a"
        items={[
          { id: "a", label: "Alpha", content: <div>Alpha Content</div> },
          { id: "b", label: "Beta", content: <div>Beta Content</div> },
        ]}
      />
    );

    expect(queryByText("Alpha Content")).not.toBeNull();
    fireEvent.click(getByRole("tab", { name: "Beta" }));
    expect(queryByText("Beta Content")).not.toBeNull();
  });

  it("calls onChange in controlled mode without changing content", () => {
    const state = { calls: 0, lastValue: "" };
    const handleChange = (value: "a" | "b") => {
      state.calls += 1;
      state.lastValue = value;
    };

    const { getByRole, queryByText } = render(
      <Tabs
        value="a"
        onChange={handleChange}
        items={[
          { id: "a", label: "Alpha", content: <div>Alpha Content</div> },
          { id: "b", label: "Beta", content: <div>Beta Content</div> },
        ]}
      />
    );

    fireEvent.click(getByRole("tab", { name: "Beta" }));
    expect(state.calls).toBe(1);
    expect(state.lastValue).toBe("b");
    expect(queryByText("Alpha Content")).not.toBeNull();
  });
});
