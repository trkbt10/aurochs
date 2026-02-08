/**
 * @file Text body XML generation
 */

import type { PptTextBody, PptTextParagraph, PptTextRun } from "../domain/types";
import { escapeXml } from "./presentation-xml";

/**
 * Generate `<a:txBody>` XML from a PptTextBody.
 */
export function buildTextBodyXml(textBody: PptTextBody, hyperlinks?: Map<string, string>): string {
  const bodyProps = buildBodyProperties(textBody);
  const paragraphs = textBody.paragraphs.map(p => buildParagraphXml(p, hyperlinks)).join("");

  return `<p:txBody>${bodyProps}<a:lstStyle/>${paragraphs}</p:txBody>`;
}

function buildBodyProperties(textBody: PptTextBody): string {
  const attrs: string[] = [];
  if (textBody.anchor) {
    const anchorMap: Record<string, string> = { top: "t", middle: "ctr", bottom: "b" };
    attrs.push(`anchor="${anchorMap[textBody.anchor] ?? "t"}"`);
  }
  if (textBody.wordWrap === false) {
    attrs.push(`wrap="none"`);
  }
  if (textBody.rotation) {
    // Rotation in OOXML is in 60,000ths of a degree
    attrs.push(`rot="${Math.round(textBody.rotation * 60000)}"`);
  }

  return `<a:bodyPr${attrs.length > 0 ? " " + attrs.join(" ") : ""}/>`;
}

function buildParagraphXml(paragraph: PptTextParagraph, hyperlinks?: Map<string, string>): string {
  const pPr = buildParagraphProperties(paragraph);
  const runs = paragraph.runs.map(r => buildRunXml(r, hyperlinks)).join("");
  const endParaRPr = `<a:endParaRPr lang="en-US"/>`;

  return `<a:p>${pPr}${runs}${endParaRPr}</a:p>`;
}

function buildParagraphProperties(paragraph: PptTextParagraph): string {
  const attrs: string[] = [];

  if (paragraph.alignment) {
    const alignMap: Record<string, string> = { left: "l", center: "ctr", right: "r", justify: "just" };
    attrs.push(`algn="${alignMap[paragraph.alignment] ?? "l"}"`);
  }
  if (paragraph.level !== undefined && paragraph.level > 0) {
    attrs.push(`lvl="${paragraph.level}"`);
  }

  const children: string[] = [];

  // Bullet
  if (paragraph.bullet) {
    if (paragraph.bullet.type === "none") {
      children.push(`<a:buNone/>`);
    } else if (paragraph.bullet.type === "char" && paragraph.bullet.char) {
      children.push(`<a:buChar char="${escapeXml(paragraph.bullet.char)}"/>`);
    } else if (paragraph.bullet.type === "autoNumber") {
      children.push(`<a:buAutoNum type="arabicPeriod"/>`);
    }
  }

  // Line spacing
  if (paragraph.lineSpacing !== undefined) {
    if (paragraph.lineSpacing > 0) {
      children.push(`<a:lnSpc><a:spcPct val="${paragraph.lineSpacing * 1000}"/></a:lnSpc>`);
    }
  }

  // Space before/after
  if (paragraph.spaceBefore !== undefined) {
    children.push(`<a:spcBef><a:spcPts val="${Math.abs(paragraph.spaceBefore) * 100}"/></a:spcBef>`);
  }
  if (paragraph.spaceAfter !== undefined) {
    children.push(`<a:spcAft><a:spcPts val="${Math.abs(paragraph.spaceAfter) * 100}"/></a:spcAft>`);
  }

  if (attrs.length === 0 && children.length === 0) {
    return `<a:pPr/>`;
  }

  return `<a:pPr${attrs.length > 0 ? " " + attrs.join(" ") : ""}>${children.join("")}</a:pPr>`;
}

function buildRunXml(run: PptTextRun, hyperlinks?: Map<string, string>): string {
  const rPr = buildRunProperties(run);
  const text = escapeXml(run.text);

  // Handle hyperlinks
  if (run.properties.hyperlink && hyperlinks) {
    const rId = hyperlinks.get(run.properties.hyperlink);
    if (rId) {
      return `<a:r>${rPr}<a:t>${text}</a:t></a:r>`;
    }
  }

  return `<a:r>${rPr}<a:t>${text}</a:t></a:r>`;
}

function buildRunProperties(run: PptTextRun): string {
  const attrs: string[] = [];
  const children: string[] = [];
  const p = run.properties;

  attrs.push(`lang="en-US"`);

  if (p.bold) attrs.push(`b="1"`);
  if (p.italic) attrs.push(`i="1"`);
  if (p.underline) attrs.push(`u="sng"`);
  if (p.strikethrough) attrs.push(`strike="sngStrike"`);
  if (p.fontSize !== undefined) {
    // Font size in OOXML is in hundredths of a point
    attrs.push(`sz="${Math.round(p.fontSize * 100)}"`);
  }

  // Solid fill color
  if (p.color) {
    children.push(`<a:solidFill><a:srgbClr val="${p.color}"/></a:solidFill>`);
  }

  // Font family
  if (p.fontFamily) {
    children.push(`<a:latin typeface="${escapeXml(p.fontFamily)}"/>`);
    children.push(`<a:ea typeface="${escapeXml(p.fontFamily)}"/>`);
  }

  // Hyperlink
  if (p.hyperlink) {
    children.push(`<a:hlinkClick r:id=""/>`);
  }

  return `<a:rPr ${attrs.join(" ")}>${children.join("")}</a:rPr>`;
}
