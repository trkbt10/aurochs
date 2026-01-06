/**
 * @file FieldGroup layout tests
 */

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { FieldGroup } from "./FieldGroup";

describe("FieldGroup", () => {
  it("renders stacked layout with label and hint", () => {
    const { getByText } = render(
      <FieldGroup label="Width" hint="px">
        <input />
      </FieldGroup>
    );

    expect(getByText("Width")).toBeTruthy();
    expect(getByText("px")).toBeTruthy();
  });

  it("renders inline layout with label and hint", () => {
    const { getByText } = render(
      <FieldGroup label="X" hint="px" inline>
        <input />
      </FieldGroup>
    );

    expect(getByText("X")).toBeTruthy();
    expect(getByText("px")).toBeTruthy();
  });
});
