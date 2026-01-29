/**
 * @file Minimal DrawingML text parser for ChartML
 *
 * Charts embed DrawingML rich text under elements like:
 * - c:tx/c:rich
 * - c:txPr
 *
 * This parser intentionally handles a minimal subset needed for chart editing
 * and basic rendering: paragraphs, runs, and core run properties.
 */

import type { Paragraph, ParagraphProperties, RunProperties, TextBody, TextRun } from "../domain/text";
import { pt } from "@oxen-office/ooxml/domain/units";
import { parseBoolean, parseInt32 } from "@oxen-office/ooxml/parser";
import { parseColorFromParent } from "@oxen-office/ooxml/parser/drawing-ml";
import {
  getAttr,
  getChild,
  getChildren,
  getTextContent,
  isXmlElement,
  type XmlElement,
} from "@oxen/xml";

function parseFontSize(value: string | undefined): RunProperties["fontSize"] {
  const num = parseInt32(value);
  if (num === undefined) {return undefined;}
  return pt(num / 100);
}

function mapParagraphAlignment(algn: string | undefined): ParagraphProperties["alignment"] {
  switch (algn) {
    case "l": return "left";
    case "ctr": return "center";
    case "r": return "right";
    case "just": return "justify";
    case "justLow": return "justifyLow";
    case "dist": return "distributed";
    case "thaiDist": return "thaiDistributed";
    default: return undefined;
  }
}

export function parseRunProperties(rPr: XmlElement | undefined): RunProperties | undefined {
  if (!rPr) {return undefined;}

  const latin = getChild(rPr, "a:latin");
  const solidFill = getChild(rPr, "a:solidFill");
  const color = solidFill ? parseColorFromParent(solidFill) : undefined;

  const bold = parseBoolean(getAttr(rPr, "b"));
  const italic = parseBoolean(getAttr(rPr, "i"));

  const fontSize = parseFontSize(getAttr(rPr, "sz"));
  const fontFamily = latin ? getAttr(latin, "typeface") : undefined;

  const props: RunProperties = {
    fontSize,
    fontFamily,
    bold,
    italic,
    color,
  };

  const hasAny =
    props.fontSize !== undefined ||
    props.fontFamily !== undefined ||
    props.bold !== undefined ||
    props.italic !== undefined ||
    props.color !== undefined;

  return hasAny ? props : undefined;
}

export function parseParagraphProperties(pPr: XmlElement | undefined): ParagraphProperties {
  if (!pPr) {return {};}

  const defRPr = getChild(pPr, "a:defRPr");

  return {
    alignment: mapParagraphAlignment(getAttr(pPr, "algn")),
    defaultRunProperties: parseRunProperties(defRPr),
  };
}

function parseTextRun(child: XmlElement): TextRun | undefined {
  if (child.name !== "a:r" && child.name !== "a:br" && child.name !== "a:fld") {
    return undefined;
  }

  const rPr = getChild(child, "a:rPr");
  const properties = parseRunProperties(rPr);

  if (child.name === "a:br") {
    return { type: "break", properties };
  }

  if (child.name === "a:fld") {
    const t = getChild(child, "a:t");
    return {
      type: "field",
      fieldType: getAttr(child, "type") ?? "",
      id: getAttr(child, "id") ?? "",
      text: t ? getTextContent(t) ?? "" : "",
      properties,
    };
  }

  const t = getChild(child, "a:t");
  return {
    type: "text",
    text: t ? getTextContent(t) ?? "" : "",
    properties,
  };
}

export function parseParagraph(element: XmlElement): Paragraph {
  const pPr = getChild(element, "a:pPr");
  const endParaRPr = getChild(element, "a:endParaRPr");

  const runs: TextRun[] = [];
  for (const child of element.children) {
    if (!isXmlElement(child)) {continue;}
    const run = parseTextRun(child);
    if (run) {runs.push(run);}
  }

  return {
    properties: parseParagraphProperties(pPr),
    runs,
    endProperties: parseRunProperties(endParaRPr),
  };
}

export function parseTextBody(txBody: XmlElement | undefined): TextBody | undefined {
  if (!txBody) {return undefined;}

  const paragraphs: Paragraph[] = [];
  for (const p of getChildren(txBody, "a:p")) {
    paragraphs.push(parseParagraph(p));
  }

  if (paragraphs.length === 0) {
    paragraphs.push({ properties: {}, runs: [] });
  }

  return {
    bodyProperties: {},
    paragraphs,
  };
}

