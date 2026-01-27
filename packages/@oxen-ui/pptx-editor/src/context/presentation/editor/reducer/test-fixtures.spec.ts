/**
 * @file Reducer test fixtures tests
 */

import { px } from "@oxen/ooxml/domain/units";
import { createTestDocument } from "./test-fixtures";

describe("createTestDocument", () => {
  it("creates a minimal document", () => {
    const doc = createTestDocument();

    expect(doc.slideWidth).toBe(px(960));
    expect(doc.slideHeight).toBe(px(540));
    expect(doc.slides).toHaveLength(1);
    expect(doc.slides[0].id).toBe("slide-1");
  });
});

