/**
 * @file LayoutSelector basic behavior tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { LayoutSelector } from "./LayoutSelector";

describe("LayoutSelector", () => {
  it("opens dropdown and shows empty state when options are empty", () => {
    const { getByRole, getByText } = render(
      <LayoutSelector options={[]} onChange={() => undefined} />
    );

    fireEvent.click(getByRole("button"));
    expect(getByText("No layouts available")).toBeTruthy();
  });
});

