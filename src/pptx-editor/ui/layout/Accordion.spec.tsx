/**
 * @file Accordion interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { Accordion } from "./Accordion";

describe("Accordion", () => {
  it("toggles expanded state in uncontrolled mode", () => {
    const { getByRole } = render(
      <Accordion title="Layout">
        <div>Content</div>
      </Accordion>
    );

    const header = getByRole("button", { name: "Layout" });
    expect(header.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
  });

  it("reports changes in controlled mode without changing aria", () => {
    const calls: { count: number; last?: boolean } = { count: 0 };
    const handleChange = (next: boolean) => {
      calls.count += 1;
      calls.last = next;
    };

    const { getByRole } = render(
      <Accordion title="Controlled" expanded onExpandedChange={handleChange}>
        <div>Content</div>
      </Accordion>
    );

    const header = getByRole("button", { name: "Controlled" });
    expect(header.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(header);
    expect(calls.count).toBe(1);
    expect(calls.last).toBe(false);
    expect(header.getAttribute("aria-expanded")).toBe("true");
  });

  it("ignores clicks when disabled", () => {
    const calls: { count: number } = { count: 0 };
    const handleChange = () => {
      calls.count += 1;
    };

    const { getByRole } = render(
      <Accordion title="Disabled" onExpandedChange={handleChange} disabled>
        <div>Content</div>
      </Accordion>
    );

    const header = getByRole("button", { name: "Disabled" });
    fireEvent.click(header);

    expect(calls.count).toBe(0);
  });
});
