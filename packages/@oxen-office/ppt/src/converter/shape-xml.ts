/**
 * @file Shape XML generation for PPTX slides
 */

import type { PptShape, PptFill, PptLine, PptTransform, PptTable } from "../domain/types";
import { buildTextBodyXml } from "./text-xml";
import { escapeXml } from "./presentation-xml";

let _shapeIdCounter = 2; // Start at 2 (1 is reserved for group container)

export function resetShapeIdCounter(): void {
  _shapeIdCounter = 2;
}

function nextShapeId(): number {
  return _shapeIdCounter++;
}

/**
 * Generate XML for a shape within a slide's shape tree.
 */
export function buildShapeXml(
  shape: PptShape,
  imageRefs?: Map<number, string>, // pictureIndex → rId
  hyperlinks?: Map<string, string>, // URL → rId
): string {
  switch (shape.type) {
    case "picture":
      return buildPictureXml(shape, imageRefs);
    case "group":
      return buildGroupXml(shape, imageRefs, hyperlinks);
    case "connector":
      return buildConnectorXml(shape);
    case "table":
      return buildTableXml(shape);
    default:
      return buildSpShapeXml(shape, hyperlinks);
  }
}

function buildSpShapeXml(shape: PptShape, hyperlinks?: Map<string, string>): string {
  const id = nextShapeId();
  const name = shape.name ?? `Shape ${id}`;

  const nvSpPr = (
    `<p:nvSpPr>` +
    `<p:cNvPr id="${id}" name="${escapeXml(name)}"/>` +
    `<p:cNvSpPr/>` +
    `<p:nvPr/>` +
    `</p:nvSpPr>`
  );

  const spPr = buildShapeProperties(shape);
  const txBody = shape.textBody ? buildTextBodyXml(shape.textBody, hyperlinks) : "";

  return `<p:sp>${nvSpPr}${spPr}${txBody}</p:sp>`;
}

function buildPictureXml(shape: PptShape, imageRefs?: Map<number, string>): string {
  const id = nextShapeId();
  const name = shape.name ?? `Picture ${id}`;
  const rId = shape.picture && imageRefs ? imageRefs.get(shape.picture.pictureIndex) : undefined;

  if (!rId) {
    // No image reference, render as empty shape
    return buildSpShapeXml({ ...shape, type: "shape" });
  }

  const nvPicPr = (
    `<p:nvPicPr>` +
    `<p:cNvPr id="${id}" name="${escapeXml(name)}"/>` +
    `<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>` +
    `<p:nvPr/>` +
    `</p:nvPicPr>`
  );

  // BlipFill with crop
  let blipFill = `<p:blipFill><a:blip r:embed="${rId}"/>`;
  if (shape.picture && hasCrop(shape.picture)) {
    const p = shape.picture;
    blipFill += `<a:srcRect l="${pct(p.cropLeft)}" t="${pct(p.cropTop)}" r="${pct(p.cropRight)}" b="${pct(p.cropBottom)}"/>`;
  }
  blipFill += `<a:stretch><a:fillRect/></a:stretch></p:blipFill>`;

  const spPr = buildTransformXml(shape.transform) + `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`;

  return `<p:pic>${nvPicPr}${blipFill}<p:spPr>${spPr}</p:spPr></p:pic>`;
}

function buildGroupXml(shape: PptShape, imageRefs?: Map<number, string>, hyperlinks?: Map<string, string>): string {
  const id = nextShapeId();
  const name = shape.name ?? `Group ${id}`;

  const nvGrpSpPr = (
    `<p:nvGrpSpPr>` +
    `<p:cNvPr id="${id}" name="${escapeXml(name)}"/>` +
    `<p:cNvGrpSpPr/>` +
    `<p:nvPr/>` +
    `</p:nvGrpSpPr>`
  );

  const t = shape.transform;
  const grpSpPr = (
    `<p:grpSpPr>` +
    `<a:xfrm>` +
    `<a:off x="${t.xEmu}" y="${t.yEmu}"/>` +
    `<a:ext cx="${t.widthEmu}" cy="${t.heightEmu}"/>` +
    `<a:chOff x="${t.xEmu}" y="${t.yEmu}"/>` +
    `<a:chExt cx="${t.widthEmu}" cy="${t.heightEmu}"/>` +
    `</a:xfrm></p:grpSpPr>`
  );

  const childShapes = (shape.children ?? []).map(c => buildShapeXml(c, imageRefs, hyperlinks)).join("");

  return `<p:grpSp>${nvGrpSpPr}${grpSpPr}${childShapes}</p:grpSp>`;
}

function buildConnectorXml(shape: PptShape): string {
  const id = nextShapeId();
  const name = shape.name ?? `Connector ${id}`;
  const preset = shape.presetShape ?? "straightConnector1";

  const nvCxnSpPr = (
    `<p:nvCxnSpPr>` +
    `<p:cNvPr id="${id}" name="${escapeXml(name)}"/>` +
    `<p:cNvCxnSpPr/>` +
    `<p:nvPr/>` +
    `</p:nvCxnSpPr>`
  );

  const spPr = buildShapeProperties({ ...shape, presetShape: preset as PptShape["presetShape"] });

  return `<p:cxnSp>${nvCxnSpPr}${spPr}</p:cxnSp>`;
}

function buildTableXml(shape: PptShape): string {
  if (!shape.table) return buildSpShapeXml({ ...shape, type: "shape" });

  const id = nextShapeId();
  const name = shape.name ?? `Table ${id}`;
  const t = shape.transform;

  const nvGraphicFramePr = (
    `<p:nvGraphicFramePr>` +
    `<p:cNvPr id="${id}" name="${escapeXml(name)}"/>` +
    `<p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>` +
    `<p:nvPr/>` +
    `</p:nvGraphicFramePr>`
  );

  const xfrm = `<p:xfrm><a:off x="${t.xEmu}" y="${t.yEmu}"/><a:ext cx="${t.widthEmu}" cy="${t.heightEmu}"/></p:xfrm>`;

  const tbl = buildTableContentXml(shape.table);

  return (
    `<p:graphicFrame>${nvGraphicFramePr}${xfrm}` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">` +
    tbl +
    `</a:graphicData></a:graphic></p:graphicFrame>`
  );
}

function buildTableContentXml(table: PptTable): string {
  const gridCols = table.columnWidthsEmu.map(w => `<a:gridCol w="${w}"/>`).join("");

  const rows = table.rows.map(row => {
    const cells = row.cells.map(cell => {
      const attrs: string[] = [];
      if (cell.colSpan && cell.colSpan > 1) attrs.push(`gridSpan="${cell.colSpan}"`);
      if (cell.rowSpan && cell.rowSpan > 1) attrs.push(`rowSpan="${cell.rowSpan}"`);

      const txBody = cell.text
        ? buildTextBodyXml(cell.text)
        : `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody>`;

      const tcPr = cell.fill ? `<a:tcPr>${buildFillXml(cell.fill)}</a:tcPr>` : `<a:tcPr/>`;

      return `<a:tc${attrs.length > 0 ? " " + attrs.join(" ") : ""}>${txBody}${tcPr}</a:tc>`;
    }).join("");

    return `<a:tr h="${row.heightEmu}">${cells}</a:tr>`;
  }).join("");

  return `<a:tbl><a:tblPr/><a:tblGrid>${gridCols}</a:tblGrid>${rows}</a:tbl>`;
}

function buildShapeProperties(shape: PptShape): string {
  const parts: string[] = [];

  parts.push(buildTransformXml(shape.transform));

  // Geometry
  const preset = shape.presetShape ?? "rect";
  parts.push(`<a:prstGeom prst="${preset}"><a:avLst/></a:prstGeom>`);

  // Fill
  if (shape.fill) {
    parts.push(buildFillXml(shape.fill));
  }

  // Line
  if (shape.line) {
    parts.push(buildLineXml(shape.line));
  }

  return `<p:spPr>${parts.join("")}</p:spPr>`;
}

function buildTransformXml(t: PptTransform): string {
  const attrs: string[] = [];
  if (t.rotation && t.rotation !== 0) {
    attrs.push(`rot="${Math.round(t.rotation * 60000)}"`);
  }
  if (t.flipH) attrs.push(`flipH="1"`);
  if (t.flipV) attrs.push(`flipV="1"`);

  return (
    `<a:xfrm${attrs.length > 0 ? " " + attrs.join(" ") : ""}>` +
    `<a:off x="${t.xEmu}" y="${t.yEmu}"/>` +
    `<a:ext cx="${t.widthEmu}" cy="${t.heightEmu}"/>` +
    `</a:xfrm>`
  );
}

function buildFillXml(fill: PptFill): string {
  switch (fill.type) {
    case "none":
      return `<a:noFill/>`;
    case "solid":
      return `<a:solidFill><a:srgbClr val="${fill.color}"/></a:solidFill>`;
    case "gradient": {
      const stops = fill.stops.map(s =>
        `<a:gs pos="${Math.round(s.position * 100000)}"><a:srgbClr val="${s.color}"/></a:gs>`
      ).join("");
      return (
        `<a:gradFill><a:gsLst>${stops}</a:gsLst>` +
        `<a:lin ang="${Math.round(fill.angle * 60000)}" scaled="1"/></a:gradFill>`
      );
    }
  }
}

function buildLineXml(line: PptLine): string {
  const attrs: string[] = [];
  attrs.push(`w="${line.widthEmu}"`);

  const children: string[] = [];
  if (line.color) {
    children.push(`<a:solidFill><a:srgbClr val="${line.color}"/></a:solidFill>`);
  }

  if (line.dashStyle && line.dashStyle !== "solid") {
    const dashMap: Record<string, string> = {
      dash: "dash",
      dot: "dot",
      dashDot: "dashDot",
      dashDotDot: "lgDashDotDot",
    };
    children.push(`<a:prstDash val="${dashMap[line.dashStyle] ?? "solid"}"/>`);
  }

  return `<a:ln ${attrs.join(" ")}>${children.join("")}</a:ln>`;
}

function hasCrop(p: { cropLeft?: number; cropTop?: number; cropRight?: number; cropBottom?: number }): boolean {
  return !!(p.cropLeft || p.cropTop || p.cropRight || p.cropBottom);
}

function pct(value?: number): string {
  if (!value) return "0";
  return String(Math.round(value * 100000));
}
