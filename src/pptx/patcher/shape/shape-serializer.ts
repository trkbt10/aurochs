import { createElement, type XmlElement } from "../../../xml";
import type { Shape, SpShape, GrpShape, PicShape, CxnShape, GraphicFrame, NonVisualProperties, Geometry, PresetGeometry, CustomGeometry, GeometryPath, PathCommand, ConnectionTarget, OleReference } from "../../domain";
import type { Transform, GroupTransform } from "../../domain/geometry";
import type { Table } from "../../domain/table/types";
import { serializeTransform } from "../serializer/transform";
import { serializeColor, serializeDrawingTable, serializeEffects, serializeFill, serializeLine, serializeTextBody } from "../serializer";
import { ooxmlAngleUnits, ooxmlBool, ooxmlEmu, ooxmlPercent100k } from "../../../ooxml/serializer/units";

/**
 * Domain Shape から完全な p:sp 要素を生成する
 *
 * 新規シェイプ追加時に使用。
 * すべての子要素を含む完全なXMLを生成する。
 */
export function serializeShape(shape: Shape): XmlElement {
  switch (shape.type) {
    case "sp":
      return serializeSpShape(shape);
    case "grpSp":
      return serializeGroupShape(shape);
    case "pic":
      return serializePicture(shape);
    case "cxnSp":
      return serializeConnectionShape(shape);
    case "graphicFrame":
      return serializeGraphicFrame(shape);
    case "contentPart":
      throw new Error("serializeShape: contentPart is not supported");
  }
}

/**
 * GroupShape から p:grpSp 要素を生成する
 */
export function serializeGroupShape(group: GrpShape): XmlElement {
  const nvGrpSpPr = createElement("p:nvGrpSpPr", {}, [
    serializeCNvPr(group.nonVisual),
    serializeCNvGrpSpPr(group.nonVisual.groupLocks),
    createElement("p:nvPr"),
  ]);

  const grpSpPrChildren: XmlElement[] = [serializeGroupTransformOrDefault(group.properties.transform)];
  if (group.properties.fill) {
    grpSpPrChildren.push(serializeFill(group.properties.fill));
  }
  const effects = group.properties.effects ? serializeEffects(group.properties.effects) : null;
  if (effects) {
    grpSpPrChildren.push(effects);
  }
  const grpSpPr = createElement("p:grpSpPr", {}, grpSpPrChildren);

  const children = group.children.map(serializeShape);

  return createElement("p:grpSp", {}, [nvGrpSpPr, grpSpPr, ...children]);
}

/**
 * Picture から p:pic 要素を生成する
 */
export function serializePicture(picture: PicShape): XmlElement {
  const nvPicPr = createElement("p:nvPicPr", {}, [
    serializeCNvPr(picture.nonVisual),
    serializeCNvPicPr(picture.nonVisual.preferRelativeResize, picture.nonVisual.pictureLocks),
    createElement("p:nvPr"),
  ]);

  const blipFill = serializePictureBlipFill(picture.blipFill);

  const spPr = createElement("p:spPr", {}, [
    serializeTransformOrDefault(picture.properties.transform),
    createElement("a:prstGeom", { prst: "rect" }, [createElement("a:avLst")]),
    ...serializeShapeStyleElements(picture.properties),
  ]);

  const children: XmlElement[] = [nvPicPr, blipFill, spPr];
  const style = picture.style ? serializeShapeStyle(picture.style) : null;
  if (style) {
    children.push(style);
  }
  return createElement("p:pic", {}, children);
}

/**
 * ConnectionShape から p:cxnSp 要素を生成する
 */
export function serializeConnectionShape(conn: CxnShape): XmlElement {
  const cNvCxnSpPrChildren: XmlElement[] = [];
  if (conn.nonVisual.startConnection) {
    cNvCxnSpPrChildren.push(serializeConnectionTarget("a:stCxn", conn.nonVisual.startConnection));
  }
  if (conn.nonVisual.endConnection) {
    cNvCxnSpPrChildren.push(serializeConnectionTarget("a:endCxn", conn.nonVisual.endConnection));
  }

  const nvCxnSpPr = createElement("p:nvCxnSpPr", {}, [
    serializeCNvPr(conn.nonVisual),
    createElement("p:cNvCxnSpPr", {}, cNvCxnSpPrChildren),
    createElement("p:nvPr"),
  ]);

  const spPr = createElement("p:spPr", {}, [
    serializeTransformOrDefault(conn.properties.transform),
    createElement("a:prstGeom", { prst: "line" }, [createElement("a:avLst")]),
    ...serializeShapeStyleElements(conn.properties),
  ]);

  const children: XmlElement[] = [nvCxnSpPr, spPr];
  const style = conn.style ? serializeShapeStyle(conn.style) : null;
  if (style) {
    children.push(style);
  }
  return createElement("p:cxnSp", {}, children);
}

function serializeSpShape(shape: SpShape): XmlElement {
  const nvSpPr = createElement("p:nvSpPr", {}, [
    serializeCNvPr(shape.nonVisual),
    serializeCNvSpPr(shape.nonVisual.textBox, shape.nonVisual.shapeLocks),
    serializeNvPr(shape.placeholder),
  ]);

  const spPrChildren: XmlElement[] = [];
  if (shape.properties.transform) {
    spPrChildren.push(serializeTransform(shape.properties.transform));
  }
  if (shape.properties.geometry) {
    spPrChildren.push(serializeGeometry(shape.properties.geometry));
  } else {
    spPrChildren.push(createElement("a:prstGeom", { prst: "rect" }, [createElement("a:avLst")]));
  }
  spPrChildren.push(...serializeShapeStyleElements(shape.properties));

  const spPr = createElement("p:spPr", {}, spPrChildren);

  const children: XmlElement[] = [nvSpPr, spPr];
  const style = shape.style ? serializeShapeStyle(shape.style) : null;
  if (style) {
    children.push(style);
  }
  if (shape.textBody) {
    children.push(serializeTextBody(shape.textBody));
  }

  return createElement("p:sp", {}, children);
}

function serializeCNvPr(nonVisual: NonVisualProperties): XmlElement {
  const attrs: Record<string, string> = {
    id: nonVisual.id,
    name: nonVisual.name,
  };
  if (nonVisual.description) {
    attrs.descr = nonVisual.description;
  }
  if (nonVisual.title) {
    attrs.title = nonVisual.title;
  }
  if (nonVisual.hidden !== undefined) {
    attrs.hidden = nonVisual.hidden ? "1" : "0";
  }

  const children: XmlElement[] = [];
  const hlinkClick = serializeNonVisualHyperlink("a:hlinkClick", nonVisual.hyperlink);
  if (hlinkClick) {
    children.push(hlinkClick);
  }
  const hlinkHover = serializeNonVisualHyperlink("a:hlinkHover", nonVisual.hyperlinkHover);
  if (hlinkHover) {
    children.push(hlinkHover);
  }

  return createElement("p:cNvPr", attrs, children);
}

function serializeNonVisualHyperlink(
  name: "a:hlinkClick" | "a:hlinkHover",
  hyperlink: NonVisualProperties["hyperlink"],
): XmlElement | null {
  if (!hyperlink) {
    return null;
  }

  const attrs: Record<string, string> = { "r:id": hyperlink.id };
  if (hyperlink.tooltip !== undefined) {
    attrs.tooltip = hyperlink.tooltip;
  }
  if (hyperlink.action !== undefined) {
    attrs.action = hyperlink.action;
  }

  const children: XmlElement[] = [];
  if (hyperlink.sound) {
    const soundAttrs: Record<string, string> = { "r:embed": hyperlink.sound.embed };
    if (hyperlink.sound.name) {
      soundAttrs.name = hyperlink.sound.name;
    }
    children.push(createElement("a:snd", soundAttrs));
  }

  return createElement(name, attrs, children);
}

function serializeCNvSpPr(
  textBox: SpShape["nonVisual"]["textBox"],
  shapeLocks: SpShape["nonVisual"]["shapeLocks"],
): XmlElement {
  const attrs: Record<string, string> = {};
  if (textBox !== undefined) {
    attrs.txBox = ooxmlBool(textBox);
  }

  const children: XmlElement[] = [];
  const locks = serializeLocksElement("a:spLocks", shapeLocks);
  if (locks) {
    children.push(locks);
  }

  return createElement("p:cNvSpPr", attrs, children);
}

function serializeCNvGrpSpPr(groupLocks: GrpShape["nonVisual"]["groupLocks"]): XmlElement {
  const children: XmlElement[] = [];
  const locks = serializeLocksElement("a:grpSpLocks", groupLocks);
  if (locks) {
    children.push(locks);
  }
  return createElement("p:cNvGrpSpPr", {}, children);
}

function serializeCNvPicPr(
  preferRelativeResize: PicShape["nonVisual"]["preferRelativeResize"],
  pictureLocks: PicShape["nonVisual"]["pictureLocks"],
): XmlElement {
  const attrs: Record<string, string> = {};
  if (preferRelativeResize !== undefined) {
    attrs.preferRelativeResize = ooxmlBool(preferRelativeResize);
  }

  const children: XmlElement[] = [];
  const locks = serializeLocksElement("a:picLocks", pictureLocks);
  if (locks) {
    children.push(locks);
  }

  return createElement("p:cNvPicPr", attrs, children);
}

function serializeLocksElement(
  name: "a:spLocks" | "a:grpSpLocks" | "a:picLocks",
  locks: Record<string, boolean | undefined> | undefined,
): XmlElement | null {
  if (!locks) {
    return null;
  }

  const attrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(locks)) {
    if (value === undefined) {
      continue;
    }
    attrs[key] = ooxmlBool(value);
  }

  if (Object.keys(attrs).length === 0) {
    return null;
  }

  return createElement(name, attrs);
}

function serializePictureBlipFill(blipFill: PicShape["blipFill"]): XmlElement {
  if (!blipFill.resourceId) {
    throw new Error("serializePictureBlipFill: blipFill.resourceId is required");
  }
  if (blipFill.resourceId.startsWith("data:")) {
    throw new Error("serializePictureBlipFill: data: resourceId requires Phase 7 media embedding");
  }

  const attrs: Record<string, string> = {};
  if (blipFill.rotateWithShape !== undefined) {
    attrs.rotWithShape = ooxmlBool(blipFill.rotateWithShape);
  }
  if (blipFill.dpi !== undefined) {
    attrs.dpi = String(blipFill.dpi);
  }

  const blipAttrs: Record<string, string> = { "r:embed": blipFill.resourceId };
  if (blipFill.compressionState) {
    blipAttrs.cstate = blipFill.compressionState;
  }

  const children: XmlElement[] = [createElement("a:blip", blipAttrs)];

  if (blipFill.sourceRect) {
    children.push(
      createElement("a:srcRect", {
        l: ooxmlPercent100k(blipFill.sourceRect.left),
        t: ooxmlPercent100k(blipFill.sourceRect.top),
        r: ooxmlPercent100k(blipFill.sourceRect.right),
        b: ooxmlPercent100k(blipFill.sourceRect.bottom),
      }),
    );
  }

  if (blipFill.tile) {
    children.push(
      createElement("a:tile", {
        tx: ooxmlEmu(blipFill.tile.tx),
        ty: ooxmlEmu(blipFill.tile.ty),
        sx: ooxmlPercent100k(blipFill.tile.sx),
        sy: ooxmlPercent100k(blipFill.tile.sy),
        flip: blipFill.tile.flip,
        algn: blipFill.tile.alignment,
      }),
    );
  } else if (blipFill.stretch) {
    children.push(createElement("a:stretch", {}, [createElement("a:fillRect")]));
  } else {
    throw new Error("serializePictureBlipFill: blipFill requires tile or stretch");
  }

  return createElement("p:blipFill", attrs, children);
}

function serializeShapeStyleElements(properties: SpShape["properties"]): XmlElement[] {
  const children: XmlElement[] = [];

  if (properties.fill) {
    children.push(serializeFill(properties.fill));
  }
  if (properties.line) {
    children.push(serializeLine(properties.line));
  }
  const effects = properties.effects ? serializeEffects(properties.effects) : null;
  if (effects) {
    children.push(effects);
  }

  return children;
}

function serializeShapeStyle(style: NonNullable<SpShape["style"]>): XmlElement | null {
  const children: XmlElement[] = [];

  const lnRef = style.lineReference ? serializeStyleReference("a:lnRef", style.lineReference) : null;
  if (lnRef) {
    children.push(lnRef);
  }
  const fillRef = style.fillReference ? serializeStyleReference("a:fillRef", style.fillReference) : null;
  if (fillRef) {
    children.push(fillRef);
  }
  const effectRef = style.effectReference ? serializeStyleReference("a:effectRef", style.effectReference) : null;
  if (effectRef) {
    children.push(effectRef);
  }
  const fontRef = style.fontReference ? serializeFontReference(style.fontReference) : null;
  if (fontRef) {
    children.push(fontRef);
  }

  if (children.length === 0) {
    return null;
  }

  return createElement("p:style", {}, children);
}

function serializeStyleReference(
  name: "a:lnRef" | "a:fillRef" | "a:effectRef",
  ref: NonNullable<NonNullable<SpShape["style"]>["lineReference"]>,
): XmlElement {
  const attrs: Record<string, string> = { idx: String(ref.index) };
  const children: XmlElement[] = [];
  if (ref.color) {
    if (ref.color.type !== "solidFill") {
      throw new Error(`serializeShapeStyle: only solidFill is supported for ${name} color`);
    }
    children.push(serializeColor(ref.color.color));
  }
  return createElement(name, attrs, children);
}

function serializeFontReference(ref: NonNullable<NonNullable<SpShape["style"]>["fontReference"]>): XmlElement {
  const attrs: Record<string, string> = { idx: String(ref.index) };
  const children: XmlElement[] = [];
  if (ref.color) {
    if (ref.color.type !== "solidFill") {
      throw new Error("serializeShapeStyle: only solidFill is supported for a:fontRef color");
    }
    children.push(serializeColor(ref.color.color));
  }
  return createElement("a:fontRef", attrs, children);
}

function serializeNvPr(placeholder: SpShape["placeholder"]): XmlElement {
  const children: XmlElement[] = [];
  if (placeholder) {
    const attrs: Record<string, string> = {};
    if (placeholder.type) attrs.type = placeholder.type;
    if (placeholder.idx !== undefined) attrs.idx = String(placeholder.idx);
    if (placeholder.size) attrs.sz = placeholder.size;
    if (placeholder.hasCustomPrompt !== undefined) attrs.hasCustomPrompt = placeholder.hasCustomPrompt ? "1" : "0";
    children.push(createElement("p:ph", attrs));
  }
  return createElement("p:nvPr", {}, children);
}

function serializeGroupTransform(transform: GroupTransform): XmlElement {
  const attrs: Record<string, string> = {};
  if (Number(transform.rotation) !== 0) {
    attrs.rot = ooxmlAngleUnits(transform.rotation);
  }
  if (transform.flipH) attrs.flipH = "1";
  if (transform.flipV) attrs.flipV = "1";

  return createElement("a:xfrm", attrs, [
    createElement("a:off", { x: ooxmlEmu(transform.x), y: ooxmlEmu(transform.y) }),
    createElement("a:ext", { cx: ooxmlEmu(transform.width), cy: ooxmlEmu(transform.height) }),
    createElement("a:chOff", { x: ooxmlEmu(transform.childOffsetX), y: ooxmlEmu(transform.childOffsetY) }),
    createElement("a:chExt", { cx: ooxmlEmu(transform.childExtentWidth), cy: ooxmlEmu(transform.childExtentHeight) }),
  ]);
}

export function serializeGeometry(geometry: Geometry): XmlElement {
  switch (geometry.type) {
    case "preset":
      return serializePresetGeometry(geometry);
    case "custom":
      return serializeCustomGeometry(geometry);
  }
}

function serializePresetGeometry(geometry: PresetGeometry): XmlElement {
  const avLstChildren = geometry.adjustValues.map((v) =>
    createElement("a:gd", { name: v.name, fmla: `val ${v.value}` }),
  );

  return createElement("a:prstGeom", { prst: geometry.preset }, [
    createElement("a:avLst", {}, avLstChildren),
  ]);
}

function serializeCustomGeometry(geometry: CustomGeometry): XmlElement {
  const avLst = createElement(
    "a:avLst",
    {},
    (geometry.adjustValues ?? []).map((v) => createElement("a:gd", { name: v.name, fmla: `val ${v.value}` })),
  );
  const gdLst = createElement(
    "a:gdLst",
    {},
    (geometry.guides ?? []).map((g) => createElement("a:gd", { name: g.name, fmla: g.formula })),
  );
  const ahLst = createElement("a:ahLst", {}, []);
  const cxnLst = createElement(
    "a:cxnLst",
    {},
    (geometry.connectionSites ?? []).map((site) =>
      createElement("a:cxn", { ang: ooxmlAngleUnits(site.angle) }, [
        createElement("a:pos", {
          x: ooxmlEmu(site.position.x),
          y: ooxmlEmu(site.position.y),
        }),
      ]),
    ),
  );
  let rect: XmlElement | undefined;
  if (geometry.textRect) {
    rect = createElement("a:rect", {
      l: geometry.textRect.left,
      t: geometry.textRect.top,
      r: geometry.textRect.right,
      b: geometry.textRect.bottom,
    });
  }
  const pathLst = createElement("a:pathLst", {}, geometry.paths.map(serializeGeometryPath));

  const children: XmlElement[] = [avLst, gdLst, ahLst, cxnLst];
  if (rect) {
    children.push(rect);
  }
  children.push(pathLst);

  return createElement("a:custGeom", {}, children);
}

function serializeTransformOrDefault(transform: Transform | undefined): XmlElement {
  if (transform) {
    return serializeTransform(transform);
  }
  return createElement("a:xfrm", {}, [
    createElement("a:off", { x: "0", y: "0" }),
    createElement("a:ext", { cx: "0", cy: "0" }),
  ]);
}

function serializeGroupTransformOrDefault(transform: GroupTransform | undefined): XmlElement {
  if (transform) {
    return serializeGroupTransform(transform);
  }
  return createElement("a:xfrm", {}, [
    createElement("a:off", { x: "0", y: "0" }),
    createElement("a:ext", { cx: "0", cy: "0" }),
    createElement("a:chOff", { x: "0", y: "0" }),
    createElement("a:chExt", { cx: "0", cy: "0" }),
  ]);
}

function serializeGeometryPath(path: GeometryPath): XmlElement {
  const attrs: Record<string, string> = {
    w: ooxmlEmu(path.width),
    h: ooxmlEmu(path.height),
    fill: path.fill,
    stroke: path.stroke ? "1" : "0",
    extrusionOk: path.extrusionOk ? "1" : "0",
  };

  return createElement("a:path", attrs, path.commands.map(serializePathCommand));
}

function serializePathCommand(command: PathCommand): XmlElement {
  switch (command.type) {
    case "moveTo":
      return createElement("a:moveTo", {}, [
        createElement("a:pt", { x: ooxmlEmu(command.point.x), y: ooxmlEmu(command.point.y) }),
      ]);
    case "lineTo":
      return createElement("a:lnTo", {}, [
        createElement("a:pt", { x: ooxmlEmu(command.point.x), y: ooxmlEmu(command.point.y) }),
      ]);
    case "arcTo":
      return createElement("a:arcTo", {
        wR: ooxmlEmu(command.widthRadius),
        hR: ooxmlEmu(command.heightRadius),
        stAng: ooxmlAngleUnits(command.startAngle),
        swAng: ooxmlAngleUnits(command.swingAngle),
      });
    case "quadBezierTo":
      return createElement("a:quadBezTo", {}, [
        createElement("a:pt", { x: ooxmlEmu(command.control.x), y: ooxmlEmu(command.control.y) }),
        createElement("a:pt", { x: ooxmlEmu(command.end.x), y: ooxmlEmu(command.end.y) }),
      ]);
    case "cubicBezierTo":
      return createElement("a:cubicBezTo", {}, [
        createElement("a:pt", { x: ooxmlEmu(command.control1.x), y: ooxmlEmu(command.control1.y) }),
        createElement("a:pt", { x: ooxmlEmu(command.control2.x), y: ooxmlEmu(command.control2.y) }),
        createElement("a:pt", { x: ooxmlEmu(command.end.x), y: ooxmlEmu(command.end.y) }),
      ]);
    case "close":
      return createElement("a:close");
  }
}

function serializeConnectionTarget(name: "a:stCxn" | "a:endCxn", target: ConnectionTarget): XmlElement {
  return createElement(name, { id: target.shapeId, idx: String(target.siteIndex) });
}

// =============================================================================
// GraphicFrame Serialization
// =============================================================================

/**
 * GraphicFrame から p:graphicFrame 要素を生成する
 *
 * 現在はOLEオブジェクトのみサポート。
 * Table/Chart/Diagramは既存のXMLを更新するパターンを使用する。
 *
 * @see ECMA-376 Part 1, Section 19.3.1.21 (p:graphicFrame)
 */
export function serializeGraphicFrame(frame: GraphicFrame): XmlElement {
  const nvGraphicFramePr = createElement("p:nvGraphicFramePr", {}, [
    serializeGraphicFrameCNvPr(frame.nonVisual),
    createElement("p:cNvGraphicFramePr", {}, frame.nonVisual.graphicFrameLocks
      ? [serializeGraphicFrameLocks(frame.nonVisual.graphicFrameLocks)]
      : []),
    createElement("p:nvPr"),
  ]);

  const xfrm = serializeGraphicFrameTransform(frame.transform);

  const graphic = createElement("a:graphic", {
    xmlns: "http://schemas.openxmlformats.org/drawingml/2006/main",
  }, [
    (() => {
      switch (frame.content.type) {
        case "oleObject":
          return serializeOleObjectGraphicData(frame.content.data);
        case "table":
          return serializeTableGraphicData(frame.content.data.table);
        default:
          throw new Error(`serializeGraphicFrame: content type '${frame.content.type}' is not supported for serialization.`);
      }
    })(),
  ]);

  return createElement("p:graphicFrame", {}, [nvGraphicFramePr, xfrm, graphic]);
}

/**
 * GraphicFrame用のcNvPr要素を生成
 */
function serializeGraphicFrameCNvPr(nonVisual: GraphicFrame["nonVisual"]): XmlElement {
  const attrs: Record<string, string> = {
    id: nonVisual.id,
    name: nonVisual.name,
  };
  if (nonVisual.description) {
    attrs.descr = nonVisual.description;
  }
  if (nonVisual.title) {
    attrs.title = nonVisual.title;
  }
  if (nonVisual.hidden !== undefined) {
    attrs.hidden = nonVisual.hidden ? "1" : "0";
  }

  return createElement("p:cNvPr", attrs);
}

/**
 * GraphicFrameLocks要素を生成
 */
function serializeGraphicFrameLocks(locks: NonNullable<GraphicFrame["nonVisual"]["graphicFrameLocks"]>): XmlElement {
  const attrs: Record<string, string> = {};
  if (locks.noGrp !== undefined) attrs.noGrp = ooxmlBool(locks.noGrp);
  if (locks.noDrilldown !== undefined) attrs.noDrilldown = ooxmlBool(locks.noDrilldown);
  if (locks.noSelect !== undefined) attrs.noSelect = ooxmlBool(locks.noSelect);
  if (locks.noChangeAspect !== undefined) attrs.noChangeAspect = ooxmlBool(locks.noChangeAspect);
  if (locks.noMove !== undefined) attrs.noMove = ooxmlBool(locks.noMove);
  if (locks.noResize !== undefined) attrs.noResize = ooxmlBool(locks.noResize);

  return createElement("a:graphicFrameLocks", attrs);
}

/**
 * GraphicFrame用のp:xfrm要素を生成
 */
function serializeGraphicFrameTransform(transform: GraphicFrame["transform"]): XmlElement {
  const attrs: Record<string, string> = {};
  if (transform.rotation && Number(transform.rotation) !== 0) {
    attrs.rot = ooxmlAngleUnits(transform.rotation);
  }
  if (transform.flipH) attrs.flipH = "1";
  if (transform.flipV) attrs.flipV = "1";

  return createElement("p:xfrm", attrs, [
    createElement("a:off", { x: ooxmlEmu(transform.x), y: ooxmlEmu(transform.y) }),
    createElement("a:ext", { cx: ooxmlEmu(transform.width), cy: ooxmlEmu(transform.height) }),
  ]);
}

/**
 * OLEオブジェクト用のa:graphicData要素を生成
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36a (oleObj)
 */
function serializeOleObjectGraphicData(oleRef: OleReference): XmlElement {
  if (!oleRef.resourceId) {
    throw new Error("serializeOleObjectGraphicData: resourceId is required");
  }
  if (!oleRef.progId) {
    throw new Error("serializeOleObjectGraphicData: progId is required");
  }

  const oleObjAttrs: Record<string, string> = {
    "r:id": oleRef.resourceId,
    progId: oleRef.progId,
  };
  if (oleRef.name) {
    oleObjAttrs.name = oleRef.name;
  }
  if (oleRef.showAsIcon !== undefined) {
    oleObjAttrs.showAsIcon = ooxmlBool(oleRef.showAsIcon);
  }
  if (oleRef.imgW !== undefined) {
    oleObjAttrs.imgW = String(oleRef.imgW);
  }
  if (oleRef.imgH !== undefined) {
    oleObjAttrs.imgH = String(oleRef.imgH);
  }

  // Create p:oleObj with p:embed child
  const oleObjChildren: XmlElement[] = [createElement("p:embed")];

  const oleObj = createElement("p:oleObj", oleObjAttrs, oleObjChildren);

  return createElement("a:graphicData", {
    uri: "http://schemas.openxmlformats.org/presentationml/2006/ole",
  }, [oleObj]);
}

function serializeTableGraphicData(table: Table): XmlElement {
  return createElement("a:graphicData", {
    uri: "http://schemas.openxmlformats.org/drawingml/2006/table",
  }, [
    serializeDrawingTable(table),
  ]);
}
