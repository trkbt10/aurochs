/** @file Unit tests for OLE object patching operations */
import { createElement, getChild, parseXml, type XmlElement } from "@aurochs/xml";
import { deg, px } from "@aurochs-office/drawing-ml/domain/units";
import type { Transform } from "@aurochs-office/pptx/domain/geometry";
import { patchOleObject, type OleChange } from "./ole-patcher";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMU_PER_PIXEL = 9525;

function makeTransform(overrides: Partial<Record<keyof Transform, number | boolean>> = {}): Transform {
  return {
    x: px(Number(overrides.x ?? 0)),
    y: px(Number(overrides.y ?? 0)),
    width: px(Number(overrides.width ?? 100)),
    height: px(Number(overrides.height ?? 100)),
    rotation: deg(Number(overrides.rotation ?? 0)),
    flipH: Boolean(overrides.flipH ?? false),
    flipV: Boolean(overrides.flipV ?? false),
  };
}

const oleFrameXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:graphicFrame xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
  <p:nvGraphicFramePr>
    <p:cNvPr id="2" name="OLE Object"/>
    <p:cNvGraphicFramePr/>
    <p:nvPr/>
  </p:nvGraphicFramePr>
  <p:xfrm>
    <a:off x="0" y="0"/>
    <a:ext cx="1000" cy="1000"/>
  </p:xfrm>
  <a:graphic>
    <a:graphicData uri="http://schemas.openxmlformats.org/presentationml/2006/ole">
      <mc:AlternateContent>
        <mc:Choice Requires="v">
          <p:oleObj name="Worksheet" r:id="rId3" progId="Excel.Sheet.12"/>
        </mc:Choice>
        <mc:Fallback>
          <p:oleObj name="Worksheet" r:id="rId3" progId="Excel.Sheet.12">
            <p:embed followColorScheme="textAndBackground"/>
          </p:oleObj>
        </mc:Fallback>
      </mc:AlternateContent>
    </a:graphicData>
  </a:graphic>
</p:graphicFrame>`;

function parseFrame(xml: string = oleFrameXml): XmlElement {
  const frame = parseXml(xml).children.find((c) => c.type === "element");
  if (!frame || frame.type !== "element") {
    throw new Error("test: missing frame");
  }
  return frame;
}

/** Recursively find all elements with a given name */
function findAllByName(el: XmlElement, name: string): XmlElement[] {
  const result: XmlElement[] = [];
  if (el.name === name) {
    result.push(el);
  }
  for (const child of el.children) {
    if (child.type === "element") {
      result.push(...findAllByName(child, name));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tests - requireGraphicFrame
// ---------------------------------------------------------------------------

describe("patchOleObject - requireGraphicFrame", () => {
  it("throws when element is not p:graphicFrame", () => {
    const el = createElement("p:sp", {}, []);
    expect(() => patchOleObject(el, [])).toThrow("expected p:graphicFrame, got p:sp");
  });

  it("includes the actual element name in the error", () => {
    const el = createElement("p:pic", {}, []);
    expect(() => patchOleObject(el, [])).toThrow("p:pic");
  });
});

// ---------------------------------------------------------------------------
// Tests - no-op
// ---------------------------------------------------------------------------

describe("patchOleObject - empty changes", () => {
  it("returns same structure for empty changes array", () => {
    const frame = parseFrame();
    const result = patchOleObject(frame, []);
    expect(result.name).toBe("p:graphicFrame");
    // xfrm should be unchanged
    const xfrm = getChild(result, "p:xfrm");
    expect(xfrm).toBeDefined();
    expect(getChild(xfrm!, "a:off")?.attrs.x).toBe("0");
  });
});

// ---------------------------------------------------------------------------
// Tests - transform changes
// ---------------------------------------------------------------------------

describe("patchOleObject - transform", () => {
  it("updates OLE object position", () => {
    const frame = parseFrame();
    const patched = patchOleObject(frame, [
      {
        type: "transform",
        transform: makeTransform({ x: 10, y: 20, width: 100, height: 200 }),
      },
    ]);

    const xfrm = getChild(patched, "p:xfrm");
    expect(xfrm).toBeDefined();
    expect(getChild(xfrm!, "a:off")?.attrs.x).toBe(String(10 * EMU_PER_PIXEL));
    expect(getChild(xfrm!, "a:off")?.attrs.y).toBe(String(20 * EMU_PER_PIXEL));
  });

  it("updates OLE object size", () => {
    const frame = parseFrame();
    const patched = patchOleObject(frame, [
      {
        type: "transform",
        transform: makeTransform({ x: 0, y: 0, width: 50, height: 60 }),
      },
    ]);

    const xfrm = getChild(patched, "p:xfrm");
    expect(getChild(xfrm!, "a:ext")?.attrs.cx).toBe(String(50 * EMU_PER_PIXEL));
    expect(getChild(xfrm!, "a:ext")?.attrs.cy).toBe(String(60 * EMU_PER_PIXEL));
  });

  it("sets rotation on transform", () => {
    const frame = parseFrame();
    const patched = patchOleObject(frame, [
      {
        type: "transform",
        transform: makeTransform({ rotation: 45 }),
      },
    ]);

    const xfrm = getChild(patched, "p:xfrm");
    // 45 degrees * 60000 = 2700000
    expect(xfrm?.attrs.rot).toBe("2700000");
  });

  it("removes rotation attribute when rotation is 0", () => {
    // Start with a frame that has rotation, then set rotation to 0
    const frame = parseFrame();
    const withRotation = patchOleObject(frame, [
      {
        type: "transform",
        transform: makeTransform({ rotation: 45 }),
      },
    ]);
    const xfrm1 = getChild(withRotation, "p:xfrm");
    expect(xfrm1?.attrs.rot).toBe("2700000");

    // Now set rotation back to 0
    const patched = patchOleObject(withRotation, [
      {
        type: "transform",
        transform: makeTransform({ rotation: 0 }),
      },
    ]);
    const xfrm2 = getChild(patched, "p:xfrm");
    expect(xfrm2?.attrs.rot).toBeUndefined();
  });

  it("sets flipH attribute when true", () => {
    const frame = parseFrame();
    const patched = patchOleObject(frame, [
      {
        type: "transform",
        transform: makeTransform({ flipH: true }),
      },
    ]);

    const xfrm = getChild(patched, "p:xfrm");
    expect(xfrm?.attrs.flipH).toBe("1");
  });

  it("sets flipV attribute when true", () => {
    const frame = parseFrame();
    const patched = patchOleObject(frame, [
      {
        type: "transform",
        transform: makeTransform({ flipV: true }),
      },
    ]);

    const xfrm = getChild(patched, "p:xfrm");
    expect(xfrm?.attrs.flipV).toBe("1");
  });

  it("throws when p:xfrm is missing", () => {
    // Construct a graphicFrame without p:xfrm
    const frame = createElement(
      "p:graphicFrame",
      {},
      [
        createElement("p:nvGraphicFramePr"),
        createElement("a:graphic"),
      ],
    );

    expect(() =>
      patchOleObject(frame, [
        { type: "transform", transform: makeTransform() },
      ]),
    ).toThrow("missing p:xfrm");
  });
});

// ---------------------------------------------------------------------------
// Tests - replace (progId) changes
// ---------------------------------------------------------------------------

describe("patchOleObject - replace (progId)", () => {
  it("updates progId on all p:oleObj elements", () => {
    const frame = parseFrame();
    const patched = patchOleObject(frame, [
      {
        type: "replace",
        newData: new ArrayBuffer(0),
        progId: "Word.Document.12",
      },
    ]);

    const oleObjs = findAllByName(patched, "p:oleObj");
    expect(oleObjs.length).toBeGreaterThanOrEqual(2);
    for (const oleObj of oleObjs) {
      expect(oleObj.attrs.progId).toBe("Word.Document.12");
    }
  });

  it("preserves other attributes on p:oleObj", () => {
    const frame = parseFrame();
    const patched = patchOleObject(frame, [
      {
        type: "replace",
        newData: new ArrayBuffer(0),
        progId: "Visio.Drawing.15",
      },
    ]);

    const oleObjs = findAllByName(patched, "p:oleObj");
    for (const oleObj of oleObjs) {
      expect(oleObj.attrs.name).toBe("Worksheet");
      expect(oleObj.attrs["r:id"]).toBe("rId3");
    }
  });

  it("throws when progId is empty string", () => {
    const frame = parseFrame();
    expect(() =>
      patchOleObject(frame, [
        {
          type: "replace",
          newData: new ArrayBuffer(0),
          progId: "",
        },
      ]),
    ).toThrow("progId is required");
  });

  it("throws when a:graphicData is missing", () => {
    const frame = createElement(
      "p:graphicFrame",
      {},
      [
        createElement("p:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "100", cy: "100" }),
        ]),
        createElement("a:graphic", {}, [
          // no a:graphicData child
        ]),
      ],
    );

    expect(() =>
      patchOleObject(frame, [
        {
          type: "replace",
          newData: new ArrayBuffer(0),
          progId: "Excel.Sheet.12",
        },
      ]),
    ).toThrow("missing a:graphicData");
  });

  it("throws when a:graphic is missing entirely", () => {
    const frame = createElement(
      "p:graphicFrame",
      {},
      [
        createElement("p:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "100", cy: "100" }),
        ]),
      ],
    );

    expect(() =>
      patchOleObject(frame, [
        {
          type: "replace",
          newData: new ArrayBuffer(0),
          progId: "Excel.Sheet.12",
        },
      ]),
    ).toThrow("missing a:graphicData");
  });

  it("throws when p:oleObj is missing from a:graphicData", () => {
    const frame = createElement(
      "p:graphicFrame",
      {},
      [
        createElement("p:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "100", cy: "100" }),
        ]),
        createElement("a:graphic", {}, [
          createElement("a:graphicData", {}, [
            // no p:oleObj
            createElement("p:someOtherElement"),
          ]),
        ]),
      ],
    );

    expect(() =>
      patchOleObject(frame, [
        {
          type: "replace",
          newData: new ArrayBuffer(0),
          progId: "Excel.Sheet.12",
        },
      ]),
    ).toThrow("missing p:oleObj");
  });
});

// ---------------------------------------------------------------------------
// Tests - combined / multiple changes
// ---------------------------------------------------------------------------

describe("patchOleObject - multiple changes", () => {
  it("applies transform then replace in sequence", () => {
    const frame = parseFrame();
    const changes: OleChange[] = [
      {
        type: "transform",
        transform: makeTransform({ x: 50, y: 50, width: 200, height: 300 }),
      },
      {
        type: "replace",
        newData: new ArrayBuffer(0),
        progId: "PowerPoint.Slide.12",
      },
    ];

    const patched = patchOleObject(frame, changes);

    // Verify transform was applied
    const xfrm = getChild(patched, "p:xfrm");
    expect(getChild(xfrm!, "a:off")?.attrs.x).toBe(String(50 * EMU_PER_PIXEL));

    // Verify progId was updated
    const oleObjs = findAllByName(patched, "p:oleObj");
    for (const oleObj of oleObjs) {
      expect(oleObj.attrs.progId).toBe("PowerPoint.Slide.12");
    }
  });

  it("applies replace then transform in sequence", () => {
    const frame = parseFrame();
    const changes: OleChange[] = [
      {
        type: "replace",
        newData: new ArrayBuffer(0),
        progId: "Publisher.Document.16",
      },
      {
        type: "transform",
        transform: makeTransform({ x: 25, y: 75, width: 150, height: 250 }),
      },
    ];

    const patched = patchOleObject(frame, changes);

    // Verify both changes took effect
    const xfrm = getChild(patched, "p:xfrm");
    expect(getChild(xfrm!, "a:off")?.attrs.x).toBe(String(25 * EMU_PER_PIXEL));
    expect(getChild(xfrm!, "a:off")?.attrs.y).toBe(String(75 * EMU_PER_PIXEL));

    const oleObjs = findAllByName(patched, "p:oleObj");
    for (const oleObj of oleObjs) {
      expect(oleObj.attrs.progId).toBe("Publisher.Document.16");
    }
  });

  it("applies multiple transform changes, last wins", () => {
    const frame = parseFrame();
    const changes: OleChange[] = [
      {
        type: "transform",
        transform: makeTransform({ x: 10, y: 10 }),
      },
      {
        type: "transform",
        transform: makeTransform({ x: 99, y: 99, width: 500, height: 500 }),
      },
    ];

    const patched = patchOleObject(frame, changes);

    const xfrm = getChild(patched, "p:xfrm");
    expect(getChild(xfrm!, "a:off")?.attrs.x).toBe(String(99 * EMU_PER_PIXEL));
    expect(getChild(xfrm!, "a:off")?.attrs.y).toBe(String(99 * EMU_PER_PIXEL));
    expect(getChild(xfrm!, "a:ext")?.attrs.cx).toBe(String(500 * EMU_PER_PIXEL));
  });

  it("applies multiple replace changes, last progId wins", () => {
    const frame = parseFrame();
    const changes: OleChange[] = [
      {
        type: "replace",
        newData: new ArrayBuffer(0),
        progId: "Word.Document.12",
      },
      {
        type: "replace",
        newData: new ArrayBuffer(0),
        progId: "Visio.Drawing.15",
      },
    ];

    const patched = patchOleObject(frame, changes);

    const oleObjs = findAllByName(patched, "p:oleObj");
    for (const oleObj of oleObjs) {
      expect(oleObj.attrs.progId).toBe("Visio.Drawing.15");
    }
  });
});

// ---------------------------------------------------------------------------
// Tests - structural preservation
// ---------------------------------------------------------------------------

describe("patchOleObject - structural preservation", () => {
  it("preserves p:nvGraphicFramePr", () => {
    const frame = parseFrame();
    const patched = patchOleObject(frame, [
      {
        type: "transform",
        transform: makeTransform({ x: 5, y: 5 }),
      },
    ]);

    const nvPr = getChild(patched, "p:nvGraphicFramePr");
    expect(nvPr).toBeDefined();
    const cNvPr = getChild(nvPr!, "p:cNvPr");
    expect(cNvPr?.attrs.id).toBe("2");
    expect(cNvPr?.attrs.name).toBe("OLE Object");
  });

  it("preserves a:graphic structure when patching transform only", () => {
    const frame = parseFrame();
    const patched = patchOleObject(frame, [
      {
        type: "transform",
        transform: makeTransform({ x: 1, y: 1, width: 1, height: 1 }),
      },
    ]);

    const graphic = getChild(patched, "a:graphic");
    expect(graphic).toBeDefined();
    const graphicData = getChild(graphic!, "a:graphicData");
    expect(graphicData).toBeDefined();
  });

  it("preserves mc:AlternateContent structure within graphicData", () => {
    const frame = parseFrame();
    const patched = patchOleObject(frame, [
      {
        type: "replace",
        newData: new ArrayBuffer(0),
        progId: "New.ProgId.1",
      },
    ]);

    const graphic = getChild(patched, "a:graphic");
    const graphicData = getChild(graphic!, "a:graphicData");
    const altContent = getChild(graphicData!, "mc:AlternateContent");
    expect(altContent).toBeDefined();

    const choice = getChild(altContent!, "mc:Choice");
    expect(choice).toBeDefined();
    const fallback = getChild(altContent!, "mc:Fallback");
    expect(fallback).toBeDefined();
  });

  it("preserves child elements inside p:oleObj (Fallback variant)", () => {
    const frame = parseFrame();
    const patched = patchOleObject(frame, [
      {
        type: "replace",
        newData: new ArrayBuffer(0),
        progId: "Updated.App.1",
      },
    ]);

    // The Fallback p:oleObj has a p:embed child
    const graphic = getChild(patched, "a:graphic");
    const graphicData = getChild(graphic!, "a:graphicData");
    const altContent = getChild(graphicData!, "mc:AlternateContent");
    const fallback = getChild(altContent!, "mc:Fallback");
    const oleObj = getChild(fallback!, "p:oleObj");
    expect(oleObj).toBeDefined();
    const embed = getChild(oleObj!, "p:embed");
    expect(embed).toBeDefined();
    expect(embed?.attrs.followColorScheme).toBe("textAndBackground");
  });
});
