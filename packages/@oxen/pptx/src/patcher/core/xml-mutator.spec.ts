/**
 * @file XML Mutator Tests
 */

import { createElement, createText, type XmlElement, type XmlDocument } from "@oxen/xml";
import {
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
  findShapeById,
  getShapeIds,
  updateAtPath,
  replaceShapeById,
  removeShapeById,
  updateDocumentRoot,
  getDocumentRoot,
} from "./xml-mutator";

// =============================================================================
// Test Helpers
// =============================================================================

function createTestElement(
  name: string,
  attrs: Record<string, string> = {},
  children: XmlElement["children"] = [],
): XmlElement {
  return { type: "element", name, attrs, children };
}

// =============================================================================
// Attribute Operations
// =============================================================================

describe("setAttribute", () => {
  it("adds a new attribute", () => {
    const element = createTestElement("test");
    const result = setAttribute(element, "id", "123");

    expect(result.attrs.id).toBe("123");
    expect(element.attrs.id).toBeUndefined(); // Original unchanged
  });

  it("updates an existing attribute", () => {
    const element = createTestElement("test", { id: "old" });
    const result = setAttribute(element, "id", "new");

    expect(result.attrs.id).toBe("new");
    expect(element.attrs.id).toBe("old"); // Original unchanged
  });
});

describe("setAttributes", () => {
  it("sets multiple attributes at once", () => {
    const element = createTestElement("test", { existing: "value" });
    const result = setAttributes(element, { a: "1", b: "2" });

    expect(result.attrs).toEqual({ existing: "value", a: "1", b: "2" });
  });
});

describe("removeAttribute", () => {
  it("removes an attribute", () => {
    const element = createTestElement("test", { id: "123", name: "foo" });
    const result = removeAttribute(element, "id");

    expect(result.attrs).toEqual({ name: "foo" });
    expect(element.attrs.id).toBe("123"); // Original unchanged
  });

  it("does nothing if attribute does not exist", () => {
    const element = createTestElement("test", { name: "foo" });
    const result = removeAttribute(element, "id");

    expect(result.attrs).toEqual({ name: "foo" });
  });
});

// =============================================================================
// Child Operations
// =============================================================================

describe("appendChild", () => {
  it("appends a child to the end", () => {
    const child1 = createTestElement("child1");
    const child2 = createTestElement("child2");
    const parent = createTestElement("parent", {}, [child1]);

    const result = appendChild(parent, child2);

    expect(result.children).toHaveLength(2);
    expect((result.children[1] as XmlElement).name).toBe("child2");
    expect(parent.children).toHaveLength(1); // Original unchanged
  });
});

describe("prependChild", () => {
  it("prepends a child to the beginning", () => {
    const child1 = createTestElement("child1");
    const child2 = createTestElement("child2");
    const parent = createTestElement("parent", {}, [child1]);

    const result = prependChild(parent, child2);

    expect(result.children).toHaveLength(2);
    expect((result.children[0] as XmlElement).name).toBe("child2");
  });
});

describe("insertChildAt", () => {
  it("inserts a child at specific index", () => {
    const child1 = createTestElement("child1");
    const child2 = createTestElement("child2");
    const newChild = createTestElement("new");
    const parent = createTestElement("parent", {}, [child1, child2]);

    const result = insertChildAt(parent, newChild, 1);

    expect(result.children).toHaveLength(3);
    expect((result.children[1] as XmlElement).name).toBe("new");
  });
});

describe("removeChildAt", () => {
  it("removes a child at specific index", () => {
    const child1 = createTestElement("child1");
    const child2 = createTestElement("child2");
    const parent = createTestElement("parent", {}, [child1, child2]);

    const result = removeChildAt(parent, 0);

    expect(result.children).toHaveLength(1);
    expect((result.children[0] as XmlElement).name).toBe("child2");
  });
});

describe("removeChildren", () => {
  it("removes children matching predicate", () => {
    const child1 = createTestElement("keep");
    const child2 = createTestElement("remove");
    const child3 = createTestElement("keep");
    const parent = createTestElement("parent", {}, [child1, child2, child3]);

    const result = removeChildren(parent, (child) => {
      return (child as XmlElement).name === "remove";
    });

    expect(result.children).toHaveLength(2);
    expect((result.children[0] as XmlElement).name).toBe("keep");
    expect((result.children[1] as XmlElement).name).toBe("keep");
  });
});

describe("replaceChildAt", () => {
  it("replaces a child at specific index", () => {
    const child1 = createTestElement("child1");
    const child2 = createTestElement("child2");
    const newChild = createTestElement("new");
    const parent = createTestElement("parent", {}, [child1, child2]);

    const result = replaceChildAt(parent, 0, newChild);

    expect((result.children[0] as XmlElement).name).toBe("new");
    expect((result.children[1] as XmlElement).name).toBe("child2");
  });
});

describe("replaceChild", () => {
  it("replaces first child matching predicate", () => {
    const child1 = createTestElement("child1");
    const child2 = createTestElement("target");
    const newChild = createTestElement("new");
    const parent = createTestElement("parent", {}, [child1, child2]);

    const result = replaceChild(
      parent,
      (child) => (child as XmlElement).name === "target",
      newChild,
    );

    expect((result.children[1] as XmlElement).name).toBe("new");
  });

  it("returns unchanged if no match", () => {
    const child1 = createTestElement("child1");
    const newChild = createTestElement("new");
    const parent = createTestElement("parent", {}, [child1]);

    const result = replaceChild(
      parent,
      (child) => (child as XmlElement).name === "nonexistent",
      newChild,
    );

    expect(result).toBe(parent);
  });
});

describe("replaceChildByName", () => {
  it("replaces first child with given name", () => {
    const child1 = createTestElement("a:off", { x: "0" });
    const child2 = createTestElement("a:ext");
    const newOff = createTestElement("a:off", { x: "100" });
    const parent = createTestElement("a:xfrm", {}, [child1, child2]);

    const result = replaceChildByName(parent, "a:off", newOff);

    expect((result.children[0] as XmlElement).attrs.x).toBe("100");
  });
});

describe("setChildren", () => {
  it("replaces all children", () => {
    const parent = createTestElement("parent", {}, [
      createTestElement("old"),
    ]);
    const newChildren = [createTestElement("new1"), createTestElement("new2")];

    const result = setChildren(parent, newChildren);

    expect(result.children).toHaveLength(2);
    expect((result.children[0] as XmlElement).name).toBe("new1");
  });
});

describe("updateChildByName", () => {
  it("updates child with given name using updater function", () => {
    const child = createTestElement("a:off", { x: "0", y: "0" });
    const parent = createTestElement("a:xfrm", {}, [child]);

    const result = updateChildByName(parent, "a:off", (el) =>
      setAttribute(el, "x", "100"),
    );

    expect((result.children[0] as XmlElement).attrs.x).toBe("100");
    expect((result.children[0] as XmlElement).attrs.y).toBe("0");
  });
});

// =============================================================================
// Search Operations
// =============================================================================

describe("findElement", () => {
  it("finds element matching predicate", () => {
    const target = createTestElement("target", { id: "123" });
    const wrapper = createTestElement("wrapper", {}, [target]);
    const root = createTestElement("root", {}, [wrapper]);

    const result = findElement(root, (el) => el.attrs.id === "123");

    expect(result).toBe(target);
  });

  it("returns null if no match", () => {
    const root = createTestElement("root");

    const result = findElement(root, (el) => el.attrs.id === "123");

    expect(result).toBeNull();
  });
});

describe("findElements", () => {
  it("finds all elements matching predicate", () => {
    const target1 = createTestElement("p:sp");
    const target2 = createTestElement("p:sp");
    const other = createTestElement("p:pic");
    const parent = createTestElement("p:spTree", {}, [target1, other, target2]);

    const result = findElements(parent, (el) => el.name === "p:sp");

    expect(result).toHaveLength(2);
  });
});

describe("findShapeById", () => {
  it("finds p:sp by id", () => {
    const cNvPr = createTestElement("p:cNvPr", { id: "5", name: "Shape 1" });
    const cNvSpPr = createTestElement("p:cNvSpPr");
    const nvPr = createTestElement("p:nvPr");
    const nvSpPr = createTestElement("p:nvSpPr", {}, [cNvPr, cNvSpPr, nvPr]);
    const spPr = createTestElement("p:spPr");
    const sp = createTestElement("p:sp", {}, [nvSpPr, spPr]);
    const spTree = createTestElement("p:spTree", {}, [sp]);

    const result = findShapeById(spTree, "5");

    expect(result).toBe(sp);
  });

  it("finds p:pic by id", () => {
    const cNvPr = createTestElement("p:cNvPr", { id: "10", name: "Picture 1" });
    const cNvPicPr = createTestElement("p:cNvPicPr");
    const nvPr = createTestElement("p:nvPr");
    const nvPicPr = createTestElement("p:nvPicPr", {}, [cNvPr, cNvPicPr, nvPr]);
    const pic = createTestElement("p:pic", {}, [nvPicPr]);
    const spTree = createTestElement("p:spTree", {}, [pic]);

    const result = findShapeById(spTree, "10");

    expect(result).toBe(pic);
  });

  it("finds shape in nested group", () => {
    const innerCNvPr = createTestElement("p:cNvPr", { id: "7" });
    const innerNvSpPr = createTestElement("p:nvSpPr", {}, [innerCNvPr]);
    const innerSp = createTestElement("p:sp", {}, [innerNvSpPr]);

    const grpCNvPr = createTestElement("p:cNvPr", { id: "6" });
    const grpNvGrpSpPr = createTestElement("p:nvGrpSpPr", {}, [grpCNvPr]);
    const grpSpPr = createTestElement("p:grpSpPr");
    const grpSp = createTestElement("p:grpSp", {}, [grpNvGrpSpPr, grpSpPr, innerSp]);

    const spTree = createTestElement("p:spTree", {}, [grpSp]);

    const result = findShapeById(spTree, "7");

    expect(result).toBe(innerSp);
  });

  it("returns null if not found", () => {
    const spTree = createTestElement("p:spTree");

    const result = findShapeById(spTree, "999");

    expect(result).toBeNull();
  });
});

describe("getShapeIds", () => {
  it("returns all shape IDs from spTree", () => {
    const sp1 = createTestElement("p:sp", {}, [
      createTestElement("p:nvSpPr", {}, [
        createTestElement("p:cNvPr", { id: "2" }),
      ]),
    ]);
    const sp2 = createTestElement("p:sp", {}, [
      createTestElement("p:nvSpPr", {}, [
        createTestElement("p:cNvPr", { id: "3" }),
      ]),
    ]);
    const pic = createTestElement("p:pic", {}, [
      createTestElement("p:nvPicPr", {}, [
        createTestElement("p:cNvPr", { id: "4" }),
      ]),
    ]);
    const spTree = createTestElement("p:spTree", {}, [sp1, sp2, pic]);

    const result = getShapeIds(spTree);

    expect(result).toEqual(["2", "3", "4"]);
  });

  it("includes IDs from nested groups", () => {
    const innerSp = createTestElement("p:sp", {}, [
      createTestElement("p:nvSpPr", {}, [
        createTestElement("p:cNvPr", { id: "5" }),
      ]),
    ]);
    const grpSp = createTestElement("p:grpSp", {}, [
      createTestElement("p:nvGrpSpPr", {}, [
        createTestElement("p:cNvPr", { id: "4" }),
      ]),
      innerSp,
    ]);
    const spTree = createTestElement("p:spTree", {}, [grpSp]);

    const result = getShapeIds(spTree);

    expect(result).toEqual(["4", "5"]);
  });
});

// =============================================================================
// Deep Update Operations
// =============================================================================

describe("updateAtPath", () => {
  it("updates element at path", () => {
    const off = createTestElement("a:off", { x: "0" });
    const xfrm = createTestElement("a:xfrm", {}, [off]);
    const spPr = createTestElement("p:spPr", {}, [xfrm]);
    const root = createTestElement("p:sp", {}, [spPr]);

    const result = updateAtPath(root, ["p:spPr", "a:xfrm", "a:off"], (el) =>
      setAttribute(el, "x", "100"),
    );

    const updatedOff = (
      (result.children[0] as XmlElement).children[0] as XmlElement
    ).children[0] as XmlElement;
    expect(updatedOff.attrs.x).toBe("100");
  });

  it("applies updater to root when path is empty", () => {
    const root = createTestElement("root", { val: "old" });

    const result = updateAtPath(root, [], (el) => setAttribute(el, "val", "new"));

    expect(result.attrs.val).toBe("new");
  });
});

describe("replaceShapeById", () => {
  it("replaces shape with matching ID", () => {
    const sp = createTestElement("p:sp", {}, [
      createTestElement("p:nvSpPr", {}, [
        createTestElement("p:cNvPr", { id: "5", name: "Old" }),
      ]),
    ]);
    const spTree = createTestElement("p:spTree", {}, [sp]);

    const newSp = createTestElement("p:sp", {}, [
      createTestElement("p:nvSpPr", {}, [
        createTestElement("p:cNvPr", { id: "5", name: "New" }),
      ]),
    ]);

    const result = replaceShapeById(spTree, "5", newSp);

    const cNvPr = (
      (result.children[0] as XmlElement).children[0] as XmlElement
    ).children[0] as XmlElement;
    expect(cNvPr.attrs.name).toBe("New");
  });
});

describe("removeShapeById", () => {
  it("removes shape with matching ID", () => {
    const sp1 = createTestElement("p:sp", {}, [
      createTestElement("p:nvSpPr", {}, [
        createTestElement("p:cNvPr", { id: "2" }),
      ]),
    ]);
    const sp2 = createTestElement("p:sp", {}, [
      createTestElement("p:nvSpPr", {}, [
        createTestElement("p:cNvPr", { id: "3" }),
      ]),
    ]);
    const spTree = createTestElement("p:spTree", {}, [sp1, sp2]);

    const result = removeShapeById(spTree, "2");

    expect(result.children).toHaveLength(1);
    const remaining = (
      (result.children[0] as XmlElement).children[0] as XmlElement
    ).children[0] as XmlElement;
    expect(remaining.attrs.id).toBe("3");
  });
});

// =============================================================================
// Document Operations
// =============================================================================

describe("updateDocumentRoot", () => {
  it("updates the root element of a document", () => {
    const root = createTestElement("root", { val: "old" });
    const doc: XmlDocument = { children: [root] };

    const result = updateDocumentRoot(doc, (r) => setAttribute(r, "val", "new"));

    expect((result.children[0] as XmlElement).attrs.val).toBe("new");
  });
});

describe("getDocumentRoot", () => {
  it("returns the root element", () => {
    const root = createTestElement("root");
    const doc: XmlDocument = { children: [root] };

    const result = getDocumentRoot(doc);

    expect(result).toBe(root);
  });

  it("returns null if no root element", () => {
    const doc: XmlDocument = { children: [] };

    const result = getDocumentRoot(doc);

    expect(result).toBeNull();
  });
});

// =============================================================================
// Element Creation
// =============================================================================

describe("createElement", () => {
  it("creates element with defaults", () => {
    const result = createElement("test");

    expect(result).toEqual({
      type: "element",
      name: "test",
      attrs: {},
      children: [],
    });
  });

  it("creates element with attrs and children", () => {
    const child = createElement("child");
    const result = createElement("parent", { id: "1" }, [child]);

    expect(result.attrs.id).toBe("1");
    expect(result.children).toHaveLength(1);
  });
});

describe("createText", () => {
  it("creates text node", () => {
    const result = createText("Hello");

    expect(result).toEqual({
      type: "text",
      value: "Hello",
    });
  });
});
