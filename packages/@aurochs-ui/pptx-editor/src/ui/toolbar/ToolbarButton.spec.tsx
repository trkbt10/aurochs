/**
 * @file ToolbarButton interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { ToolbarButton } from "@aurochs-ui/ui-components/primitives/ToolbarButton";

const DummyIcon = <svg data-testid="icon" />;

describe("ToolbarButton", () => {
  it("calls onClick when enabled", () => {
    const calls: { count: number } = { count: 0 };
    const handleClick = () => {
      calls.count += 1;
    };

    const { getByRole } = render(
      <ToolbarButton icon={DummyIcon} label="Select" onClick={handleClick} />
    );

    fireEvent.click(getByRole("button", { name: "Select" }));
    expect(calls.count).toBe(1);
  });

  it("does not call onClick when disabled", () => {
    const calls: { count: number } = { count: 0 };
    const handleClick = () => {
      calls.count += 1;
    };

    const { getByRole } = render(
      <ToolbarButton icon={DummyIcon} label="Select" onClick={handleClick} disabled />
    );

    fireEvent.click(getByRole("button", { name: "Select" }));
    expect(calls.count).toBe(0);
  });
});
