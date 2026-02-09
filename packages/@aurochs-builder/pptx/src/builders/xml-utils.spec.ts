/** @file Unit tests for xml-utils */
import { setChildren } from "./xml-utils";
import { createElement } from "@aurochs/xml";

describe("setChildren", () => {
  it("replaces children of an element", () => {
    const original = createElement("parent", {}, [createElement("oldChild")]);
    const newChild = createElement("newChild");
    const result = setChildren(original, [newChild]);
    expect(result.children).toHaveLength(1);
    expect((result.children[0] as { name: string }).name).toBe("newChild");
  });

  it("preserves element name and attributes", () => {
    const original = createElement("p:sp", { id: "1" }, []);
    const result = setChildren(original, [createElement("p:txBody")]);
    expect(result.name).toBe("p:sp");
    expect(result.attrs.id).toBe("1");
  });

  it("sets empty children array", () => {
    const original = createElement("parent", {}, [createElement("child")]);
    const result = setChildren(original, []);
    expect(result.children).toHaveLength(0);
  });
});
