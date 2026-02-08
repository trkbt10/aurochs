/**
 * @file ToolbarButton interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { forwardRef } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { ToolbarButton } from "./ToolbarButton";

const DummyIcon = forwardRef<SVGSVGElement, LucideProps>((props, ref) => (
  <svg data-testid="icon" ref={ref} {...props} />
)) as LucideIcon;

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
