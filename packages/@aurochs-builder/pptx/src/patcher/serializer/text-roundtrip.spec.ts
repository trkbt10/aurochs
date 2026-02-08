/**
 * @file Text serializer ↔ parser round-trip checks (Phase 5)
 *
 * Verifies that the XML produced by serializers is understood by the existing parser.
 */

import { getChild, isXmlElement } from "@aurochs/xml";
import { pct, pt, px } from "@aurochs-office/drawing-ml/domain/units";
import type { TextBody } from "@aurochs-office/pptx/domain/text";
import { parseTextBody } from "@aurochs-office/pptx/parser/text/text-parser";
import { serializeTextBody } from "./text";

describe("text serialization round-trip (parser compatibility)", () => {
  it("preserves key paragraph/run properties through serialize→parse", () => {
    const body: TextBody = {
      bodyProperties: {
        anchor: "center",
        wrapping: "square",
        overflow: "ellipsis",
        autoFit: { type: "normal", fontScale: pct(80), lineSpaceReduction: pct(10) },
        insets: { left: px(5), top: px(6), right: px(7), bottom: px(8) },
      },
      paragraphs: [
        {
          properties: {
            alignment: "right",
            marginLeft: px(10),
            indent: px(-4),
            lineSpacing: { type: "percent", value: pct(120) },
            bulletStyle: {
              bullet: { type: "auto", scheme: "arabicPeriod", startAt: 3 },
              colorFollowText: true,
              sizeFollowText: true,
              fontFollowText: true,
            },
          },
          runs: [
            {
              type: "text",
              text: "Hello",
              properties: {
                fontSize: pt(24),
                bold: true,
                italic: true,
                underline: "sng",
                strike: "noStrike",
                spacing: px(2),
                color: { spec: { type: "scheme", value: "tx1" } },
                language: "en-US",
              },
            },
            { type: "break" },
            { type: "text", text: "World" },
          ],
          endProperties: {
            language: "en-US",
          },
        },
      ],
    };

    const txBody = serializeTextBody(body);
    const parsed = parseTextBody(txBody);
    expect(parsed).toBeDefined();

    const p0 = parsed!.paragraphs[0]!;
    expect(p0.properties.alignment).toBe("right");
    expect(p0.properties.bulletStyle?.bullet.type).toBe("auto");
    expect(p0.properties.bulletStyle?.bullet).toMatchObject({ scheme: "arabicPeriod", startAt: 3 });

    const run0 = p0.runs[0]!;
    expect(run0.type).toBe("text");
    if (run0.type === "text") {
      expect(run0.text).toBe("Hello");
      expect(run0.properties?.bold).toBe(true);
      expect(run0.properties?.italic).toBe(true);
      expect(run0.properties?.fontSize).toBe(24);
      expect(run0.properties?.color?.spec).toMatchObject({ type: "scheme", value: "tx1" });
    }

    expect(p0.runs[1]?.type).toBe("break");
    expect(p0.runs[2]?.type).toBe("text");
  });

  it("produces p:txBody with required children", () => {
    const body: TextBody = { bodyProperties: {}, paragraphs: [] };
    const txBody = serializeTextBody(body);
    expect(txBody.name).toBe("p:txBody");
    expect(getChild(txBody, "a:bodyPr")).toBeDefined();
    expect(getChild(txBody, "a:lstStyle")).toBeDefined();
    const p = getChild(txBody, "a:p");
    expect(p && isXmlElement(p)).toBe(true);
  });
});
