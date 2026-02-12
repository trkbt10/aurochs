/**
 * @file DOCX Drawing Serializer
 *
 * Serializes inline and anchor drawings to WordprocessingML XML.
 *
 * @see ECMA-376 Part 1, Section 20.4 (DrawingML - WordprocessingML Drawing)
 */

import type { XmlElement, XmlNode } from "@aurochs/xml";
import { createElement } from "@aurochs/xml";
import type { DocxDrawing, DocxInlineDrawing, DocxAnchorDrawing, DocxPositionH, DocxPositionV, DocxWrapType } from "@aurochs-office/docx/domain/drawing";
import type { DrawingPicture, DrawingExtent, NonVisualDrawingProps } from "@aurochs-office/ooxml/domain/drawing";

// Namespaces
const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const NS_PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture";

// =============================================================================
// Extent Serialization
// =============================================================================

function serializeExtent(extent: DrawingExtent): XmlElement {
  return createElement("wp:extent", {
    cx: String(extent.cx),
    cy: String(extent.cy),
  });
}

function serializeEffectExtent(): XmlElement {
  return createElement("wp:effectExtent", {
    l: "0",
    t: "0",
    r: "0",
    b: "0",
  });
}

// =============================================================================
// Document Properties Serialization
// =============================================================================

function serializeDocPr(docPr: NonVisualDrawingProps): XmlElement {
  const attrs: Record<string, string> = {
    id: String(docPr.id),
    name: docPr.name,
  };
  if (docPr.descr) {
    attrs.descr = docPr.descr;
  }
  return createElement("wp:docPr", attrs);
}

// =============================================================================
// Picture Serialization
// =============================================================================

function serializePicture(pic: DrawingPicture): XmlElement {
  const children: XmlNode[] = [];

  // Non-visual picture properties
  if (pic.nvPicPr) {
    const nvPicPrChildren: XmlNode[] = [];
    if (pic.nvPicPr.cNvPr) {
      nvPicPrChildren.push(
        createElement("pic:cNvPr", {
          id: String(pic.nvPicPr.cNvPr.id),
          name: pic.nvPicPr.cNvPr.name,
          ...(pic.nvPicPr.cNvPr.descr ? { descr: pic.nvPicPr.cNvPr.descr } : {}),
        })
      );
    }
    nvPicPrChildren.push(createElement("pic:cNvPicPr"));
    children.push(createElement("pic:nvPicPr", {}, nvPicPrChildren));
  }

  // Blip fill
  if (pic.blipFill) {
    const blipFillChildren: XmlNode[] = [];
    if (pic.blipFill.blip?.rEmbed) {
      blipFillChildren.push(
        createElement("a:blip", { "r:embed": pic.blipFill.blip.rEmbed })
      );
    }
    if (pic.blipFill.stretch) {
      blipFillChildren.push(
        createElement("a:stretch", {}, [createElement("a:fillRect")])
      );
    }
    children.push(createElement("pic:blipFill", {}, blipFillChildren));
  }

  // Shape properties
  if (pic.spPr) {
    const spPrChildren: XmlNode[] = [];
    if (pic.spPr.xfrm) {
      const xfrmChildren: XmlNode[] = [];
      if (pic.spPr.xfrm.off) {
        xfrmChildren.push(
          createElement("a:off", {
            x: String(pic.spPr.xfrm.off.x),
            y: String(pic.spPr.xfrm.off.y),
          })
        );
      }
      if (pic.spPr.xfrm.ext) {
        xfrmChildren.push(
          createElement("a:ext", {
            cx: String(pic.spPr.xfrm.ext.cx),
            cy: String(pic.spPr.xfrm.ext.cy),
          })
        );
      }
      spPrChildren.push(createElement("a:xfrm", {}, xfrmChildren));
    }
    // Preset geometry (rectangle)
    spPrChildren.push(
      createElement("a:prstGeom", { prst: "rect" }, [
        createElement("a:avLst"),
      ])
    );
    children.push(createElement("pic:spPr", {}, spPrChildren));
  }

  return createElement(
    "pic:pic",
    { "xmlns:pic": NS_PIC },
    children
  );
}

function serializeGraphic(pic: DrawingPicture): XmlElement {
  return createElement(
    "a:graphic",
    { "xmlns:a": NS_A },
    [
      createElement(
        "a:graphicData",
        { uri: "http://schemas.openxmlformats.org/drawingml/2006/picture" },
        [serializePicture(pic)]
      ),
    ]
  );
}

// =============================================================================
// Position Serialization
// =============================================================================

function serializePositionH(pos: DocxPositionH): XmlElement {
  const children: XmlNode[] = [];
  if (pos.posOffset !== undefined) {
    children.push(
      createElement("wp:posOffset", {}, [{ type: "text", value: String(pos.posOffset) }])
    );
  } else if (pos.align) {
    children.push(
      createElement("wp:align", {}, [{ type: "text", value: pos.align }])
    );
  }
  return createElement("wp:positionH", { relativeFrom: pos.relativeFrom }, children);
}

function serializePositionV(pos: DocxPositionV): XmlElement {
  const children: XmlNode[] = [];
  if (pos.posOffset !== undefined) {
    children.push(
      createElement("wp:posOffset", {}, [{ type: "text", value: String(pos.posOffset) }])
    );
  } else if (pos.align) {
    children.push(
      createElement("wp:align", {}, [{ type: "text", value: pos.align }])
    );
  }
  return createElement("wp:positionV", { relativeFrom: pos.relativeFrom }, children);
}

// =============================================================================
// Wrap Serialization
// =============================================================================

function serializeWrap(wrap: DocxWrapType): XmlElement | undefined {
  switch (wrap.type) {
    case "none":
      return createElement("wp:wrapNone");
    case "topAndBottom":
      return createElement("wp:wrapTopAndBottom");
    case "square":
      return createElement("wp:wrapSquare", { wrapText: wrap.wrapText ?? "bothSides" });
    case "tight":
      return createElement("wp:wrapTight", { wrapText: wrap.wrapText ?? "bothSides" });
    case "through":
      return createElement("wp:wrapThrough", { wrapText: wrap.wrapText ?? "bothSides" });
    default:
      return undefined;
  }
}

// =============================================================================
// Inline Drawing Serialization
// =============================================================================

function serializeInlineDrawing(drawing: DocxInlineDrawing): XmlElement {
  const children: XmlNode[] = [];

  // Extent
  children.push(serializeExtent(drawing.extent));

  // Effect extent
  children.push(serializeEffectExtent());

  // Document properties
  children.push(serializeDocPr(drawing.docPr));

  // Graphic frame locks
  children.push(
    createElement("wp:cNvGraphicFramePr", {}, [
      createElement("a:graphicFrameLocks", { "xmlns:a": NS_A, noChangeAspect: "1" }),
    ])
  );

  // Graphic content
  if (drawing.pic) {
    children.push(serializeGraphic(drawing.pic));
  }

  return createElement(
    "wp:inline",
    {
      distT: String(drawing.distT ?? 0),
      distB: String(drawing.distB ?? 0),
      distL: String(drawing.distL ?? 0),
      distR: String(drawing.distR ?? 0),
    },
    children
  );
}

// =============================================================================
// Anchor Drawing Serialization
// =============================================================================

function serializeAnchorDrawing(drawing: DocxAnchorDrawing): XmlElement {
  const children: XmlNode[] = [];

  // Simple position
  children.push(createElement("wp:simplePos", { x: "0", y: "0" }));

  // Horizontal position
  if (drawing.positionH) {
    children.push(serializePositionH(drawing.positionH));
  }

  // Vertical position
  if (drawing.positionV) {
    children.push(serializePositionV(drawing.positionV));
  }

  // Extent
  children.push(serializeExtent(drawing.extent));

  // Effect extent
  children.push(serializeEffectExtent());

  // Wrap
  if (drawing.wrap) {
    const wrapEl = serializeWrap(drawing.wrap);
    if (wrapEl) {
      children.push(wrapEl);
    }
  } else {
    children.push(createElement("wp:wrapNone"));
  }

  // Document properties
  children.push(serializeDocPr(drawing.docPr));

  // Graphic frame locks
  children.push(
    createElement("wp:cNvGraphicFramePr", {}, [
      createElement("a:graphicFrameLocks", { "xmlns:a": NS_A, noChangeAspect: "1" }),
    ])
  );

  // Graphic content
  if (drawing.pic) {
    children.push(serializeGraphic(drawing.pic));
  }

  const attrs: Record<string, string> = {
    distT: String(drawing.distT ?? 0),
    distB: String(drawing.distB ?? 0),
    distL: String(drawing.distL ?? 114300),
    distR: String(drawing.distR ?? 114300),
    simplePos: "0",
    relativeHeight: String(drawing.relativeHeight ?? 251658240),
    behindDoc: drawing.behindDoc ? "1" : "0",
    locked: drawing.locked ? "1" : "0",
    layoutInCell: drawing.layoutInCell !== false ? "1" : "0",
    allowOverlap: drawing.allowOverlap !== false ? "1" : "0",
  };

  return createElement("wp:anchor", attrs, children);
}

// =============================================================================
// Main Drawing Serialization
// =============================================================================

/**
 * Serialize a DocxDrawing to XML element.
 */
export function serializeDrawing(drawing: DocxDrawing): XmlElement {
  const children: XmlNode[] = [];

  if (drawing.type === "inline") {
    children.push(serializeInlineDrawing(drawing));
  } else {
    children.push(serializeAnchorDrawing(drawing));
  }

  return createElement("w:drawing", {}, children);
}
