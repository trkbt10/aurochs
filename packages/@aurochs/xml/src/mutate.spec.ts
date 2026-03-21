/**
 * @file Immutable XML mutation tests
 *
 * Tests for all generic XML mutation functions in mutate.ts.
 */

import {
  createElement,
  createText,
  setAttribute,
  setAttributes,
  removeAttribute,
  appendChild,
  prependChild,
  insertChildAt,
  removeChildAt,
  removeChildren,
  replaceChildAt,
  replaceChild,
  replaceChildByName,
  setChildren,
  updateChildByName,
  findElement,
  findElements,
  updateAtPath,
  updateDocumentRoot,
  getDocumentRoot,
  type XmlElement,
  type XmlDocument,
} from "./index";

function el(name: string, attrs: Record<string, string> = {}, children: XmlElement["children"] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

// =============================================================================
// Attribute Operations
// =============================================================================

describe("setAttribute", () => {
  it("adds a new attribute", () => {
    const result = setAttribute(el("test"), "id", "123");
    expect(result.attrs.id).toBe("123");
  });

  it("updates an existing attribute without mutating original", () => {
    const original = el("test", { id: "old" });
    const result = setAttribute(original, "id", "new");
    expect(result.attrs.id).toBe("new");
    expect(original.attrs.id).toBe("old");
  });
});

describe("setAttributes", () => {
  it("sets multiple attributes at once", () => {
    const result = setAttributes(el("test", { existing: "value" }), { a: "1", b: "2" });
    expect(result.attrs).toEqual({ existing: "value", a: "1", b: "2" });
  });
});

describe("removeAttribute", () => {
  it("removes an attribute without mutating original", () => {
    const original = el("test", { id: "123", name: "foo" });
    const result = removeAttribute(original, "id");
    expect(result.attrs).toEqual({ name: "foo" });
    expect(original.attrs.id).toBe("123");
  });

  it("returns unchanged if attribute does not exist", () => {
    const result = removeAttribute(el("test", { name: "foo" }), "id");
    expect(result.attrs).toEqual({ name: "foo" });
  });
});

// =============================================================================
// Child Operations
// =============================================================================

describe("appendChild", () => {
  it("appends a child without mutating original", () => {
    const parent = el("parent", {}, [el("child1")]);
    const result = appendChild(parent, el("child2"));
    expect(result.children).toHaveLength(2);
    expect((result.children[1] as XmlElement).name).toBe("child2");
    expect(parent.children).toHaveLength(1);
  });
});

describe("prependChild", () => {
  it("prepends a child to the beginning", () => {
    const result = prependChild(el("parent", {}, [el("child1")]), el("child2"));
    expect((result.children[0] as XmlElement).name).toBe("child2");
  });
});

describe("insertChildAt", () => {
  it("inserts a child at specific index", () => {
    const result = insertChildAt(el("parent", {}, [el("child1"), el("child2")]), el("new"), 1);
    expect(result.children).toHaveLength(3);
    expect((result.children[1] as XmlElement).name).toBe("new");
  });
});

describe("removeChildAt", () => {
  it("removes a child at specific index", () => {
    const result = removeChildAt(el("parent", {}, [el("child1"), el("child2")]), 0);
    expect(result.children).toHaveLength(1);
    expect((result.children[0] as XmlElement).name).toBe("child2");
  });
});

describe("removeChildren", () => {
  it("removes children matching predicate", () => {
    const result = removeChildren(
      el("parent", {}, [el("keep"), el("remove"), el("keep")]),
      (child) => (child as XmlElement).name === "remove",
    );
    expect(result.children).toHaveLength(2);
  });
});

describe("replaceChildAt", () => {
  it("replaces a child at specific index", () => {
    const result = replaceChildAt(el("parent", {}, [el("child1"), el("child2")]), 0, el("new"));
    expect((result.children[0] as XmlElement).name).toBe("new");
    expect((result.children[1] as XmlElement).name).toBe("child2");
  });
});

describe("replaceChild", () => {
  it("replaces first child matching predicate", () => {
    const result = replaceChild(
      el("parent", {}, [el("child1"), el("target")]),
      (child) => (child as XmlElement).name === "target",
      el("new"),
    );
    expect((result.children[1] as XmlElement).name).toBe("new");
  });

  it("returns unchanged if no match", () => {
    const parent = el("parent", {}, [el("child1")]);
    const result = replaceChild(parent, (child) => (child as XmlElement).name === "nonexistent", el("new"));
    expect(result).toBe(parent);
  });
});

describe("replaceChildByName", () => {
  it("replaces first child with given name", () => {
    const result = replaceChildByName(
      el("a:xfrm", {}, [el("a:off", { x: "0" }), el("a:ext")]),
      "a:off",
      el("a:off", { x: "100" }),
    );
    expect((result.children[0] as XmlElement).attrs.x).toBe("100");
  });
});

describe("setChildren", () => {
  it("replaces all children", () => {
    const result = setChildren(el("parent", {}, [el("old")]), [el("new1"), el("new2")]);
    expect(result.children).toHaveLength(2);
    expect((result.children[0] as XmlElement).name).toBe("new1");
  });
});

describe("updateChildByName", () => {
  it("updates child with given name using updater function", () => {
    const result = updateChildByName(
      el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" })]),
      "a:off",
      (child) => setAttribute(child, "x", "100"),
    );
    expect((result.children[0] as XmlElement).attrs.x).toBe("100");
    expect((result.children[0] as XmlElement).attrs.y).toBe("0");
  });
});

// =============================================================================
// Search Operations
// =============================================================================

describe("findElement", () => {
  it("finds element matching predicate (depth-first)", () => {
    const target = el("target", { id: "123" });
    const root = el("root", {}, [el("wrapper", {}, [target])]);
    expect(findElement(root, (e) => e.attrs.id === "123")).toBe(target);
  });

  it("returns null if no match", () => {
    expect(findElement(el("root"), (e) => e.attrs.id === "123")).toBeNull();
  });
});

describe("findElements", () => {
  it("finds all elements matching predicate", () => {
    const parent = el("p:spTree", {}, [el("p:sp"), el("p:pic"), el("p:sp")]);
    expect(findElements(parent, (e) => e.name === "p:sp")).toHaveLength(2);
  });
});

// =============================================================================
// Deep Update Operations
// =============================================================================

describe("updateAtPath", () => {
  it("updates element at path", () => {
    const root = el("p:sp", {}, [el("p:spPr", {}, [el("a:xfrm", {}, [el("a:off", { x: "0" })])])]);
    const result = updateAtPath(root, ["p:spPr", "a:xfrm", "a:off"], (e) => setAttribute(e, "x", "100"));
    const off = ((result.children[0] as XmlElement).children[0] as XmlElement).children[0] as XmlElement;
    expect(off.attrs.x).toBe("100");
  });

  it("applies updater to root when path is empty", () => {
    const result = updateAtPath(el("root", { val: "old" }), [], (e) => setAttribute(e, "val", "new"));
    expect(result.attrs.val).toBe("new");
  });
});

// =============================================================================
// Document Operations
// =============================================================================

describe("updateDocumentRoot", () => {
  it("updates the root element of a document", () => {
    const doc: XmlDocument = { children: [el("root", { val: "old" })] };
    const result = updateDocumentRoot(doc, (r) => setAttribute(r, "val", "new"));
    expect((result.children[0] as XmlElement).attrs.val).toBe("new");
  });
});

describe("getDocumentRoot", () => {
  it("returns the root element", () => {
    const root = el("root");
    expect(getDocumentRoot({ children: [root] })).toBe(root);
  });

  it("returns null if no root element", () => {
    expect(getDocumentRoot({ children: [] })).toBeNull();
  });
});

// =============================================================================
// Element Creation (from ast.ts, verified here for completeness)
// =============================================================================

describe("createElement", () => {
  it("creates element with defaults", () => {
    expect(createElement("test")).toEqual({ type: "element", name: "test", attrs: {}, children: [] });
  });

  it("creates element with attrs and children", () => {
    const result = createElement("parent", { id: "1" }, [createElement("child")]);
    expect(result.attrs.id).toBe("1");
    expect(result.children).toHaveLength(1);
  });
});

describe("createText", () => {
  it("creates text node", () => {
    expect(createText("Hello")).toEqual({ type: "text", value: "Hello" });
  });
});
