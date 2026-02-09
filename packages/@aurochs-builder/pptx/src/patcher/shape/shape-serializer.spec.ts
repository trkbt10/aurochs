/** @file Shape serializer tests */
import { isXmlElement, getChild, getChildren } from "@aurochs/xml";
import type {
  SpShape,
  GrpShape,
  PicShape,
  CxnShape,
  GraphicFrame,
  ContentPartShape,
  PathCommand,
} from "@aurochs-office/pptx/domain/shape";
import type { TextBody } from "@aurochs-office/pptx/domain/text";
import type { Transform, GroupTransform } from "@aurochs-office/pptx/domain/geometry";
import type { Effects, Line } from "@aurochs-office/pptx/domain";
import { EMU_PER_PIXEL } from "@aurochs-office/pptx/domain";
import { px, deg, pct } from "@aurochs-office/drawing-ml/domain/units";
import {
  serializeShape,
  serializeGroupShape,
  serializePicture,
  serializeConnectionShape,
  serializeGraphicFrame,
  serializeGeometry,
} from "./shape-serializer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTransform(overrides: Partial<Transform> = {}): Transform {
  return {
    x: px(10),
    y: px(20),
    width: px(300),
    height: px(200),
    rotation: deg(0),
    flipH: false,
    flipV: false,
    ...overrides,
  };
}

function makeGroupTransform(overrides: Partial<GroupTransform> = {}): GroupTransform {
  return {
    ...makeTransform(),
    childOffsetX: px(0),
    childOffsetY: px(0),
    childExtentWidth: px(300),
    childExtentHeight: px(200),
    ...overrides,
  };
}

function createRectShape(id: string, overrides: Partial<SpShape> = {}): SpShape {
  return {
    type: "sp",
    nonVisual: { id, name: `Shape ${id}` },
    properties: {
      transform: makeTransform(),
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

function e(v: number): string {
  return String(Math.round(v * EMU_PER_PIXEL));
}

// ---------------------------------------------------------------------------
// serializeShape dispatch
// ---------------------------------------------------------------------------

describe("serializeShape dispatch", () => {
  it("dispatches sp -> p:sp", () => {
    const xml = serializeShape(createRectShape("1"));
    expect(xml.name).toBe("p:sp");
  });

  it("dispatches grpSp -> p:grpSp", () => {
    const group: GrpShape = {
      type: "grpSp",
      nonVisual: { id: "2", name: "Group" },
      properties: {},
      children: [],
    };
    const xml = serializeShape(group);
    expect(xml.name).toBe("p:grpSp");
  });

  it("dispatches pic -> p:pic", () => {
    const pic: PicShape = {
      type: "pic",
      nonVisual: { id: "3", name: "Picture" },
      blipFill: { resourceId: "rId1", stretch: true },
      properties: { transform: makeTransform() },
    };
    const xml = serializeShape(pic);
    expect(xml.name).toBe("p:pic");
  });

  it("dispatches cxnSp -> p:cxnSp", () => {
    const cxn: CxnShape = {
      type: "cxnSp",
      nonVisual: { id: "4", name: "Connector" },
      properties: { transform: makeTransform() },
    };
    const xml = serializeShape(cxn);
    expect(xml.name).toBe("p:cxnSp");
  });

  it("dispatches graphicFrame -> p:graphicFrame", () => {
    const frame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "5", name: "Frame" },
      transform: makeTransform(),
      content: {
        type: "oleObject",
        data: { resourceId: "rId1", progId: "Excel.Sheet.12" },
      },
    };
    const xml = serializeShape(frame);
    expect(xml.name).toBe("p:graphicFrame");
  });

  it("throws for contentPart", () => {
    const cp: ContentPartShape = {
      type: "contentPart",
      contentPart: { resourceId: "rId1" } as never,
    };
    expect(() => serializeShape(cp)).toThrow("contentPart is not supported");
  });
});

// ---------------------------------------------------------------------------
// serializeSpShape
// ---------------------------------------------------------------------------

describe("serializeSpShape", () => {
  it("serializes basic rect shape with transform and geometry", () => {
    const shape = createRectShape("2");
    const xml = serializeShape(shape);

    expect(xml.name).toBe("p:sp");
    const spPr = getChild(xml, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    expect(getChild(xfrm, "a:off")?.attrs.x).toBe(e(10));
    expect(getChild(xfrm, "a:off")?.attrs.y).toBe(e(20));
    expect(getChild(xfrm, "a:ext")?.attrs.cx).toBe(e(300));
    expect(getChild(xfrm, "a:ext")?.attrs.cy).toBe(e(200));

    const prstGeom = getChild(spPr, "a:prstGeom")!;
    expect(prstGeom.attrs.prst).toBe("rect");
    expect(getChild(prstGeom, "a:avLst")).toBeDefined();
  });

  it("uses default rect geometry when geometry is undefined", () => {
    const shape = createRectShape("3", {
      properties: { transform: makeTransform() },
    });
    const xml = serializeShape(shape);
    const spPr = getChild(xml, "p:spPr")!;
    const prstGeom = getChild(spPr, "a:prstGeom")!;
    expect(prstGeom.attrs.prst).toBe("rect");
  });

  it("omits a:xfrm when transform is undefined", () => {
    const shape = createRectShape("4", {
      properties: { geometry: { type: "preset", preset: "ellipse", adjustValues: [] } },
    });
    const xml = serializeShape(shape);
    const spPr = getChild(xml, "p:spPr")!;
    expect(getChild(spPr, "a:xfrm")).toBeUndefined();
  });

  it("includes fill, line, effects, and shape3d in spPr", () => {
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
        transform: makeTransform(),
        geometry: { type: "preset", preset: "rect", adjustValues: [] },
        fill: { type: "solidFill", color: { spec: { type: "srgb", value: "FF0000" } } },
        line,
        effects,
      },
    });

    const xml = serializeShape(shape);
    const spPr = getChild(xml, "p:spPr")!;
    expect(getChild(spPr, "a:solidFill")).toBeDefined();
    expect(getChild(spPr, "a:ln")).toBeDefined();
    expect(getChild(spPr, "a:effectLst")).toBeDefined();
  });

  it("includes textBody when present", () => {
    const shape = createRectShape("6", { textBody: createTextBody("Hello") });
    const xml = serializeShape(shape);
    expect(getChild(xml, "p:txBody")).toBeDefined();
  });

  it("includes shape style when present", () => {
    const shape = createRectShape("7", {
      style: {
        lineReference: {
          index: 1,
          color: { type: "solidFill", color: { spec: { type: "srgb", value: "000000" } } },
        },
        fillReference: { index: 0 },
        effectReference: { index: 0 },
        fontReference: { index: "minor" },
      },
    });
    const xml = serializeShape(shape);
    const style = getChild(xml, "p:style")!;
    expect(style).toBeDefined();
    expect(getChild(style, "a:lnRef")).toBeDefined();
    expect(getChild(style, "a:fillRef")).toBeDefined();
    expect(getChild(style, "a:effectRef")).toBeDefined();
    expect(getChild(style, "a:fontRef")).toBeDefined();
  });

  it("returns null style when no references are provided", () => {
    const shape = createRectShape("8", {
      style: {},
    });
    const xml = serializeShape(shape);
    // style with no references -> null -> not appended
    expect(getChild(xml, "p:style")).toBeUndefined();
  });

  it("serializes placeholder in nvPr", () => {
    const shape = createRectShape("9", {
      placeholder: { type: "title", idx: 0 },
    });
    const xml = serializeShape(shape);
    const nvSpPr = getChild(xml, "p:nvSpPr")!;
    const nvPr = getChild(nvSpPr, "p:nvPr")!;
    const ph = getChild(nvPr, "p:ph")!;
    expect(ph.attrs.type).toBe("title");
    expect(ph.attrs.idx).toBe("0");
  });

  it("serializes placeholder with size and hasCustomPrompt", () => {
    const shape = createRectShape("10", {
      placeholder: { type: "body", size: "half", hasCustomPrompt: true },
    });
    const xml = serializeShape(shape);
    const nvSpPr = getChild(xml, "p:nvSpPr")!;
    const nvPr = getChild(nvSpPr, "p:nvPr")!;
    const ph = getChild(nvPr, "p:ph")!;
    expect(ph.attrs.sz).toBe("half");
    expect(ph.attrs.hasCustomPrompt).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// serializeCNvPr
// ---------------------------------------------------------------------------

describe("serializeCNvPr", () => {
  it("includes description, title, hidden", () => {
    const shape = createRectShape("20", {
      nonVisual: {
        id: "20",
        name: "Described",
        description: "A shape",
        title: "Title",
        hidden: true,
      },
    });
    const xml = serializeShape(shape);
    const cNvPr = getChild(getChild(xml, "p:nvSpPr")!, "p:cNvPr")!;
    expect(cNvPr.attrs.descr).toBe("A shape");
    expect(cNvPr.attrs.title).toBe("Title");
    expect(cNvPr.attrs.hidden).toBe("1");
  });

  it("hidden=false is serialized as '0'", () => {
    const shape = createRectShape("21", {
      nonVisual: { id: "21", name: "Visible", hidden: false },
    });
    const xml = serializeShape(shape);
    const cNvPr = getChild(getChild(xml, "p:nvSpPr")!, "p:cNvPr")!;
    expect(cNvPr.attrs.hidden).toBe("0");
  });

  it("omits hidden attr when undefined", () => {
    const shape = createRectShape("22");
    const xml = serializeShape(shape);
    const cNvPr = getChild(getChild(xml, "p:nvSpPr")!, "p:cNvPr")!;
    expect(cNvPr.attrs.hidden).toBeUndefined();
  });

  it("serializes hyperlink click", () => {
    const shape = createRectShape("23", {
      nonVisual: {
        id: "23",
        name: "Link",
        hyperlink: { id: "rId5", tooltip: "Click here", action: "ppaction://hlinksldjump" },
      },
    });
    const xml = serializeShape(shape);
    const cNvPr = getChild(getChild(xml, "p:nvSpPr")!, "p:cNvPr")!;
    const hlink = getChild(cNvPr, "a:hlinkClick")!;
    expect(hlink.attrs["r:id"]).toBe("rId5");
    expect(hlink.attrs.tooltip).toBe("Click here");
    expect(hlink.attrs.action).toBe("ppaction://hlinksldjump");
  });

  it("serializes hyperlink hover", () => {
    const shape = createRectShape("24", {
      nonVisual: {
        id: "24",
        name: "Hover",
        hyperlinkHover: { id: "rId6" },
      },
    });
    const xml = serializeShape(shape);
    const cNvPr = getChild(getChild(xml, "p:nvSpPr")!, "p:cNvPr")!;
    expect(getChild(cNvPr, "a:hlinkHover")?.attrs["r:id"]).toBe("rId6");
  });

  it("serializes hyperlink with sound", () => {
    const shape = createRectShape("25", {
      nonVisual: {
        id: "25",
        name: "Sound",
        hyperlink: { id: "rId7", sound: { embed: "rId8", name: "click.wav" } },
      },
    });
    const xml = serializeShape(shape);
    const cNvPr = getChild(getChild(xml, "p:nvSpPr")!, "p:cNvPr")!;
    const hlink = getChild(cNvPr, "a:hlinkClick")!;
    const snd = getChild(hlink, "a:snd")!;
    expect(snd.attrs["r:embed"]).toBe("rId8");
    expect(snd.attrs.name).toBe("click.wav");
  });
});

// ---------------------------------------------------------------------------
// serializeCNvSpPr
// ---------------------------------------------------------------------------

describe("serializeCNvSpPr", () => {
  it("serializes textBox attr", () => {
    const shape = createRectShape("30", {
      nonVisual: { id: "30", name: "TextBox", textBox: true },
    });
    const xml = serializeShape(shape);
    const cNvSpPr = getChild(getChild(xml, "p:nvSpPr")!, "p:cNvSpPr")!;
    expect(cNvSpPr.attrs.txBox).toBe("1");
  });

  it("serializes shapeLocks", () => {
    const shape = createRectShape("31", {
      nonVisual: {
        id: "31",
        name: "Locked",
        shapeLocks: { noSelect: true, noMove: true, noResize: false },
      },
    });
    const xml = serializeShape(shape);
    const cNvSpPr = getChild(getChild(xml, "p:nvSpPr")!, "p:cNvSpPr")!;
    const locks = getChild(cNvSpPr, "a:spLocks")!;
    expect(locks.attrs.noSelect).toBe("1");
    expect(locks.attrs.noMove).toBe("1");
    expect(locks.attrs.noResize).toBe("0");
  });
});

// ---------------------------------------------------------------------------
// serializeLocksElement
// ---------------------------------------------------------------------------

describe("serializeLocksElement", () => {
  it("returns no lock element when locks is undefined", () => {
    const shape = createRectShape("40");
    const xml = serializeShape(shape);
    const cNvSpPr = getChild(getChild(xml, "p:nvSpPr")!, "p:cNvSpPr")!;
    expect(getChild(cNvSpPr, "a:spLocks")).toBeUndefined();
  });

  it("returns no lock element when all lock values are undefined", () => {
    const shape = createRectShape("41", {
      nonVisual: {
        id: "41",
        name: "AllUndef",
        shapeLocks: {
          noSelect: undefined,
          noMove: undefined,
        } as never,
      },
    });
    const xml = serializeShape(shape);
    const cNvSpPr = getChild(getChild(xml, "p:nvSpPr")!, "p:cNvSpPr")!;
    expect(getChild(cNvSpPr, "a:spLocks")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// serializePictureBlipFill
// ---------------------------------------------------------------------------

describe("serializePictureBlipFill", () => {
  function makePic(blipFill: PicShape["blipFill"]): PicShape {
    return {
      type: "pic",
      nonVisual: { id: "50", name: "Pic" },
      blipFill,
      properties: { transform: makeTransform() },
    };
  }

  it("serializes normal resourceId with stretch", () => {
    const xml = serializePicture(makePic({ resourceId: "rId1", stretch: true }));
    const blipFill = getChild(xml, "p:blipFill")!;
    expect(getChild(blipFill, "a:blip")?.attrs["r:embed"]).toBe("rId1");
    expect(getChild(blipFill, "a:stretch")).toBeDefined();
    expect(getChild(getChild(blipFill, "a:stretch")!, "a:fillRect")).toBeDefined();
  });

  it("serializes tile fill", () => {
    const xml = serializePicture(
      makePic({
        resourceId: "rId2",
        tile: {
          tx: px(10),
          ty: px(20),
          sx: pct(100),
          sy: pct(100),
          flip: "none",
          alignment: "tl",
        },
      }),
    );
    const blipFill = getChild(xml, "p:blipFill")!;
    const tile = getChild(blipFill, "a:tile")!;
    expect(tile.attrs.tx).toBe(e(10));
    expect(tile.attrs.ty).toBe(e(20));
    expect(tile.attrs.sx).toBe("100000");
    expect(tile.attrs.sy).toBe("100000");
    expect(tile.attrs.flip).toBe("none");
    expect(tile.attrs.algn).toBe("tl");
  });

  it("serializes sourceRect", () => {
    const xml = serializePicture(
      makePic({
        resourceId: "rId3",
        stretch: true,
        sourceRect: { left: pct(10), top: pct(20), right: pct(30), bottom: pct(40) },
      }),
    );
    const blipFill = getChild(xml, "p:blipFill")!;
    const srcRect = getChild(blipFill, "a:srcRect")!;
    expect(srcRect.attrs.l).toBe("10000");
    expect(srcRect.attrs.t).toBe("20000");
    expect(srcRect.attrs.r).toBe("30000");
    expect(srcRect.attrs.b).toBe("40000");
  });

  it("serializes rotateWithShape, dpi, compressionState", () => {
    const xml = serializePicture(
      makePic({
        resourceId: "rId4",
        stretch: true,
        rotateWithShape: true,
        dpi: 300,
        compressionState: "hqprint",
      }),
    );
    const blipFill = getChild(xml, "p:blipFill")!;
    expect(blipFill.attrs.rotWithShape).toBe("1");
    expect(blipFill.attrs.dpi).toBe("300");
    expect(getChild(blipFill, "a:blip")?.attrs.cstate).toBe("hqprint");
  });

  it("throws when resourceId is missing", () => {
    expect(() =>
      serializePicture(makePic({ resourceId: "" as never, stretch: true })),
    ).toThrow("resourceId is required");
  });

  it("throws when resourceId starts with data:", () => {
    expect(() =>
      serializePicture(makePic({ resourceId: "data:image/png;base64,abc", stretch: true })),
    ).toThrow("data: resourceId requires Phase 7");
  });

  it("throws when neither tile nor stretch is provided", () => {
    expect(() => serializePicture(makePic({ resourceId: "rId5" }))).toThrow(
      "blipFill requires tile or stretch",
    );
  });

  it("serializes blipEffects", () => {
    const xml = serializePicture(
      makePic({
        resourceId: "rId6",
        stretch: true,
        blipEffects: { grayscale: true },
      }),
    );
    const blipFill = getChild(xml, "p:blipFill")!;
    const blip = getChild(blipFill, "a:blip")!;
    // blip should have child elements from blipEffects serialization
    expect(blip.children.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// serializePictureNvPr (media)
// ---------------------------------------------------------------------------

describe("serializePictureNvPr", () => {
  function makePicWithMedia(
    mediaType: PicShape["mediaType"],
    media: PicShape["media"],
  ): PicShape {
    return {
      type: "pic",
      nonVisual: { id: "60", name: "Media" },
      blipFill: { resourceId: "rId1", stretch: true },
      properties: { transform: makeTransform() },
      mediaType,
      media,
    };
  }

  it("serializes video with videoFile link and contentType", () => {
    const xml = serializePicture(
      makePicWithMedia("video", { videoFile: { link: "rId10", contentType: "video/mp4" } }),
    );
    const nvPr = getChild(getChild(xml, "p:nvPicPr")!, "p:nvPr")!;
    const videoFile = getChild(nvPr, "a:videoFile")!;
    expect(videoFile.attrs["r:link"]).toBe("rId10");
    expect(videoFile.attrs.contentType).toBe("video/mp4");
  });

  it("serializes video with quickTimeFile", () => {
    const xml = serializePicture(
      makePicWithMedia("video", { quickTimeFile: { link: "rId11" } }),
    );
    const nvPr = getChild(getChild(xml, "p:nvPicPr")!, "p:nvPr")!;
    expect(getChild(nvPr, "a:quickTimeFile")?.attrs["r:link"]).toBe("rId11");
  });

  it("serializes audio with audioFile link and contentType", () => {
    const xml = serializePicture(
      makePicWithMedia("audio", { audioFile: { link: "rId12", contentType: "audio/mpeg" } }),
    );
    const nvPr = getChild(getChild(xml, "p:nvPicPr")!, "p:nvPr")!;
    const audioFile = getChild(nvPr, "a:audioFile")!;
    expect(audioFile.attrs["r:link"]).toBe("rId12");
    expect(audioFile.attrs.contentType).toBe("audio/mpeg");
  });

  it("serializes audio with wavAudioFile embed and name", () => {
    const xml = serializePicture(
      makePicWithMedia("audio", { wavAudioFile: { embed: "rId13", name: "ding.wav" } }),
    );
    const nvPr = getChild(getChild(xml, "p:nvPicPr")!, "p:nvPr")!;
    const wav = getChild(nvPr, "a:wavAudioFile")!;
    expect(wav.attrs["r:embed"]).toBe("rId13");
    expect(wav.attrs.name).toBe("ding.wav");
  });

  it("produces empty p:nvPr when no media", () => {
    const pic: PicShape = {
      type: "pic",
      nonVisual: { id: "61", name: "NoMedia" },
      blipFill: { resourceId: "rId1", stretch: true },
      properties: { transform: makeTransform() },
    };
    const xml = serializePicture(pic);
    const nvPr = getChild(getChild(xml, "p:nvPicPr")!, "p:nvPr")!;
    expect(nvPr.children.filter((c) => isXmlElement(c))).toHaveLength(0);
  });

  it("serializes video without contentType", () => {
    const xml = serializePicture(
      makePicWithMedia("video", { videoFile: { link: "rId14" } }),
    );
    const nvPr = getChild(getChild(xml, "p:nvPicPr")!, "p:nvPr")!;
    const videoFile = getChild(nvPr, "a:videoFile")!;
    expect(videoFile.attrs["r:link"]).toBe("rId14");
    expect(videoFile.attrs.contentType).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// serializePicture (picture locks / preferRelativeResize)
// ---------------------------------------------------------------------------

describe("serializePicture cNvPicPr", () => {
  it("serializes preferRelativeResize and pictureLocks", () => {
    const pic: PicShape = {
      type: "pic",
      nonVisual: {
        id: "70",
        name: "Locked Pic",
        preferRelativeResize: false,
        pictureLocks: { noChangeAspect: true, noCrop: true },
      },
      blipFill: { resourceId: "rId1", stretch: true },
      properties: { transform: makeTransform() },
    };
    const xml = serializePicture(pic);
    const nvPicPr = getChild(xml, "p:nvPicPr")!;
    const cNvPicPr = getChild(nvPicPr, "p:cNvPicPr")!;
    expect(cNvPicPr.attrs.preferRelativeResize).toBe("0");
    const locks = getChild(cNvPicPr, "a:picLocks")!;
    expect(locks.attrs.noChangeAspect).toBe("1");
    expect(locks.attrs.noCrop).toBe("1");
  });

  it("includes style when present", () => {
    const pic: PicShape = {
      type: "pic",
      nonVisual: { id: "71", name: "Styled Pic" },
      blipFill: { resourceId: "rId1", stretch: true },
      properties: { transform: makeTransform() },
      style: {
        lineReference: { index: 2 },
      },
    };
    const xml = serializePicture(pic);
    expect(getChild(xml, "p:style")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// serializeConnectionShape
// ---------------------------------------------------------------------------

describe("serializeConnectionShape", () => {
  it("serializes with start and end connections", () => {
    const cxn: CxnShape = {
      type: "cxnSp",
      nonVisual: {
        id: "80",
        name: "Cxn",
        startConnection: { shapeId: "10", siteIndex: 0 },
        endConnection: { shapeId: "20", siteIndex: 2 },
      },
      properties: { transform: makeTransform() },
    };
    const xml = serializeConnectionShape(cxn);
    expect(xml.name).toBe("p:cxnSp");
    const nvCxnSpPr = getChild(xml, "p:nvCxnSpPr")!;
    const cNvCxnSpPr = getChild(nvCxnSpPr, "p:cNvCxnSpPr")!;
    expect(getChild(cNvCxnSpPr, "a:stCxn")?.attrs.id).toBe("10");
    expect(getChild(cNvCxnSpPr, "a:stCxn")?.attrs.idx).toBe("0");
    expect(getChild(cNvCxnSpPr, "a:endCxn")?.attrs.id).toBe("20");
    expect(getChild(cNvCxnSpPr, "a:endCxn")?.attrs.idx).toBe("2");
  });

  it("serializes without connections", () => {
    const cxn: CxnShape = {
      type: "cxnSp",
      nonVisual: { id: "81", name: "Plain Cxn" },
      properties: { transform: makeTransform() },
    };
    const xml = serializeConnectionShape(cxn);
    const cNvCxnSpPr = getChild(getChild(xml, "p:nvCxnSpPr")!, "p:cNvCxnSpPr")!;
    expect(getChild(cNvCxnSpPr, "a:stCxn")).toBeUndefined();
    expect(getChild(cNvCxnSpPr, "a:endCxn")).toBeUndefined();
  });

  it("uses default line geometry when geometry is undefined", () => {
    const cxn: CxnShape = {
      type: "cxnSp",
      nonVisual: { id: "82", name: "Default Geom" },
      properties: { transform: makeTransform() },
    };
    const xml = serializeConnectionShape(cxn);
    const spPr = getChild(xml, "p:spPr")!;
    const prstGeom = getChild(spPr, "a:prstGeom")!;
    expect(prstGeom.attrs.prst).toBe("line");
  });

  it("uses explicit geometry when provided", () => {
    const cxn: CxnShape = {
      type: "cxnSp",
      nonVisual: { id: "83", name: "Custom Geom" },
      properties: {
        transform: makeTransform(),
        geometry: { type: "preset", preset: "bentConnector3", adjustValues: [] },
      },
    };
    const xml = serializeConnectionShape(cxn);
    const spPr = getChild(xml, "p:spPr")!;
    expect(getChild(spPr, "a:prstGeom")?.attrs.prst).toBe("bentConnector3");
  });

  it("includes style when present", () => {
    const cxn: CxnShape = {
      type: "cxnSp",
      nonVisual: { id: "84", name: "Styled Cxn" },
      properties: { transform: makeTransform() },
      style: { lineReference: { index: 1 } },
    };
    const xml = serializeConnectionShape(cxn);
    expect(getChild(xml, "p:style")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// serializeGroupShape
// ---------------------------------------------------------------------------

describe("serializeGroupShape", () => {
  it("serializes group with children", () => {
    const child = createRectShape("91");
    const group: GrpShape = {
      type: "grpSp",
      nonVisual: { id: "90", name: "Group" },
      properties: { transform: makeGroupTransform() },
      children: [child],
    };
    const xml = serializeGroupShape(group);
    expect(xml.name).toBe("p:grpSp");
    expect(xml.children.some((c) => isXmlElement(c) && c.name === "p:sp")).toBe(true);
  });

  it("serializes group transform with childOffset/Extent", () => {
    const group: GrpShape = {
      type: "grpSp",
      nonVisual: { id: "92", name: "Group" },
      properties: {
        transform: makeGroupTransform({
          childOffsetX: px(5),
          childOffsetY: px(10),
          childExtentWidth: px(200),
          childExtentHeight: px(100),
        }),
      },
      children: [],
    };
    const xml = serializeGroupShape(group);
    const grpSpPr = getChild(xml, "p:grpSpPr")!;
    const xfrm = getChild(grpSpPr, "a:xfrm")!;
    expect(getChild(xfrm, "a:chOff")?.attrs.x).toBe(e(5));
    expect(getChild(xfrm, "a:chOff")?.attrs.y).toBe(e(10));
    expect(getChild(xfrm, "a:chExt")?.attrs.cx).toBe(e(200));
    expect(getChild(xfrm, "a:chExt")?.attrs.cy).toBe(e(100));
  });

  it("uses default group transform when transform is undefined", () => {
    const group: GrpShape = {
      type: "grpSp",
      nonVisual: { id: "93", name: "NoXfrm" },
      properties: {},
      children: [],
    };
    const xml = serializeGroupShape(group);
    const grpSpPr = getChild(xml, "p:grpSpPr")!;
    const xfrm = getChild(grpSpPr, "a:xfrm")!;
    expect(getChild(xfrm, "a:off")?.attrs.x).toBe("0");
    expect(getChild(xfrm, "a:chOff")?.attrs.x).toBe("0");
    expect(getChild(xfrm, "a:chExt")?.attrs.cx).toBe("0");
  });

  it("includes fill and effects", () => {
    const group: GrpShape = {
      type: "grpSp",
      nonVisual: { id: "94", name: "Filled" },
      properties: {
        fill: { type: "solidFill", color: { spec: { type: "srgb", value: "0000FF" } } },
        effects: {
          shadow: {
            type: "outer",
            color: { spec: { type: "srgb", value: "000000" } },
            blurRadius: px(4),
            distance: px(2),
            direction: deg(0),
          },
        },
      },
      children: [],
    };
    const xml = serializeGroupShape(group);
    const grpSpPr = getChild(xml, "p:grpSpPr")!;
    expect(getChild(grpSpPr, "a:solidFill")).toBeDefined();
    expect(getChild(grpSpPr, "a:effectLst")).toBeDefined();
  });

  it("serializes groupLocks", () => {
    const group: GrpShape = {
      type: "grpSp",
      nonVisual: { id: "95", name: "LockedGroup", groupLocks: { noSelect: true, noUngrp: true } },
      properties: {},
      children: [],
    };
    const xml = serializeGroupShape(group);
    const nvGrpSpPr = getChild(xml, "p:nvGrpSpPr")!;
    const cNvGrpSpPr = getChild(nvGrpSpPr, "p:cNvGrpSpPr")!;
    const locks = getChild(cNvGrpSpPr, "a:grpSpLocks")!;
    expect(locks.attrs.noSelect).toBe("1");
    expect(locks.attrs.noUngrp).toBe("1");
  });

  it("serializes group transform with rotation and flips", () => {
    const group: GrpShape = {
      type: "grpSp",
      nonVisual: { id: "96", name: "RotGroup" },
      properties: {
        transform: makeGroupTransform({
          rotation: deg(45),
          flipH: true,
          flipV: true,
        }),
      },
      children: [],
    };
    const xml = serializeGroupShape(group);
    const grpSpPr = getChild(xml, "p:grpSpPr")!;
    const xfrm = getChild(grpSpPr, "a:xfrm")!;
    expect(xfrm.attrs.rot).toBe("2700000");
    expect(xfrm.attrs.flipH).toBe("1");
    expect(xfrm.attrs.flipV).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// serializeGraphicFrame
// ---------------------------------------------------------------------------

describe("serializeGraphicFrame", () => {
  it("serializes OLE object content", () => {
    const frame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "100", name: "OLE" },
      transform: makeTransform(),
      content: {
        type: "oleObject",
        data: { resourceId: "rId10", progId: "Excel.Sheet.12" },
      },
    };
    const xml = serializeGraphicFrame(frame);
    expect(xml.name).toBe("p:graphicFrame");
    const graphic = getChild(xml, "a:graphic")!;
    const graphicData = getChild(graphic, "a:graphicData")!;
    expect(graphicData.attrs.uri).toBe(
      "http://schemas.openxmlformats.org/presentationml/2006/ole",
    );
    const oleObj = getChild(graphicData, "p:oleObj")!;
    expect(oleObj.attrs["r:id"]).toBe("rId10");
    expect(oleObj.attrs.progId).toBe("Excel.Sheet.12");
    expect(getChild(oleObj, "p:embed")).toBeDefined();
  });

  it("serializes table content", () => {
    const frame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "101", name: "Table" },
      transform: makeTransform(),
      content: {
        type: "table",
        data: {
          table: {
            properties: {},
            grid: { columns: [{ width: px(100) }] },
            rows: [{ height: px(30), cells: [{ properties: {}, textBody: createTextBody("A") }] }],
          },
        },
      },
    };
    const xml = serializeGraphicFrame(frame);
    const graphic = getChild(xml, "a:graphic")!;
    const graphicData = getChild(graphic, "a:graphicData")!;
    expect(graphicData.attrs.uri).toBe(
      "http://schemas.openxmlformats.org/drawingml/2006/table",
    );
    expect(getChild(graphicData, "a:tbl")).toBeDefined();
  });

  it("throws for unsupported content type", () => {
    const frame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "102", name: "Unknown" },
      transform: makeTransform(),
      content: { type: "chart", data: { resourceId: "rId1" } },
    };
    expect(() => serializeGraphicFrame(frame)).toThrow("is not supported for serialization");
  });

  it("serializes graphicFrameLocks", () => {
    const frame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: {
        id: "103",
        name: "Locked Frame",
        graphicFrameLocks: {
          noGrp: true,
          noDrilldown: true,
          noSelect: false,
          noChangeAspect: true,
          noMove: true,
          noResize: true,
        },
      },
      transform: makeTransform(),
      content: { type: "oleObject", data: { resourceId: "rId1", progId: "Equation.3" } },
    };
    const xml = serializeGraphicFrame(frame);
    const nvPr = getChild(xml, "p:nvGraphicFramePr")!;
    const cNvPr = getChild(nvPr, "p:cNvGraphicFramePr")!;
    const locks = getChild(cNvPr, "a:graphicFrameLocks")!;
    expect(locks.attrs.noGrp).toBe("1");
    expect(locks.attrs.noDrilldown).toBe("1");
    expect(locks.attrs.noSelect).toBe("0");
    expect(locks.attrs.noChangeAspect).toBe("1");
    expect(locks.attrs.noMove).toBe("1");
    expect(locks.attrs.noResize).toBe("1");
  });

  it("serializes transform with rotation, flipH, flipV", () => {
    const frame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "104", name: "Rotated" },
      transform: makeTransform({ rotation: deg(90), flipH: true, flipV: true }),
      content: { type: "oleObject", data: { resourceId: "rId1", progId: "Equation.3" } },
    };
    const xml = serializeGraphicFrame(frame);
    const xfrm = getChild(xml, "p:xfrm")!;
    expect(xfrm.attrs.rot).toBe("5400000");
    expect(xfrm.attrs.flipH).toBe("1");
    expect(xfrm.attrs.flipV).toBe("1");
  });

  it("omits rotation when zero", () => {
    const frame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "105", name: "NoRot" },
      transform: makeTransform(),
      content: { type: "oleObject", data: { resourceId: "rId1", progId: "Equation.3" } },
    };
    const xml = serializeGraphicFrame(frame);
    const xfrm = getChild(xml, "p:xfrm")!;
    expect(xfrm.attrs.rot).toBeUndefined();
    expect(xfrm.attrs.flipH).toBeUndefined();
    expect(xfrm.attrs.flipV).toBeUndefined();
  });

  it("includes description, title, hidden in cNvPr", () => {
    const frame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: {
        id: "106",
        name: "Described",
        description: "Some OLE",
        title: "OLE Title",
        hidden: true,
      },
      transform: makeTransform(),
      content: { type: "oleObject", data: { resourceId: "rId1", progId: "Word.Document.12" } },
    };
    const xml = serializeGraphicFrame(frame);
    const nvPr = getChild(xml, "p:nvGraphicFramePr")!;
    const cNvPr = getChild(nvPr, "p:cNvPr")!;
    expect(cNvPr.attrs.descr).toBe("Some OLE");
    expect(cNvPr.attrs.title).toBe("OLE Title");
    expect(cNvPr.attrs.hidden).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// serializeOleObjectGraphicData
// ---------------------------------------------------------------------------

describe("serializeOleObjectGraphicData", () => {
  it("serializes all optional fields", () => {
    const frame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "110", name: "OLE" },
      transform: makeTransform(),
      content: {
        type: "oleObject",
        data: {
          resourceId: "rId10",
          progId: "Excel.Sheet.12",
          name: "MySheet",
          showAsIcon: true,
          imgW: 914400,
          imgH: 457200,
        },
      },
    };
    const xml = serializeGraphicFrame(frame);
    const graphic = getChild(xml, "a:graphic")!;
    const graphicData = getChild(graphic, "a:graphicData")!;
    const oleObj = getChild(graphicData, "p:oleObj")!;
    expect(oleObj.attrs.name).toBe("MySheet");
    expect(oleObj.attrs.showAsIcon).toBe("1");
    expect(oleObj.attrs.imgW).toBe("914400");
    expect(oleObj.attrs.imgH).toBe("457200");
  });

  it("throws when resourceId is missing", () => {
    const frame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "111", name: "OLE" },
      transform: makeTransform(),
      content: {
        type: "oleObject",
        data: { progId: "Excel.Sheet.12" } as never,
      },
    };
    expect(() => serializeGraphicFrame(frame)).toThrow("resourceId is required");
  });

  it("throws when progId is missing", () => {
    const frame: GraphicFrame = {
      type: "graphicFrame",
      nonVisual: { id: "112", name: "OLE" },
      transform: makeTransform(),
      content: {
        type: "oleObject",
        data: { resourceId: "rId1" } as never,
      },
    };
    expect(() => serializeGraphicFrame(frame)).toThrow("progId is required");
  });
});

// ---------------------------------------------------------------------------
// serializeGeometry
// ---------------------------------------------------------------------------

describe("serializeGeometry", () => {
  it("serializes preset geometry", () => {
    const xml = serializeGeometry({ type: "preset", preset: "ellipse", adjustValues: [] });
    expect(xml.name).toBe("a:prstGeom");
    expect(xml.attrs.prst).toBe("ellipse");
    expect(getChild(xml, "a:avLst")).toBeDefined();
  });

  it("serializes preset geometry with adjust values", () => {
    const xml = serializeGeometry({
      type: "preset",
      preset: "roundRect",
      adjustValues: [{ name: "adj", value: 16667 }],
    });
    const avLst = getChild(xml, "a:avLst")!;
    const gd = getChildren(avLst, "a:gd");
    expect(gd).toHaveLength(1);
    expect(gd[0].attrs.name).toBe("adj");
    expect(gd[0].attrs.fmla).toBe("val 16667");
  });

  it("serializes custom geometry with guides and connectionSites", () => {
    const xml = serializeGeometry({
      type: "custom",
      paths: [
        {
          width: px(100),
          height: px(100),
          fill: "norm",
          stroke: true,
          extrusionOk: false,
          commands: [
            { type: "moveTo", point: { x: px(0), y: px(0) } },
            { type: "lineTo", point: { x: px(100), y: px(0) } },
            { type: "close" },
          ],
        },
      ],
      guides: [{ name: "g0", formula: "+/ 100 200 2" }],
      connectionSites: [{ angle: deg(0), position: { x: px(50), y: px(0) } }],
    });
    expect(xml.name).toBe("a:custGeom");
    const gdLst = getChild(xml, "a:gdLst")!;
    const gds = getChildren(gdLst, "a:gd");
    expect(gds).toHaveLength(1);
    expect(gds[0].attrs.fmla).toBe("+/ 100 200 2");

    const cxnLst = getChild(xml, "a:cxnLst")!;
    const cxns = getChildren(cxnLst, "a:cxn");
    expect(cxns).toHaveLength(1);
    expect(cxns[0].attrs.ang).toBe("0");
  });

  it("serializes custom geometry with textRect", () => {
    const xml = serializeGeometry({
      type: "custom",
      paths: [
        {
          width: px(100),
          height: px(100),
          fill: "norm",
          stroke: true,
          extrusionOk: false,
          commands: [],
        },
      ],
      textRect: { left: "l", top: "t", right: "r", bottom: "b" },
    });
    const rect = getChild(xml, "a:rect")!;
    expect(rect.attrs.l).toBe("l");
    expect(rect.attrs.t).toBe("t");
    expect(rect.attrs.r).toBe("r");
    expect(rect.attrs.b).toBe("b");
  });

  it("serializes custom geometry with adjust values", () => {
    const xml = serializeGeometry({
      type: "custom",
      paths: [
        {
          width: px(100),
          height: px(100),
          fill: "norm",
          stroke: true,
          extrusionOk: false,
          commands: [],
        },
      ],
      adjustValues: [{ name: "adj1", value: 50000 }],
    });
    const avLst = getChild(xml, "a:avLst")!;
    const gds = getChildren(avLst, "a:gd");
    expect(gds).toHaveLength(1);
    expect(gds[0].attrs.fmla).toBe("val 50000");
  });
});

// ---------------------------------------------------------------------------
// serializeGeometryPath + serializePathCommand
// ---------------------------------------------------------------------------

describe("serializeGeometryPath and path commands", () => {
  function makeCustomGeomWithCommands(
    ...commands: PathCommand[]
  ) {
    return serializeGeometry({
      type: "custom",
      paths: [
        {
          width: px(200),
          height: px(200),
          fill: "lighten",
          stroke: false,
          extrusionOk: true,
          commands,
        },
      ],
    });
  }

  it("serializes path fill, stroke, extrusionOk attrs", () => {
    const xml = makeCustomGeomWithCommands();
    const pathLst = getChild(xml, "a:pathLst")!;
    const path = getChildren(pathLst, "a:path")[0];
    expect(path.attrs.fill).toBe("lighten");
    expect(path.attrs.stroke).toBe("0");
    expect(path.attrs.extrusionOk).toBe("1");
  });

  it("serializes moveTo command", () => {
    const xml = makeCustomGeomWithCommands({ type: "moveTo", point: { x: px(10), y: px(20) } });
    const pathLst = getChild(xml, "a:pathLst")!;
    const path = getChildren(pathLst, "a:path")[0];
    const moveTo = getChild(path, "a:moveTo")!;
    const pt = getChild(moveTo, "a:pt")!;
    expect(pt.attrs.x).toBe(e(10));
    expect(pt.attrs.y).toBe(e(20));
  });

  it("serializes lineTo command", () => {
    const xml = makeCustomGeomWithCommands({ type: "lineTo", point: { x: px(50), y: px(50) } });
    const pathLst = getChild(xml, "a:pathLst")!;
    const path = getChildren(pathLst, "a:path")[0];
    expect(getChild(path, "a:lnTo")).toBeDefined();
  });

  it("serializes arcTo command", () => {
    const xml = makeCustomGeomWithCommands({
      type: "arcTo",
      widthRadius: px(100),
      heightRadius: px(50),
      startAngle: deg(0),
      swingAngle: deg(90),
    });
    const pathLst = getChild(xml, "a:pathLst")!;
    const path = getChildren(pathLst, "a:path")[0];
    const arcTo = getChild(path, "a:arcTo")!;
    expect(arcTo.attrs.wR).toBe(e(100));
    expect(arcTo.attrs.hR).toBe(e(50));
    expect(arcTo.attrs.stAng).toBe("0");
    expect(arcTo.attrs.swAng).toBe("5400000");
  });

  it("serializes quadBezierTo command", () => {
    const xml = makeCustomGeomWithCommands({
      type: "quadBezierTo",
      control: { x: px(50), y: px(0) },
      end: { x: px(100), y: px(100) },
    });
    const pathLst = getChild(xml, "a:pathLst")!;
    const path = getChildren(pathLst, "a:path")[0];
    const quadBez = getChild(path, "a:quadBezTo")!;
    const pts = getChildren(quadBez, "a:pt");
    expect(pts).toHaveLength(2);
  });

  it("serializes cubicBezierTo command", () => {
    const xml = makeCustomGeomWithCommands({
      type: "cubicBezierTo",
      control1: { x: px(10), y: px(10) },
      control2: { x: px(90), y: px(90) },
      end: { x: px(100), y: px(100) },
    });
    const pathLst = getChild(xml, "a:pathLst")!;
    const path = getChildren(pathLst, "a:path")[0];
    const cubicBez = getChild(path, "a:cubicBezTo")!;
    const pts = getChildren(cubicBez, "a:pt");
    expect(pts).toHaveLength(3);
  });

  it("serializes close command", () => {
    const xml = makeCustomGeomWithCommands({ type: "close" });
    const pathLst = getChild(xml, "a:pathLst")!;
    const path = getChildren(pathLst, "a:path")[0];
    expect(getChild(path, "a:close")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// serializeShapeStyle
// ---------------------------------------------------------------------------

describe("serializeShapeStyle", () => {
  it("serializes all 4 references", () => {
    const shape = createRectShape("120", {
      style: {
        lineReference: { index: 1 },
        fillReference: { index: 2 },
        effectReference: { index: 0 },
        fontReference: { index: "minor" },
      },
    });
    const xml = serializeShape(shape);
    const style = getChild(xml, "p:style")!;
    expect(getChild(style, "a:lnRef")?.attrs.idx).toBe("1");
    expect(getChild(style, "a:fillRef")?.attrs.idx).toBe("2");
    expect(getChild(style, "a:effectRef")?.attrs.idx).toBe("0");
    expect(getChild(style, "a:fontRef")?.attrs.idx).toBe("minor");
  });

  it("serializes color on style references (solidFill)", () => {
    const shape = createRectShape("121", {
      style: {
        lineReference: {
          index: 1,
          color: { type: "solidFill", color: { spec: { type: "srgb", value: "FF0000" } } },
        },
      },
    });
    const xml = serializeShape(shape);
    const style = getChild(xml, "p:style")!;
    const lnRef = getChild(style, "a:lnRef")!;
    expect(getChild(lnRef, "a:srgbClr")?.attrs.val).toBe("FF0000");
  });

  it("throws for non-solidFill color on style reference", () => {
    const shape = createRectShape("122", {
      style: {
        lineReference: {
          index: 1,
          color: {
            type: "gradientFill",
            stops: [
              { position: pct(0), color: { spec: { type: "srgb", value: "000000" } } },
              { position: pct(100), color: { spec: { type: "srgb", value: "FFFFFF" } } },
            ],
          } as never,
        },
      },
    });
    expect(() => serializeShape(shape)).toThrow("only solidFill is supported");
  });

  it("serializes fontReference with color", () => {
    const shape = createRectShape("123", {
      style: {
        fontReference: {
          index: "major",
          color: { type: "solidFill", color: { spec: { type: "srgb", value: "0000FF" } } },
        },
      },
    });
    const xml = serializeShape(shape);
    const style = getChild(xml, "p:style")!;
    const fontRef = getChild(style, "a:fontRef")!;
    expect(fontRef.attrs.idx).toBe("major");
    expect(getChild(fontRef, "a:srgbClr")?.attrs.val).toBe("0000FF");
  });

  it("throws for non-solidFill color on fontReference", () => {
    const shape = createRectShape("124", {
      style: {
        fontReference: {
          index: "minor",
          color: {
            type: "gradientFill",
            stops: [],
          } as never,
        },
      },
    });
    expect(() => serializeShape(shape)).toThrow("only solidFill is supported for a:fontRef");
  });

  it("fontReference without color has no children", () => {
    const shape = createRectShape("125", {
      style: {
        fontReference: { index: "none" },
      },
    });
    const xml = serializeShape(shape);
    const style = getChild(xml, "p:style")!;
    const fontRef = getChild(style, "a:fontRef")!;
    expect(fontRef.children.filter((c) => isXmlElement(c))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// serializeTransformOrDefault / serializeGroupTransformOrDefault
// ---------------------------------------------------------------------------

describe("transform defaults", () => {
  it("picture uses default transform when undefined", () => {
    const pic: PicShape = {
      type: "pic",
      nonVisual: { id: "130", name: "Pic" },
      blipFill: { resourceId: "rId1", stretch: true },
      properties: {},
    };
    const xml = serializePicture(pic);
    const spPr = getChild(xml, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    expect(getChild(xfrm, "a:off")?.attrs.x).toBe("0");
    expect(getChild(xfrm, "a:off")?.attrs.y).toBe("0");
    expect(getChild(xfrm, "a:ext")?.attrs.cx).toBe("0");
    expect(getChild(xfrm, "a:ext")?.attrs.cy).toBe("0");
  });

  it("connection uses default transform when undefined", () => {
    const cxn: CxnShape = {
      type: "cxnSp",
      nonVisual: { id: "131", name: "Cxn" },
      properties: {},
    };
    const xml = serializeConnectionShape(cxn);
    const spPr = getChild(xml, "p:spPr")!;
    const xfrm = getChild(spPr, "a:xfrm")!;
    expect(getChild(xfrm, "a:off")?.attrs.x).toBe("0");
    expect(getChild(xfrm, "a:ext")?.attrs.cx).toBe("0");
  });
});
