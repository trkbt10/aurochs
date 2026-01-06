/**
 * @file Section layout tests
 */

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { Section } from "./Section";

describe("Section", () => {
  it("renders children", () => {
    const { getByText } = render(
      <Section>
        <div>First</div>
        <div>Second</div>
      </Section>
    );

    expect(getByText("Second")).toBeTruthy();
  });
});
