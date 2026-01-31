/** @file Unit tests for OLE object patching operations */
import { getChild, parseXml } from "@oxen/xml";
import { deg, px } from "@oxen-office/ooxml/domain/units";
import { patchOleObject } from "./ole-patcher";

describe("ole-patcher", () => {
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

  it("updates OLE object position", () => {
    const frame = parseXml(oleFrameXml).children.find((c) => c.type === "element");
    if (!frame || frame.type !== "element") {
      throw new Error("test: missing frame");
    }

    const patched = patchOleObject(frame, [
      {
        type: "transform",
        transform: {
          x: px(10),
          y: px(20),
          width: px(100),
          height: px(200),
          rotation: deg(0),
          flipH: false,
          flipV: false,
        },
      },
    ]);

    const xfrm = getChild(patched, "p:xfrm");
    expect(getChild(xfrm!, "a:off")?.attrs.x).not.toBe("0");
    expect(getChild(xfrm!, "a:off")?.attrs.y).not.toBe("0");
  });

  it("updates OLE object size", () => {
    const frame = parseXml(oleFrameXml).children.find((c) => c.type === "element");
    if (!frame || frame.type !== "element") {
      throw new Error("test: missing frame");
    }

    const patched = patchOleObject(frame, [
      {
        type: "transform",
        transform: {
          x: px(0),
          y: px(0),
          width: px(50),
          height: px(60),
          rotation: deg(0),
          flipH: false,
          flipV: false,
        },
      },
    ]);

    const xfrm = getChild(patched, "p:xfrm");
    expect(getChild(xfrm!, "a:ext")?.attrs.cx).not.toBe("1000");
    expect(getChild(xfrm!, "a:ext")?.attrs.cy).not.toBe("1000");
  });
});

