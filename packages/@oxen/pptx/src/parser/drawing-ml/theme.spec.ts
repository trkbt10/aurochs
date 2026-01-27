/**
 * @file Tests for theme parser functions
 */

import { parseXml } from "@oxen/xml";
import { parseCustomColorList, parseExtraColorSchemes, parseObjectDefaults } from "./theme";

describe("parseCustomColorList", () => {
  it("parses custom colors from theme", () => {
    const themeXml = `
      <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Test">
        <a:themeElements>
          <a:custClrLst>
            <a:custClr name="Brand Blue">
              <a:srgbClr val="112233"/>
            </a:custClr>
            <a:custClr name="System Text">
              <a:sysClr val="windowText" lastClr="000000"/>
            </a:custClr>
          </a:custClrLst>
        </a:themeElements>
      </a:theme>
    `;

    const doc = parseXml(themeXml);
    const result = parseCustomColorList(doc);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "Brand Blue", color: "112233", type: "srgb" });
    expect(result[1]).toEqual({
      name: "System Text",
      color: "000000",
      type: "system",
      systemColor: "windowText",
    });
  });
});

describe("parseObjectDefaults", () => {
  it("parses object defaults from theme", () => {
    const themeXml = `
      <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Test">
        <a:themeElements>
          <a:objectDefaults>
            <a:lnDef><a:spPr/></a:lnDef>
            <a:spDef><a:spPr/></a:spDef>
            <a:txDef><a:bodyPr/></a:txDef>
          </a:objectDefaults>
        </a:themeElements>
      </a:theme>
    `;

    const doc = parseXml(themeXml);
    const result = parseObjectDefaults(doc);

    expect(result.lineDefault?.name).toBe("a:lnDef");
    expect(result.shapeDefault?.name).toBe("a:spDef");
    expect(result.textDefault?.name).toBe("a:txDef");
  });
});

describe("parseExtraColorSchemes", () => {
  it("parses extra color scheme list from theme", () => {
    const themeXml = `
      <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Test">
        <a:extraClrSchemeLst>
          <a:extraClrScheme>
            <a:clrScheme name="AltScheme">
              <a:dk1><a:srgbClr val="111111"/></a:dk1>
              <a:lt1><a:srgbClr val="EEEEEE"/></a:lt1>
            </a:clrScheme>
            <a:clrMap bg1="lt1" tx1="dk1"/>
          </a:extraClrScheme>
        </a:extraClrSchemeLst>
      </a:theme>
    `;

    const doc = parseXml(themeXml);
    const result = parseExtraColorSchemes(doc);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("AltScheme");
    expect(result[0]?.colorScheme.dk1).toBe("111111");
    expect(result[0]?.colorScheme.lt1).toBe("EEEEEE");
    expect(result[0]?.colorMap.bg1).toBe("lt1");
    expect(result[0]?.colorMap.tx1).toBe("dk1");
  });
});
