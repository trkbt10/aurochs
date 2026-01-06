/**
 * @file Popover event isolation tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { Popover } from "./Popover";

describe("Popover", () => {
  it("does not bubble clicks from content to parent handlers", () => {
    const counters = { parentClicks: 0 };
    const onParentClick = () => {
      counters.parentClicks += 1;
    };

    const { getByText } = render(
      <div onClick={onParentClick}>
        <Popover
          trigger={<button type="button">Open</button>}
          open
          onOpenChange={() => undefined}
          showArrow
        >
          <div>Popover Content</div>
        </Popover>
      </div>
    );

    const content = getByText("Popover Content");
    fireEvent.pointerDown(content);
    fireEvent.click(content);

    expect(counters.parentClicks).toBe(0);
  });
});
