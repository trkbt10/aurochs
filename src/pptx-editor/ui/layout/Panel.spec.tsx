/**
 * @file Panel layout tests
 */

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { Panel } from "./Panel";

describe("Panel", () => {
  it("renders title and badge when provided", () => {
    const { getByText } = render(
      <Panel title="Layers" badge={3}>
        <div>Body</div>
      </Panel>
    );

    expect(getByText("Layers")).toBeTruthy();
    expect(getByText("3")).toBeTruthy();
  });

  it("renders without header when title is absent", () => {
    const { queryByText } = render(
      <Panel>
        <div>Body</div>
      </Panel>
    );

    expect(queryByText("Layers")).toBeNull();
  });
});
