/**
 * @file Text serializer - property elements (a:bodyPr, a:pPr, a:rPr)
 *
 * Converts domain text property types into DrawingML XML elements.
 */

import { createElement, createText, type XmlElement } from "@aurochs/xml";
import type {
  BodyProperties,
  Bullet,
  BulletStyle,
  Hyperlink,
  HyperlinkMouseOver,
  LineSpacing,
  ParagraphProperties,
  RunProperties,
  TabStop,
} from "@aurochs-office/pptx/domain";
import type { Pixels, Points } from "@aurochs-office/drawing-ml/domain/units";
import { serializeColor } from "./color";
import { serializeEffects } from "./effects";
import { serializeFill } from "./fill";
import { serializeLine } from "./line";
import { ooxmlAngleUnits, ooxmlBool, ooxmlEmu, ooxmlPercent1000 } from "@aurochs-builder/core";

const PT_PER_INCH = 72;
const PX_PER_INCH = 96;

function ooxmlCentipoints(points: Points): string {
  return String(Math.round(points * 100));
}

function ooxmlTextPointUnqualified(pixels: Pixels): string {
  // ST_TextPointUnqualified is in 1/100 pt. Parser converts to pixels via (num/100) * (96/72).
  // Inverse: num = px * (72/96) * 100.
  return String(Math.round(pixels * (PT_PER_INCH / PX_PER_INCH) * 100));
}

function serializeLineSpacing(spacing: LineSpacing, elementName: string): XmlElement {
  switch (spacing.type) {
    case "percent":
      return createElement(elementName, {}, [createElement("a:spcPct", { val: ooxmlPercent1000(spacing.value) })]);
    case "points":
      return createElement(elementName, {}, [createElement("a:spcPts", { val: ooxmlCentipoints(spacing.value) })]);
  }
}

function serializeTabStops(tabs: readonly TabStop[]): XmlElement {
  return createElement(
    "a:tabLst",
    {},
    tabs.map((tab) =>
      createElement("a:tab", {
        pos: ooxmlEmu(tab.position),
        algn: serializeTabStopAlignment(tab.alignment),
      }),
    ),
  );
}

function serializeTabStopAlignment(alignment: TabStop["alignment"]): string {
  switch (alignment) {
    case "left":
      return "l";
    case "center":
      return "ctr";
    case "right":
      return "r";
    case "decimal":
      return "dec";
  }
}

function serializeParagraphAlignment(alignment: NonNullable<ParagraphProperties["alignment"]>): string {
  switch (alignment) {
    case "left":
      return "l";
    case "center":
      return "ctr";
    case "right":
      return "r";
    case "justify":
      return "just";
    case "justifyLow":
      return "justLow";
    case "distributed":
      return "dist";
    case "thaiDistributed":
      return "thaiDist";
  }
}

function serializeFontAlignment(alignment: NonNullable<ParagraphProperties["fontAlignment"]>): string {
  switch (alignment) {
    case "auto":
      return "auto";
    case "top":
      return "t";
    case "center":
      return "ctr";
    case "base":
      return "base";
    case "bottom":
      return "b";
  }
}

function serializeBodyAnchor(anchor: NonNullable<BodyProperties["anchor"]>): string {
  switch (anchor) {
    case "top":
      return "t";
    case "center":
      return "ctr";
    case "bottom":
      return "b";
  }
}

function serializeHyperlinkSound(sound: NonNullable<Hyperlink["sound"]>): XmlElement {
  const attrs: Record<string, string> = { "r:embed": sound.embed };
  if (sound.name) {
    attrs.name = sound.name;
  }
  return createElement("a:snd", attrs);
}

function serializeHyperlink(hlink: Hyperlink): XmlElement {
  const attrs: Record<string, string> = { "r:id": hlink.id };
  if (hlink.tooltip !== undefined) {
    attrs.tooltip = hlink.tooltip;
  }
  if (hlink.action !== undefined) {
    attrs.action = hlink.action;
  }
  const children: XmlElement[] = [];
  if (hlink.sound) {
    children.push(serializeHyperlinkSound(hlink.sound));
  }
  return createElement("a:hlinkClick", attrs, children);
}

function serializeHyperlinkMouseOver(hlink: HyperlinkMouseOver): XmlElement {
  const attrs: Record<string, string> = {};
  if (hlink.id !== undefined) {
    attrs["r:id"] = hlink.id;
  }
  if (hlink.tooltip !== undefined) {
    attrs.tooltip = hlink.tooltip;
  }
  if (hlink.action !== undefined) {
    attrs.action = hlink.action;
  }
  if (hlink.highlightClick !== undefined) {
    attrs.highlightClick = ooxmlBool(hlink.highlightClick);
  }
  if (hlink.endSound !== undefined) {
    attrs.endSnd = ooxmlBool(hlink.endSound);
  }
  const children: XmlElement[] = [];
  if (hlink.sound) {
    children.push(serializeHyperlinkSound(hlink.sound));
  }
  return createElement("a:hlinkMouseOver", attrs, children);
}

function serializeBullet(bullet: Bullet): XmlElement {
  switch (bullet.type) {
    case "none":
      return createElement("a:buNone");
    case "auto": {
      const attrs: Record<string, string> = { type: bullet.scheme };
      if (bullet.startAt !== undefined) {
        attrs.startAt = String(bullet.startAt);
      }
      return createElement("a:buAutoNum", attrs);
    }
    case "char":
      return createElement("a:buChar", { char: bullet.char });
    case "blip":
      return createElement("a:buBlip", {}, [createElement("a:blip", { "r:embed": bullet.resourceId })]);
  }
}

function serializeBulletStyle(style: BulletStyle): XmlElement[] {
  const elements: XmlElement[] = [];

  elements.push(serializeBullet(style.bullet));

  if (style.colorFollowText) {
    elements.push(createElement("a:buClrTx"));
  } else if (style.color) {
    elements.push(createElement("a:buClr", {}, [serializeColor(style.color)]));
  }

  if (style.sizeFollowText) {
    elements.push(createElement("a:buSzTx"));
  } else if (style.sizePercent !== undefined) {
    elements.push(createElement("a:buSzPct", { val: ooxmlPercent1000(style.sizePercent) }));
  } else if (style.sizePoints !== undefined) {
    elements.push(createElement("a:buSzPts", { val: ooxmlCentipoints(style.sizePoints) }));
  }

  if (style.fontFollowText) {
    elements.push(createElement("a:buFontTx"));
  } else if (style.font !== undefined) {
    elements.push(createElement("a:buFont", { typeface: style.font }));
  }

  return elements;
}

function renameElement(element: XmlElement, name: string): XmlElement {
  return { ...element, name };
}

function serializeRunPropertiesElement(
  props: RunProperties,
  elementName: "a:rPr" | "a:endParaRPr" | "a:defRPr",
): XmlElement {
  const attrs: Record<string, string> = {};

  if (props.language !== undefined) {
    attrs.lang = props.language;
  }
  if (props.altLanguage !== undefined) {
    attrs.altLang = props.altLanguage;
  }
  if (props.bookmark !== undefined) {
    attrs.bmk = props.bookmark;
  }

  if (props.fontSize !== undefined) {
    attrs.sz = ooxmlCentipoints(props.fontSize);
  }
  if (props.bold !== undefined) {
    attrs.b = ooxmlBool(props.bold);
  }
  if (props.italic !== undefined) {
    attrs.i = ooxmlBool(props.italic);
  }
  if (props.underline !== undefined) {
    attrs.u = props.underline;
  }
  if (props.strike !== undefined) {
    attrs.strike = props.strike;
  }
  if (props.caps !== undefined) {
    attrs.cap = props.caps;
  }
  if (props.baseline !== undefined) {
    attrs.baseline = String(Math.round(props.baseline));
  }
  if (props.spacing !== undefined) {
    attrs.spc = ooxmlTextPointUnqualified(props.spacing);
  }
  if (props.kerning !== undefined) {
    attrs.kern = ooxmlCentipoints(props.kerning);
  }

  if (props.noProof !== undefined) {
    attrs.noProof = ooxmlBool(props.noProof);
  }
  if (props.dirty !== undefined) {
    attrs.dirty = ooxmlBool(props.dirty);
  }
  if (props.smartTagClean !== undefined) {
    attrs.smtClean = ooxmlBool(props.smartTagClean);
  }
  if (props.error !== undefined) {
    attrs.err = ooxmlBool(props.error);
  }
  if (props.kumimoji !== undefined) {
    attrs.kumimoji = ooxmlBool(props.kumimoji);
  }
  if (props.normalizeHeights !== undefined) {
    attrs.normalizeH = ooxmlBool(props.normalizeHeights);
  }
  if (props.smartTagId !== undefined) {
    attrs.smtId = String(Math.round(props.smartTagId));
  }
  if (props.outline !== undefined) {
    attrs.outline = ooxmlBool(props.outline);
  }
  if (props.shadow !== undefined) {
    attrs.shadow = ooxmlBool(props.shadow);
  }
  if (props.emboss !== undefined) {
    attrs.emboss = ooxmlBool(props.emboss);
  }

  const children: XmlElement[] = [];

  // Fill / color
  if (props.fill !== undefined) {
    children.push(serializeFill(props.fill));
  } else if (props.color !== undefined) {
    children.push(createElement("a:solidFill", {}, [serializeColor(props.color)]));
  }

  // Highlight
  if (props.highlightColor !== undefined) {
    children.push(createElement("a:highlight", {}, [serializeColor(props.highlightColor)]));
  }

  // Underline line/fill (optional)
  if (props.underlineLineFollowText === true) {
    children.push(createElement("a:uLnTx"));
  }
  if (props.underlineFillFollowText === true) {
    children.push(createElement("a:uFillTx"));
  }
  if (props.underlineLine !== undefined) {
    children.push(renameElement(serializeLine(props.underlineLine), "a:uLn"));
  }
  if (props.underlineFill !== undefined) {
    children.push(createElement("a:uFill", {}, [serializeFill(props.underlineFill)]));
  }
  if (props.underlineColor !== undefined && props.underlineLine === undefined) {
    // Best-effort: represent underline color via a:uLn solid fill.
    children.push(
      createElement("a:uLn", {}, [createElement("a:solidFill", {}, [serializeColor(props.underlineColor)])]),
    );
  }

  // Text outline and effects
  if (props.textOutline !== undefined) {
    children.push(serializeLine(props.textOutline));
  }
  if (props.effects !== undefined) {
    const effectEl = serializeEffects(props.effects);
    if (effectEl) {
      children.push(effectEl);
    }
  }

  // Font families
  if (props.fontFamily !== undefined) {
    const attrs: Record<string, string> = { typeface: props.fontFamily };
    if (props.fontFamilyPitchFamily !== undefined) {
      attrs.pitchFamily = String(props.fontFamilyPitchFamily);
    }
    children.push(createElement("a:latin", attrs));
  }
  if (props.fontFamilyEastAsian !== undefined) {
    const attrs: Record<string, string> = { typeface: props.fontFamilyEastAsian };
    if (props.fontFamilyEastAsianPitchFamily !== undefined) {
      attrs.pitchFamily = String(props.fontFamilyEastAsianPitchFamily);
    }
    children.push(createElement("a:ea", attrs));
  }
  if (props.fontFamilyComplexScript !== undefined) {
    const attrs: Record<string, string> = { typeface: props.fontFamilyComplexScript };
    if (props.fontFamilyComplexScriptPitchFamily !== undefined) {
      attrs.pitchFamily = String(props.fontFamilyComplexScriptPitchFamily);
    }
    children.push(createElement("a:cs", attrs));
  }
  if (props.fontFamilySymbol !== undefined) {
    const attrs: Record<string, string> = { typeface: props.fontFamilySymbol };
    if (props.fontFamilySymbolPitchFamily !== undefined) {
      attrs.pitchFamily = String(props.fontFamilySymbolPitchFamily);
    }
    children.push(createElement("a:sym", attrs));
  }

  // Hyperlinks
  if (props.hyperlink) {
    children.push(serializeHyperlink(props.hyperlink));
  }
  if (props.hyperlinkMouseOver) {
    children.push(serializeHyperlinkMouseOver(props.hyperlinkMouseOver));
  }

  // RTL is represented by a child element, not an attribute.
  if (props.rtl === true) {
    children.push(createElement("a:rtl"));
  }

  return createElement(elementName, attrs, children);
}

/** Serialize run properties to a:rPr element */
export function serializeRunProperties(props: RunProperties): XmlElement {
  return serializeRunPropertiesElement(props, "a:rPr");
}

/** Serialize body properties to a:bodyPr element */
export function serializeBodyProperties(props: BodyProperties): XmlElement {
  if (props.textWarp !== undefined) {
    throw new Error("a:bodyPr serialization does not support textWarp yet");
  }
  if (props.scene3d !== undefined || props.shape3d !== undefined) {
    throw new Error("a:bodyPr serialization does not support 3D text properties yet");
  }

  const attrs: Record<string, string> = {};

  if (props.rotation !== undefined) {
    attrs.rot = ooxmlAngleUnits(props.rotation);
  }
  if (props.verticalType !== undefined) {
    attrs.vert = props.verticalType;
  }
  if (props.wrapping !== undefined) {
    attrs.wrap = props.wrapping;
  }
  if (props.anchor !== undefined) {
    attrs.anchor = serializeBodyAnchor(props.anchor);
  }
  if (props.anchorCenter !== undefined) {
    attrs.anchorCtr = ooxmlBool(props.anchorCenter);
  }
  if (props.overflow !== undefined) {
    attrs.horzOverflow = props.overflow;
  }
  if (props.verticalOverflow !== undefined) {
    attrs.vertOverflow = props.verticalOverflow;
  }

  if (props.insets) {
    attrs.lIns = ooxmlEmu(props.insets.left);
    attrs.tIns = ooxmlEmu(props.insets.top);
    attrs.rIns = ooxmlEmu(props.insets.right);
    attrs.bIns = ooxmlEmu(props.insets.bottom);
  }

  if (props.columns !== undefined) {
    attrs.numCol = String(Math.round(props.columns));
  }
  if (props.columnSpacing !== undefined) {
    attrs.spcCol = ooxmlEmu(props.columnSpacing);
  }

  if (props.upright !== undefined) {
    attrs.upright = ooxmlBool(props.upright);
  }
  if (props.compatibleLineSpacing !== undefined) {
    attrs.compatLnSpc = ooxmlBool(props.compatibleLineSpacing);
  }
  if (props.rtlColumns !== undefined) {
    attrs.rtlCol = ooxmlBool(props.rtlColumns);
  }
  if (props.spaceFirstLastPara !== undefined) {
    attrs.spcFirstLastPara = ooxmlBool(props.spaceFirstLastPara);
  }
  if (props.forceAntiAlias !== undefined) {
    attrs.forceAA = ooxmlBool(props.forceAntiAlias);
  }
  if (props.fromWordArt !== undefined) {
    attrs.fromWordArt = ooxmlBool(props.fromWordArt);
  }

  const children: XmlElement[] = [];
  if (props.autoFit) {
    switch (props.autoFit.type) {
      case "none":
        break;
      case "shape":
        children.push(createElement("a:spAutoFit"));
        break;
      case "normal": {
        const autoFitAttrs: Record<string, string> = {};
        if (props.autoFit.fontScale !== undefined) {
          autoFitAttrs.fontScale = ooxmlPercent1000(props.autoFit.fontScale);
        }
        if (props.autoFit.lineSpaceReduction !== undefined) {
          autoFitAttrs.lnSpcReduction = ooxmlPercent1000(props.autoFit.lineSpaceReduction);
        }
        children.push(createElement("a:normAutofit", autoFitAttrs));
        break;
      }
    }
  }

  return createElement("a:bodyPr", attrs, children);
}

/** Serialize paragraph properties to a:pPr element */
export function serializeParagraphProperties(props: ParagraphProperties): XmlElement {
  const attrs: Record<string, string> = {};

  if (props.level !== undefined) {
    attrs.lvl = String(Math.round(props.level));
  }
  if (props.alignment !== undefined) {
    attrs.algn = serializeParagraphAlignment(props.alignment);
  }
  if (props.defaultTabSize !== undefined) {
    attrs.defTabSz = ooxmlEmu(props.defaultTabSize);
  }
  if (props.marginLeft !== undefined) {
    attrs.marL = ooxmlEmu(props.marginLeft);
  }
  if (props.marginRight !== undefined) {
    attrs.marR = ooxmlEmu(props.marginRight);
  }
  if (props.indent !== undefined) {
    attrs.indent = ooxmlEmu(props.indent);
  }
  if (props.rtl !== undefined) {
    attrs.rtl = ooxmlBool(props.rtl);
  }
  if (props.fontAlignment !== undefined) {
    attrs.fontAlgn = serializeFontAlignment(props.fontAlignment);
  }
  if (props.eaLineBreak !== undefined) {
    attrs.eaLnBrk = ooxmlBool(props.eaLineBreak);
  }
  if (props.latinLineBreak !== undefined) {
    attrs.latinLnBrk = ooxmlBool(props.latinLineBreak);
  }
  if (props.hangingPunctuation !== undefined) {
    attrs.hangingPunct = ooxmlBool(props.hangingPunctuation);
  }

  const children: XmlElement[] = [];

  if (props.lineSpacing) {
    children.push(serializeLineSpacing(props.lineSpacing, "a:lnSpc"));
  }
  if (props.spaceBefore) {
    children.push(serializeLineSpacing(props.spaceBefore, "a:spcBef"));
  }
  if (props.spaceAfter) {
    children.push(serializeLineSpacing(props.spaceAfter, "a:spcAft"));
  }

  if (props.bulletStyle) {
    children.push(...serializeBulletStyle(props.bulletStyle));
  }
  if (props.tabStops && props.tabStops.length > 0) {
    children.push(serializeTabStops(props.tabStops));
  }

  if (props.defaultRunProperties) {
    children.push(serializeRunPropertiesElement(props.defaultRunProperties, "a:defRPr"));
  }

  return createElement("a:pPr", attrs, children);
}

/** Serialize end paragraph run properties to a:endParaRPr element */
export function serializeEndParaRunProperties(props: RunProperties): XmlElement {
  return serializeRunPropertiesElement(props, "a:endParaRPr");
}

/** Serialize text content to a:t element */
export function serializeText(text: string): XmlElement {
  const needsPreserve = /(^\s|\s$|\s{2,}|\t)/.test(text);
  const attrs: Record<string, string> = needsPreserve ? { "xml:space": "preserve" } : {};
  return createElement("a:t", attrs, [createText(text)]);
}
