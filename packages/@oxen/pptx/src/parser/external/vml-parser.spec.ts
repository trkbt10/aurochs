/**
 * @file VML parser tests
 */

import { parseXml } from "@oxen/xml";
import { findVmlShapeImage, getVmlRelsPath, normalizeVmlImagePath } from "./vml-parser";

describe("vml-parser", () => {
  it("finds VML image data by shape id and relationship id", () => {
    const vmlXml = parseXml(
      `<xml>
         <v:shape o:spid="_x0000_s1">
           <v:imagedata o:relid="rId1"/>
         </v:shape>
       </xml>`,
    );
    const relsXml = parseXml(
      `<Relationships>
         <Relationship Id="rId1" Target="../media/image1.wmf"/>
       </Relationships>`,
    );

    const result = findVmlShapeImage(vmlXml, relsXml, "_x0000_s1");
    expect(result?.relId).toBe("rId1");
    expect(result?.imagePath).toBe("../media/image1.wmf");
  });

  it("builds VML rels path and normalizes relative image paths", () => {
    const vmlPath = "ppt/drawings/vmlDrawing1.vml";
    const relsPath = getVmlRelsPath(vmlPath);
    expect(relsPath).toBe("ppt/drawings/_rels/vmlDrawing1.vml.rels");

    const normalized = normalizeVmlImagePath(vmlPath, "../media/image1.wmf");
    expect(normalized).toBe("ppt/media/image1.wmf");
  });
});
