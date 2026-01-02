/**
 * @file Standard shape (p:sp) parser
 *
 * @see ECMA-376 Part 1, Section 19.3.1.43 (p:sp)
 */

import { getChild, type XmlElement } from "../../../xml";
import type { ShapeLocks, SpShape } from "../../domain";
import { resolveFillFromStyleReference } from "../graphics/fill-parser";
import { parseTextBody } from "../text/text-parser";
import type { PlaceholderContext, TextStyleContext, MasterStylesInfo, FormatScheme } from "../context";
import { parseNonVisualProperties, parsePlaceholder } from "./non-visual";
import { resolveLayoutAndMasterNodes, resolvePlaceholderType } from "./placeholder";
import { parseShapeProperties, parseShapePropertiesWithInheritance } from "./properties";
import { parseShapeStyle } from "./style";
import { resolveEffectsFromStyleReference } from "../graphics/effects-parser";
import { getBoolAttr } from "../primitive";

function parseShapeLocksElement(element: XmlElement | undefined): ShapeLocks | undefined {
  if (!element) {
    return undefined;
  }
  const noGrp = getBoolAttr(element, "noGrp");
  const noSelect = getBoolAttr(element, "noSelect");
  const noRot = getBoolAttr(element, "noRot");
  const noChangeAspect = getBoolAttr(element, "noChangeAspect");
  const noMove = getBoolAttr(element, "noMove");
  const noResize = getBoolAttr(element, "noResize");
  const noEditPoints = getBoolAttr(element, "noEditPoints");
  const noAdjustHandles = getBoolAttr(element, "noAdjustHandles");
  const noChangeArrowheads = getBoolAttr(element, "noChangeArrowheads");
  const noChangeShapeType = getBoolAttr(element, "noChangeShapeType");
  const noTextEdit = getBoolAttr(element, "noTextEdit");
  if (
    noGrp === undefined &&
    noSelect === undefined &&
    noRot === undefined &&
    noChangeAspect === undefined &&
    noMove === undefined &&
    noResize === undefined &&
    noEditPoints === undefined &&
    noAdjustHandles === undefined &&
    noChangeArrowheads === undefined &&
    noChangeShapeType === undefined &&
    noTextEdit === undefined
  ) {
    return undefined;
  }
  return {
    noGrp,
    noSelect,
    noRot,
    noChangeAspect,
    noMove,
    noResize,
    noEditPoints,
    noAdjustHandles,
    noChangeArrowheads,
    noChangeShapeType,
    noTextEdit,
  };
}

function parseShapeLocksFromParent(parent: XmlElement | undefined): ShapeLocks | undefined {
  if (!parent) {
    return undefined;
  }
  return parseShapeLocksElement(getChild(parent, "a:spLocks"));
}

function resolveShapePropertiesWithFill(
  properties: ReturnType<typeof parseShapeProperties>,
  shapeStyle: ReturnType<typeof parseShapeStyle>,
  formatScheme: FormatScheme | undefined,
): ReturnType<typeof parseShapeProperties> {
  if (!properties.fill) {
    if (shapeStyle?.fillReference && formatScheme) {
      const resolvedFill = resolveFillFromStyleReference(
        shapeStyle.fillReference,
        formatScheme.fillStyles,
      );
      if (resolvedFill) {
        return { ...properties, fill: resolvedFill };
      }
    }
  }

  return properties;
}

function resolveShapePropertiesWithEffects(
  properties: ReturnType<typeof parseShapeProperties>,
  shapeStyle: ReturnType<typeof parseShapeStyle>,
  formatScheme: FormatScheme | undefined,
): ReturnType<typeof parseShapeProperties> {
  if (!properties.effects) {
    if (shapeStyle?.effectReference && formatScheme) {
      const resolvedEffects = resolveEffectsFromStyleReference(
        shapeStyle.effectReference,
        formatScheme.effectStyles,
      );
      if (resolvedEffects) {
        return { ...properties, effects: resolvedEffects };
      }
    }
  }

  return properties;
}

function resolveShapePropertiesWithStyle(
  properties: ReturnType<typeof parseShapeProperties>,
  shapeStyle: ReturnType<typeof parseShapeStyle>,
  formatScheme: FormatScheme | undefined,
): ReturnType<typeof parseShapeProperties> {
  const withFill = resolveShapePropertiesWithFill(properties, shapeStyle, formatScheme);
  return resolveShapePropertiesWithEffects(withFill, shapeStyle, formatScheme);
}

function buildTextStyleContext(
  ctx: PlaceholderContext | undefined,
  resolvedPlaceholderType: string | undefined,
  placeholderIdx: number | undefined,
  masterStylesInfo: MasterStylesInfo | undefined,
  shapeStyle: ReturnType<typeof parseShapeStyle>,
): TextStyleContext | undefined {
  const shapeFontReferenceColor = getShapeFontReferenceColor(shapeStyle);

  if (ctx !== undefined) {
    return {
      placeholderType: resolvedPlaceholderType,
      placeholderIdx,
      layoutPlaceholders: ctx.layout,
      masterPlaceholders: ctx.master,
      masterTextStyles: masterStylesInfo?.masterTextStyles,
      defaultTextStyle: masterStylesInfo?.defaultTextStyle,
      shapeFontReferenceColor,
    };
  }

  if (shapeFontReferenceColor !== undefined) {
    return {
      // Minimal context with just the shape font reference color
      placeholderType: undefined,
      placeholderIdx: undefined,
      layoutPlaceholders: { byType: {}, byIdx: new Map() },
      masterPlaceholders: { byType: {}, byIdx: new Map() },
      masterTextStyles: undefined,
      defaultTextStyle: undefined,
      shapeFontReferenceColor,
    };
  }

  return undefined;
}

function getShapeFontReferenceColor(
  shapeStyle: ReturnType<typeof parseShapeStyle>,
): TextStyleContext["shapeFontReferenceColor"] {
  const fill = shapeStyle?.fontReference?.color;
  if (fill?.type === "solidFill") {
    return fill.color;
  }
  return undefined;
}

/**
 * Parse standard shape (p:sp) with placeholder inheritance
 * @see ECMA-376 Part 1, Section 19.3.1.43
 */
export function parseSpShape(
  element: XmlElement,
  ctx: PlaceholderContext | undefined,
  masterStylesInfo?: MasterStylesInfo,
  formatScheme?: FormatScheme,
): SpShape | undefined {
  const nvSpPr = getChild(element, "p:nvSpPr");
  const cNvPr = nvSpPr ? getChild(nvSpPr, "p:cNvPr") : undefined;
  const cNvSpPr = nvSpPr ? getChild(nvSpPr, "p:cNvSpPr") : undefined;
  const textBox = getBoolAttr(cNvSpPr, "txBox");

  const spPr = getChild(element, "p:spPr");
  const txBody = getChild(element, "p:txBody");
  const style = getChild(element, "p:style");

  // Extract placeholder info for inheritance resolution
  const placeholder = parsePlaceholder(nvSpPr);
  const { layout, master } = resolveLayoutAndMasterNodes(
    ctx,
    placeholder?.idx,
    placeholder?.type,
  );

  // Parse properties with inheritance if placeholders exist
  const baseProperties = getShapePropertiesWithOptionalInheritance(ctx, spPr, layout, master);

  // Parse shape style for style references
  const shapeStyle = parseShapeStyle(style);

  // Resolve fill/effects from style reference if not directly specified
  // Per ECMA-376 Part 1, Section 19.3.1.46 (p:style):
  // If no fill is specified in spPr, use fillRef from p:style
  const properties = resolveShapePropertiesWithStyle(baseProperties, shapeStyle, formatScheme);

  // Resolve placeholder type from inheritance chain
  // Per ECMA-376 Part 1, Section 19.3.1.36 (p:ph):
  // When type is not specified, inherit from layout or master
  const resolvedPlaceholderType = resolvePlaceholderType(
    placeholder?.type,
    layout,
    master,
  );

  // Extract default text color from shape style's fontReference.
  // Per ECMA-376 Part 1, Section 20.1.4.1.17 (a:fontRef):
  // The fontRef element may contain a color child element that specifies
  // the default text color for the shape's text body.
  // Create text style context for text parsing
  // Per ECMA-376 Part 1, Section 19.3.1.36 (p:ph):
  // Placeholders can be matched by type or idx, so we include both for lookup
  // idx is xsd:unsignedInt per ECMA-376
  //
  // Even when no parse context is available, we still create a minimal
  // text style context if shapeFontReferenceColor is present, so that
  // the fontRef color can be applied as a fallback.
  const textStyleCtx = buildTextStyleContext(
    ctx,
    resolvedPlaceholderType,
    placeholder?.idx,
    masterStylesInfo,
    shapeStyle,
  );

  return {
    type: "sp",
    nonVisual: {
      ...parseNonVisualProperties(cNvPr),
      textBox,
      shapeLocks: parseShapeLocksFromParent(cNvSpPr),
    },
    placeholder,
    properties,
    textBody: parseTextBody(txBody, textStyleCtx),
    style: shapeStyle,
  };
}

function getShapePropertiesWithOptionalInheritance(
  ctx: PlaceholderContext | undefined,
  spPr: XmlElement | undefined,
  layout: XmlElement | undefined,
  master: XmlElement | undefined,
): ReturnType<typeof parseShapeProperties> {
  if (ctx !== undefined) {
    return parseShapePropertiesWithInheritance(spPr, layout, master);
  }
  return parseShapeProperties(spPr);
}
