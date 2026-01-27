/**
 * @file XML Serializer Tests
 */

import type { XmlElement, XmlDocument } from "./ast";
import { serializeElement, serializeDocument, serializeNode } from "./serializer";

describe("serializeElement", () => {
  it("serializes empty element with self-closing tag", () => {
    const element: XmlElement = {
      type: "element",
      name: "p:sp",
      attrs: {},
      children: [],
    };
    expect(serializeElement(element)).toBe("<p:sp/>");
  });

  it("serializes empty element without self-closing when disabled", () => {
    const element: XmlElement = {
      type: "element",
      name: "p:sp",
      attrs: {},
      children: [],
    };
    expect(serializeElement(element, { selfClosing: false })).toBe("<p:sp></p:sp>");
  });

  it("serializes element with attributes", () => {
    const element: XmlElement = {
      type: "element",
      name: "p:sp",
      attrs: { id: "1", name: "Shape 1" },
      children: [],
    };
    expect(serializeElement(element)).toBe('<p:sp id="1" name="Shape 1"/>');
  });

  it("escapes attribute values", () => {
    const element: XmlElement = {
      type: "element",
      name: "p:sp",
      attrs: { name: 'Shape "quoted" & <special>' },
      children: [],
    };
    expect(serializeElement(element)).toBe(
      '<p:sp name="Shape &quot;quoted&quot; &amp; &lt;special&gt;"/>',
    );
  });

  it("serializes element with text content", () => {
    const element: XmlElement = {
      type: "element",
      name: "a:t",
      attrs: {},
      children: [{ type: "text", value: "Hello World" }],
    };
    expect(serializeElement(element)).toBe("<a:t>Hello World</a:t>");
  });

  it("escapes text content", () => {
    const element: XmlElement = {
      type: "element",
      name: "a:t",
      attrs: {},
      children: [{ type: "text", value: "A & B < C > D" }],
    };
    expect(serializeElement(element)).toBe("<a:t>A &amp; B &lt; C &gt; D</a:t>");
  });

  it("serializes nested elements", () => {
    const element: XmlElement = {
      type: "element",
      name: "p:sp",
      attrs: { id: "1" },
      children: [
        {
          type: "element",
          name: "p:txBody",
          attrs: {},
          children: [
            {
              type: "element",
              name: "a:p",
              attrs: {},
              children: [
                {
                  type: "element",
                  name: "a:t",
                  attrs: {},
                  children: [{ type: "text", value: "Hello" }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(serializeElement(element)).toBe(
      '<p:sp id="1"><p:txBody><a:p><a:t>Hello</a:t></a:p></p:txBody></p:sp>',
    );
  });

  it("serializes with indentation", () => {
    const element: XmlElement = {
      type: "element",
      name: "root",
      attrs: {},
      children: [
        {
          type: "element",
          name: "child",
          attrs: {},
          children: [
            {
              type: "element",
              name: "grandchild",
              attrs: {},
              children: [],
            },
          ],
        },
      ],
    };
    const result = serializeElement(element, { indent: true });
    expect(result).toBe(
      "<root>\n" + "  <child>\n" + "    <grandchild/>\n" + "  </child>\n" + "</root>",
    );
  });

  it("uses custom indentation string", () => {
    const element: XmlElement = {
      type: "element",
      name: "root",
      attrs: {},
      children: [
        {
          type: "element",
          name: "child",
          attrs: {},
          children: [],
        },
      ],
    };
    const result = serializeElement(element, { indent: true, indentString: "\t" });
    expect(result).toBe("<root>\n" + "\t<child/>\n" + "</root>");
  });

  it("handles mixed content (text and elements)", () => {
    const element: XmlElement = {
      type: "element",
      name: "p",
      attrs: {},
      children: [
        { type: "text", value: "Hello " },
        {
          type: "element",
          name: "b",
          attrs: {},
          children: [{ type: "text", value: "World" }],
        },
        { type: "text", value: "!" },
      ],
    };
    // Mixed content should not add extra whitespace around text
    expect(serializeElement(element)).toBe("<p>Hello <b>World</b>!</p>");
  });

  it("handles namespace prefixes", () => {
    const element: XmlElement = {
      type: "element",
      name: "p:sld",
      attrs: {
        "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main",
        "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
      },
      children: [],
    };
    expect(serializeElement(element)).toBe(
      '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" ' +
        'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>',
    );
  });
});

describe("serializeDocument", () => {
  it("serializes document without declaration", () => {
    const doc: XmlDocument = {
      children: [
        {
          type: "element",
          name: "root",
          attrs: {},
          children: [],
        },
      ],
    };
    expect(serializeDocument(doc)).toBe("<root/>");
  });

  it("serializes document with declaration", () => {
    const doc: XmlDocument = {
      children: [
        {
          type: "element",
          name: "root",
          attrs: {},
          children: [],
        },
      ],
    };
    expect(serializeDocument(doc, { declaration: true })).toBe(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><root/>',
    );
  });

  it("serializes document with declaration and indentation", () => {
    const doc: XmlDocument = {
      children: [
        {
          type: "element",
          name: "root",
          attrs: {},
          children: [
            {
              type: "element",
              name: "child",
              attrs: {},
              children: [],
            },
          ],
        },
      ],
    };
    const result = serializeDocument(doc, { declaration: true, indent: true });
    expect(result).toBe(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        "<root>\n" +
        "  <child/>\n" +
        "</root>",
    );
  });

  it("uses custom encoding in declaration", () => {
    const doc: XmlDocument = {
      children: [
        {
          type: "element",
          name: "root",
          attrs: {},
          children: [],
        },
      ],
    };
    expect(serializeDocument(doc, { declaration: true, encoding: "UTF-16" })).toBe(
      '<?xml version="1.0" encoding="UTF-16" standalone="yes"?><root/>',
    );
  });

  it("handles standalone=false", () => {
    const doc: XmlDocument = {
      children: [
        {
          type: "element",
          name: "root",
          attrs: {},
          children: [],
        },
      ],
    };
    expect(serializeDocument(doc, { declaration: true, standalone: false })).toBe(
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?><root/>',
    );
  });

  it("handles multiple root-level children", () => {
    const doc: XmlDocument = {
      children: [
        { type: "text", value: "<!-- comment -->" },
        {
          type: "element",
          name: "root",
          attrs: {},
          children: [],
        },
      ],
    };
    // Text nodes are serialized as-is (escaped)
    expect(serializeDocument(doc)).toBe("&lt;!-- comment --&gt;<root/>");
  });
});

describe("serializeNode", () => {
  it("serializes text node", () => {
    expect(serializeNode({ type: "text", value: "Hello" })).toBe("Hello");
  });

  it("serializes element node", () => {
    const element: XmlElement = {
      type: "element",
      name: "test",
      attrs: {},
      children: [],
    };
    expect(serializeNode(element)).toBe("<test/>");
  });

  it("escapes text node content", () => {
    expect(serializeNode({ type: "text", value: "A & B" })).toBe("A &amp; B");
  });
});

describe("round-trip compatibility", () => {
  it("preserves PPTX-like structure", () => {
    // Simulate a typical PPTX shape element structure
    const shape: XmlElement = {
      type: "element",
      name: "p:sp",
      attrs: {},
      children: [
        {
          type: "element",
          name: "p:nvSpPr",
          attrs: {},
          children: [
            {
              type: "element",
              name: "p:cNvPr",
              attrs: { id: "2", name: "Rectangle 1" },
              children: [],
            },
            {
              type: "element",
              name: "p:cNvSpPr",
              attrs: {},
              children: [],
            },
            {
              type: "element",
              name: "p:nvPr",
              attrs: {},
              children: [],
            },
          ],
        },
        {
          type: "element",
          name: "p:spPr",
          attrs: {},
          children: [
            {
              type: "element",
              name: "a:xfrm",
              attrs: {},
              children: [
                {
                  type: "element",
                  name: "a:off",
                  attrs: { x: "914400", y: "914400" },
                  children: [],
                },
                {
                  type: "element",
                  name: "a:ext",
                  attrs: { cx: "1828800", cy: "914400" },
                  children: [],
                },
              ],
            },
            {
              type: "element",
              name: "a:prstGeom",
              attrs: { prst: "rect" },
              children: [
                {
                  type: "element",
                  name: "a:avLst",
                  attrs: {},
                  children: [],
                },
              ],
            },
          ],
        },
        {
          type: "element",
          name: "p:txBody",
          attrs: {},
          children: [
            {
              type: "element",
              name: "a:bodyPr",
              attrs: {},
              children: [],
            },
            {
              type: "element",
              name: "a:lstStyle",
              attrs: {},
              children: [],
            },
            {
              type: "element",
              name: "a:p",
              attrs: {},
              children: [
                {
                  type: "element",
                  name: "a:r",
                  attrs: {},
                  children: [
                    {
                      type: "element",
                      name: "a:rPr",
                      attrs: { lang: "en-US" },
                      children: [],
                    },
                    {
                      type: "element",
                      name: "a:t",
                      attrs: {},
                      children: [{ type: "text", value: "Hello World" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const xml = serializeElement(shape);

    // Verify structure is preserved
    expect(xml).toContain("<p:sp>");
    expect(xml).toContain('<p:cNvPr id="2" name="Rectangle 1"/>');
    expect(xml).toContain('<a:off x="914400" y="914400"/>');
    expect(xml).toContain('<a:ext cx="1828800" cy="914400"/>');
    expect(xml).toContain('<a:prstGeom prst="rect">');
    expect(xml).toContain("<a:t>Hello World</a:t>");
    expect(xml).toContain("</p:sp>");
  });
});
