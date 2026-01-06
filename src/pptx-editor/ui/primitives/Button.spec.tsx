/**
 * @file Button interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("fires onClick when enabled", () => {
    const state = { clicks: 0 };
    const handleClick = () => {
      state.clicks += 1;
    };

    const { getByRole } = render(
      <Button onClick={handleClick}>Click</Button>
    );

    fireEvent.click(getByRole("button"));
    expect(state.clicks).toBe(1);
  });

  it("does not fire onClick when disabled", () => {
    const state = { clicks: 0 };
    const handleClick = () => {
      state.clicks += 1;
    };

    const { getByRole } = render(
      <Button onClick={handleClick} disabled>
        Click
      </Button>
    );

    fireEvent.click(getByRole("button"));
    expect(state.clicks).toBe(0);
  });
});
