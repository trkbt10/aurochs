/**
 * @file SolidFillEditor interaction tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import type { SolidFill } from "@oxen/ooxml/domain/fill";
import { SolidFillEditor } from "./SolidFillEditor";

describe("SolidFillEditor", () => {
  it("updates fill color from hex input", () => {
    const value: SolidFill = {
      type: "solidFill",
      color: { spec: { type: "srgb", value: "000000" } },
    };

    const calls: { last?: SolidFill } = {};
    const onChange = (fill: SolidFill) => {
      calls.last = fill;
    };

    const { getByPlaceholderText } = render(
      <SolidFillEditor value={value} onChange={onChange} />
    );

    fireEvent.change(getByPlaceholderText("RRGGBB"), { target: { value: "ff0000" } });

    expect(calls.last?.type).toBe("solidFill");
    expect(calls.last?.color.spec.type).toBe("srgb");
    if (calls.last?.color.spec.type === "srgb") {
      expect(calls.last.color.spec.value).toBe("FF0000");
    }
  });
});

