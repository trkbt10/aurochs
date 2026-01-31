/** @file Unit tests for shape serialization */
import { isXmlElement, getChild } from "@oxen/xml";
import type { SpShape, GrpShape, PicShape, CxnShape, GraphicFrame } from "@oxen-office/pptx/domain/shape";
import type { TextBody } from "@oxen-office/pptx/domain/text";
import type { Effects, Line } from "@oxen-office/pptx/domain";
import { EMU_PER_PIXEL } from "@oxen-office/pptx/domain";
import { px, deg, pct } from "@oxen-office/ooxml/domain/units";
import { serializeShape, serializeGroupShape, serializePicture, serializeConnectionShape } from "./shape-serializer";

function createRectShape(id: string, overrides: Partial<SpShape> = {}): SpShape {
  return {
    type: "sp",
    nonVisual: { id, name: `Shape ${id}` },
    properties: {
      transform: {
        x: px(10),
        y: px(20),
        width: px(300),
        height: px(200),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: { type: "preset", preset: "rect", adjustValues: [] },
    },
    ...overrides,
  };
}

function createTextBody(text: string): TextBody {
  return {
    bodyProperties: {},
    paragraphs: [
      {
        properties: {},
        runs: [{ type: "text", text, properties: {} }],
      },
    ],
  };
}

describe("shape-serializer", () => {
  it("serializes a basic rectangle shape", () => {
    const shape = createRectShape("2");
    const xml = serializeShape(shape);

    expect(xml.name).toBe("p:sp");
    const nvSpPr = getChild(xml, "p:nvSpPr");
    const cNvPr = nvSpPr ? getChild(nvSpPr, "p:cNvPr") : undefined;
    expect(cNvPr?.attrs.id).toBe("2");

    const spPr = getChild(xml, "p:spPr");
    const xfrm = spPr ? getChild(spPr, "a:xfrm") : undefined;
    expect(getChild(xfrm!, "a:off")?.attrs.x).toBe(String(Math.round(10 * EMU_PER_PIXEL)));
    expect(getChild(xfrm!, "a:ext")?.attrs.cx).toBe(String(Math.round(300 * EMU_PER_PIXEL)));

    const prstGeom = spPr ? getChild(spPr, "a:prstGeom") : undefined;
    expect(prstGeom?.attrs.prst).toBe("rect");
  });

  it("serializes a text shape", () => {
    const shape = createRectShape("3", { textBody: createTextBody("Hello") });
    const xml = serializeShape(shape);

    const txBody = getChild(xml, "p:txBody");
    expect(txBody).toBeDefined();
    const paragraph = txBody ? getChild(txBody, "a:p") : undefined;
    expect(paragraph).toBeDefined();
    const run = paragraph?.children.find((c) => isXmlElement(c) && c.name === "a:r");
    const textEl = run && isXmlElement(run) ? getChild(run, "a:t") : undefined;
    const textNode = textEl?.children[0];
    expect(textNode && !isXmlElement(textNode) ? (textNode as { type: "text"; value: string }).value : undefined).toBe("Hello");
  });

  it("serializes a custom geometry shape", () => {
    const shape: SpShape = {
      ...createRectShape("4"),
      properties: {
        ...createRectShape("4").properties,
        geometry: {
          type: "custom",
          paths: [
            {
              width: px(100),
              height: px(100),
              fill: "norm",
              stroke: true,
              extrusionOk: true,
              commands: [
                { type: "moveTo", point: { x: px(0), y: px(0) } },
                { type: "lineTo", point: { x: px(100), y: px(0) } },
                { type: "close" },
              ],
            },
          ],
        },
      },
    };
    const xml = serializeShape(shape);
    const spPr = getChild(xml, "p:spPr");
    expect(getChild(spPr!, "a:custGeom")).toBeDefined();
  });

  it("serializes fill/line/effects in p:spPr", () => {
    const line: Line = {
      width: px(2),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "solidFill", color: { spec: { type: "srgb", value: "000000" } } },
      dash: "solid",
      join: "round",
    };
    const effects: Effects = {
      shadow: {
        type: "outer",
        color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(40) } },
        blurRadius: px(8),
        distance: px(6),
        direction: deg(45),
      },
    };

    const shape = createRectShape("5", {
      properties: {
        ...createRectShape("5").properties,
        fill: { type: "solidFill", color: { spec: { type: "srgb", value: "FF0000" } } },
        line,
        effects,
      },
    });

    const xml = serializeShape(shape);
    const spPr = getChild(xml, "p:spPr")!;
    expect(getChild(getChild(spPr, "a:solidFill")!, "a:srgbClr")?.attrs.val).toBe("FF0000");
    expect(getChild(spPr, "a:ln")).toBeDefined();
    expect(getChild(spPr, "a:effectLst")).toBeDefined();
  });

  it("serializes non-visual locks and hyperlinks", () => {
    const shape = createRectShape("6", {
      nonVisual: {
        id: "6",
        name: "Shape 6",
        shapeLocks: { noSelect: true },
        hyperlink: { id: "rId99", tooltip: "tip" },
      },
    });
    const xml = serializeShape(shape);
    const nvSpPr = getChild(xml, "p:nvSpPr")!;
    const cNvPr = getChild(nvSpPr, "p:cNvPr")!;
    expect(getChild(cNvPr, "a:hlinkClick")?.attrs["r:id"]).toBe("rId99");
    const cNvSpPr = getChild(nvSpPr, "p:cNvSpPr")!;
    expect(getChild(cNvSpPr, "a:spLocks")?.attrs.noSelect).toBe("1");
  });

  it("serializes a group shape with children", () => {
    const child = createRectShape("11");
    const group: GrpShape = {
      type: "grpSp",
      nonVisual: { id: "10", name: "Group 10" },
      properties: {
        transform: {
          x: px(0),
          y: px(0),
          width: px(100),
          height: px(100),
          rotation: deg(0),
          flipH: false,
          flipV: false,
          childOffsetX: px(0),
          childOffsetY: px(0),
          childExtentWidth: px(100),
          childExtentHeight: px(100),
        },
      },
      children: [child],
    };
    const xml = serializeGroupShape(group);
    expect(xml.name).toBe("p:grpSp");
    expect(xml.children.some((c) => isXmlElement(c) && c.name === "p:sp")).toBe(true);
  });

  it("serializes a picture shape", () => {
    const pic: PicShape = {
      type: "pic",
      nonVisual: { id: "20", name: "Picture 20" },
      blipFill: { resourceId: "rId2", stretch: true },
      properties: { transform: createRectShape("x").properties.transform },
    };
    const xml = serializePicture(pic);
    expect(xml.name).toBe("p:pic");
    const blipFill = getChild(xml, "p:blipFill");
    const blip = blipFill ? getChild(blipFill, "a:blip") : undefined;
    expect(blip?.attrs["r:embed"]).toBe("rId2");
    const stretch = blipFill ? getChild(blipFill, "a:stretch") : undefined;
    expect(getChild(stretch!, "a:fillRect")).toBeDefined();
  });

  it("serializes picture media references in p:nvPr", () => {
    const pic: PicShape = {
      type: "pic",
      nonVisual: { id: "21", name: "Video 21" },
      blipFill: { resourceId: "rId2", stretch: true },
      properties: { transform: createRectShape("x").properties.transform },
      mediaType: "video",
      media: { videoFile: { link: "rId10", contentType: "video/mp4" } },
    };
    const xml = serializePicture(pic);
    const nvPicPr = getChild(xml, "p:nvPicPr")!;
    const nvPr = getChild(nvPicPr, "p:nvPr")!;
    const videoFile = getChild(nvPr, "a:videoFile")!;
    expect(videoFile.attrs["r:link"]).toBe("rId10");
    expect(videoFile.attrs.contentType).toBe("video/mp4");
  });

  it("serializes a connection shape", () => {
    const cxn: CxnShape = {
      type: "cxnSp",
      nonVisual: {
        id: "30",
        name: "Connector 30",
        startConnection: { shapeId: "2", siteIndex: 0 },
      },
      properties: { transform: createRectShape("x").properties.transform },
    };
    const xml = serializeConnectionShape(cxn);
    expect(xml.name).toBe("p:cxnSp");
    const nv = getChild(xml, "p:nvCxnSpPr");
    const cNv = nv ? getChild(nv, "p:cNvCxnSpPr") : undefined;
    expect(getChild(cNv!, "a:stCxn")?.attrs.id).toBe("2");
  });

  it("serializes a graphicFrame table", () => {
    const frame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "100", name: "Table 100" },
      transform: {
        x: px(10),
        y: px(20),
        width: px(200),
        height: px(100),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      content: {
        type: "table",
        data: {
          table: {
            properties: {},
            grid: { columns: [{ width: px(100) }, { width: px(100) }] },
            rows: [
              {
                height: px(20),
                cells: [
                  { properties: {}, textBody: createTextBody("A") },
                  { properties: {}, textBody: createTextBody("B") },
                ],
              },
            ],
          },
        },
      },
    };

    const xml = serializeShape(frame);
    expect(xml.name).toBe("p:graphicFrame");
    const graphic = getChild(xml, "a:graphic")!;
    const graphicData = getChild(graphic, "a:graphicData")!;
    expect(graphicData.attrs.uri).toBe("http://schemas.openxmlformats.org/drawingml/2006/table");
    expect(getChild(graphicData, "a:tbl")).toBeDefined();
  });
});
