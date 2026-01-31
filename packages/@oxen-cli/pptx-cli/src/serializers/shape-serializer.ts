/**
 * @file Shape serialization for CLI output
 */

import type {
  Shape,
  PicShape,
  Placeholder,
  GraphicContent,
  TableReference,
  ChartReference,
  DiagramReference,
  Geometry,
  PresetGeometry,
  CustomGeometry,
  ShapeProperties,
  ShapeStyle,
} from "@oxen-office/pptx/domain/shape";
import type { Paragraph, TextRun, ParagraphProperties, RunProperties } from "@oxen-office/pptx/domain/text";
import type { Transform } from "@oxen-office/pptx/domain/geometry";
import type { TableRow, TableCell } from "@oxen-office/pptx/domain/table/types";
import type { Fill, Line } from "@oxen-office/pptx/domain/color/types";
import type { Color } from "@oxen-office/ooxml/domain/color";
import type { BlipEffects } from "@oxen-office/pptx/domain/color/types";
import type { Effects } from "@oxen-office/pptx/domain/effects";
import type { Shape3d } from "@oxen-office/pptx/domain/three-d";
import { extractTextFromShape, extractTextFromParagraph, extractTextFromBody } from "./text-serializer";

// =============================================================================
// Base Types
// =============================================================================

/**
 * Bounds information for a shape
 */
export type BoundsJson = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Paragraph properties for JSON output
 */
export type ParagraphPropertiesJson = {
  readonly level?: number;
  readonly alignment?: string;
  readonly bulletType?: string;
};

/**
 * Run properties for JSON output
 */
export type RunPropertiesJson = {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly fontSize?: number;
  readonly fontFamily?: string;
};

/**
 * Text run for JSON output
 */
export type TextRunJson = {
  readonly type: "text" | "break" | "field";
  readonly text: string;
  readonly properties?: RunPropertiesJson;
};

/**
 * Paragraph for JSON output
 */
export type ParagraphJson = {
  readonly text: string;
  readonly runs: readonly TextRunJson[];
  readonly properties?: ParagraphPropertiesJson;
};

/**
 * Placeholder for JSON output
 */
export type PlaceholderJson = {
  readonly type?: string;
  readonly idx?: number;
};

// =============================================================================
// Geometry Types
// =============================================================================

/**
 * Geometry info for JSON output
 */
export type GeometryJson = {
  readonly kind: "preset" | "custom";
  readonly preset?: string;
  readonly adjustValues?: readonly { name: string; value: number }[];
  readonly pathCount?: number;
};

// =============================================================================
// Fill/Line Types
// =============================================================================

/**
 * Fill info for JSON output
 */
export type FillJson = {
  readonly type: string;
  readonly color?: string;
  readonly resourceId?: string;
};

/**
 * Line info for JSON output
 */
export type LineJson = {
  readonly width?: number;
  readonly color?: string;
  readonly dashStyle?: string;
  readonly compound?: string;
};

/**
 * Effects info for JSON output
 */
export type EffectsJson = {
  readonly shadow?: {
    readonly type?: string;
    readonly color?: string;
    readonly blur?: number;
    readonly distance?: number;
    readonly direction?: number;
  };
  readonly glow?: {
    readonly color?: string;
    readonly radius?: number;
  };
  readonly softEdge?: {
    readonly radius?: number;
  };
};

/**
 * Bevel info for JSON output
 */
export type BevelJson = {
  readonly preset?: string;
  readonly width?: number;
  readonly height?: number;
};

/**
 * 3D shape properties for JSON output
 */
export type Shape3dJson = {
  readonly bevelTop?: BevelJson;
  readonly bevelBottom?: BevelJson;
  readonly material?: string;
  readonly extrusionHeight?: number;
};

// =============================================================================
// Table Types
// =============================================================================

/**
 * Table cell for JSON output
 */
export type TableCellJson = {
  readonly text: string;
  readonly rowSpan?: number;
  readonly colSpan?: number;
};

/**
 * Table row for JSON output
 */
export type TableRowJson = {
  readonly height: number;
  readonly cells: readonly TableCellJson[];
};

/**
 * Table info for JSON output
 */
export type TableJson = {
  readonly rows: number;
  readonly cols: number;
  readonly data: readonly TableRowJson[];
  readonly styleId?: string;
};

// =============================================================================
// Chart Types
// =============================================================================

/**
 * Chart info for JSON output
 */
export type ChartJson = {
  readonly resourceId: string;
};

// =============================================================================
// Diagram Types
// =============================================================================

/**
 * Diagram info for JSON output
 */
export type DiagramJson = {
  readonly dataResourceId?: string;
  readonly layoutResourceId?: string;
  readonly styleResourceId?: string;
  readonly colorResourceId?: string;
};

// =============================================================================
// Graphic Content Types
// =============================================================================

/**
 * Graphic content for JSON output
 */
export type GraphicContentJson =
  | { readonly type: "table"; readonly table: TableJson }
  | { readonly type: "chart"; readonly chart: ChartJson }
  | { readonly type: "diagram"; readonly diagram: DiagramJson }
  | { readonly type: "oleObject"; readonly progId?: string }
  | { readonly type: "unknown"; readonly uri: string };

// =============================================================================
// Shape Style Types
// =============================================================================

/**
 * Shape style reference for JSON output
 */
export type StyleReferenceJson = {
  readonly lineRef?: number;
  readonly fillRef?: number;
  readonly effectRef?: number;
  readonly fontRef?: string;
};

// =============================================================================
// Main Shape Type
// =============================================================================

/**
 * Serialized shape for JSON output
 */
export type ShapeJson = {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly placeholder?: PlaceholderJson;
  readonly bounds?: BoundsJson;
  readonly rotation?: number;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
  readonly text?: string;
  readonly paragraphs?: readonly ParagraphJson[];
  readonly resourceId?: string;
  readonly blipEffects?: BlipEffectsJson;
  readonly mediaType?: "video" | "audio";
  readonly media?: {
    readonly audioFile?: { readonly link?: string; readonly contentType?: string };
    readonly quickTimeFile?: { readonly link?: string };
    readonly videoFile?: { readonly link?: string; readonly contentType?: string };
    readonly wavAudioFile?: { readonly embed?: string; readonly name?: string };
  };
  readonly children?: readonly ShapeJson[];
  readonly geometry?: GeometryJson;
  readonly fill?: FillJson;
  readonly line?: LineJson;
  readonly effects?: EffectsJson;
  readonly shape3d?: Shape3dJson;
  readonly style?: StyleReferenceJson;
  readonly content?: GraphicContentJson;
  readonly connection?: {
    readonly startShapeId?: string;
    readonly endShapeId?: string;
  };
};

// =============================================================================
// Serialization Functions
// =============================================================================

export type BlipEffectsJson = {
  readonly alphaBiLevel?: { readonly threshold: number };
  readonly alphaCeiling?: boolean;
  readonly alphaFloor?: boolean;
  readonly alphaInv?: boolean;
  readonly alphaMod?: boolean;
  readonly alphaModFix?: number;
  readonly alphaRepl?: { readonly alpha: number };
  readonly biLevel?: { readonly threshold: number };
  readonly blur?: { readonly radius: number; readonly grow?: boolean };
  readonly colorChange?: { readonly from: string; readonly to: string; readonly useAlpha?: boolean };
  readonly colorReplace?: { readonly color: string };
  readonly duotone?: { readonly colors: readonly [string, string] };
  readonly grayscale?: boolean;
  readonly hsl?: { readonly hue: number; readonly saturation: number; readonly luminance: number };
  readonly luminance?: { readonly brightness: number; readonly contrast: number };
  readonly tint?: { readonly hue: number; readonly amount: number };
};

function serializeBounds(transform: Transform | undefined): BoundsJson | undefined {
  if (!transform) {
    return undefined;
  }
  return {
    x: transform.x,
    y: transform.y,
    width: transform.width,
    height: transform.height,
  };
}

function serializePlaceholder(placeholder: Placeholder | undefined): PlaceholderJson | undefined {
  if (!placeholder) {
    return undefined;
  }
  return {
    type: placeholder.type,
    idx: placeholder.idx,
  };
}

function serializeRunProperties(props: RunProperties | undefined): RunPropertiesJson | undefined {
  if (!props) {
    return undefined;
  }
  const result: {
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    fontFamily?: string;
  } = {};
  if (props.bold !== undefined) {
    result.bold = props.bold;
  }
  if (props.italic !== undefined) {
    result.italic = props.italic;
  }
  if (props.fontSize !== undefined) {
    result.fontSize = props.fontSize;
  }
  if (props.fontFamily !== undefined) {
    result.fontFamily = props.fontFamily;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function serializeRun(run: TextRun): TextRunJson {
  const text = run.type === "text" ? run.text : run.type === "field" ? run.text : "";
  return {
    type: run.type,
    text,
    properties: serializeRunProperties(run.properties),
  };
}

function serializeParagraphProperties(props: ParagraphProperties): ParagraphPropertiesJson | undefined {
  const result: {
    level?: number;
    alignment?: string;
    bulletType?: string;
  } = {};
  if (props.level !== undefined) {
    result.level = props.level;
  }
  if (props.alignment !== undefined) {
    result.alignment = props.alignment;
  }
  if (props.bulletStyle?.bullet?.type !== undefined && props.bulletStyle.bullet.type !== "none") {
    result.bulletType = props.bulletStyle.bullet.type;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function serializeParagraph(paragraph: Paragraph): ParagraphJson {
  return {
    text: extractTextFromParagraph(paragraph),
    runs: paragraph.runs.map(serializeRun),
    properties: serializeParagraphProperties(paragraph.properties),
  };
}

function serializeMedia(
  media: PicShape["media"],
): ShapeJson["media"] | undefined {
  if (!media) {
    return undefined;
  }
  return {
    audioFile: media.audioFile,
    quickTimeFile: media.quickTimeFile,
    videoFile: media.videoFile,
    wavAudioFile: media.wavAudioFile,
  };
}

function serializeGeometry(geometry: Geometry | undefined): GeometryJson | undefined {
  if (!geometry) {
    return undefined;
  }
  if (geometry.type === "preset") {
    const preset = geometry as PresetGeometry;
    return {
      kind: "preset",
      preset: preset.preset,
      adjustValues: preset.adjustValues.length > 0 ? preset.adjustValues : undefined,
    };
  }
  const custom = geometry as CustomGeometry;
  return {
    kind: "custom",
    pathCount: custom.paths.length,
    adjustValues: custom.adjustValues && custom.adjustValues.length > 0 ? custom.adjustValues : undefined,
  };
}

function getColorValue(color: { spec: { type: string; value?: string } } | undefined): string | undefined {
  if (!color) {
    return undefined;
  }
  if (color.spec.type === "srgb" && color.spec.value) {
    return color.spec.value;
  }
  if (color.spec.type === "scheme" && color.spec.value) {
    return `scheme:${color.spec.value}`;
  }
  return undefined;
}

function serializeBlipColor(color: Color | undefined): string | undefined {
  return getColorValue(color as { spec: { type: string; value?: string } } | undefined);
}

function serializeBlipEffects(effects: BlipEffects | undefined): BlipEffectsJson | undefined {
  if (!effects) {
    return undefined;
  }

  const result: BlipEffectsJson = {};

  if (effects.alphaBiLevel) {
    (result as { alphaBiLevel?: { threshold: number } }).alphaBiLevel = { threshold: effects.alphaBiLevel.threshold };
  }
  if (effects.alphaCeiling) {
    (result as { alphaCeiling?: boolean }).alphaCeiling = true;
  }
  if (effects.alphaFloor) {
    (result as { alphaFloor?: boolean }).alphaFloor = true;
  }
  if (effects.alphaInv) {
    (result as { alphaInv?: boolean }).alphaInv = true;
  }
  if (effects.alphaMod) {
    (result as { alphaMod?: boolean }).alphaMod = true;
  }
  if (effects.alphaModFix) {
    (result as { alphaModFix?: number }).alphaModFix = effects.alphaModFix.amount;
  }
  if (effects.alphaRepl) {
    (result as { alphaRepl?: { alpha: number } }).alphaRepl = { alpha: effects.alphaRepl.alpha };
  }
  if (effects.biLevel) {
    (result as { biLevel?: { threshold: number } }).biLevel = { threshold: effects.biLevel.threshold };
  }
  if (effects.blur) {
    (result as { blur?: { radius: number; grow?: boolean } }).blur = {
      radius: effects.blur.radius,
      grow: effects.blur.grow || undefined,
    };
  }
  if (effects.colorChange) {
    const from = serializeBlipColor(effects.colorChange.from);
    const to = serializeBlipColor(effects.colorChange.to);
    if (from && to) {
      (result as { colorChange?: { from: string; to: string; useAlpha?: boolean } }).colorChange = {
        from,
        to,
        useAlpha: effects.colorChange.useAlpha || undefined,
      };
    }
  }
  if (effects.colorReplace) {
    const color = serializeBlipColor(effects.colorReplace.color);
    if (color) {
      (result as { colorReplace?: { color: string } }).colorReplace = { color };
    }
  }
  if (effects.duotone) {
    const c1 = serializeBlipColor(effects.duotone.colors[0]);
    const c2 = serializeBlipColor(effects.duotone.colors[1]);
    if (c1 && c2) {
      (result as { duotone?: { colors: readonly [string, string] } }).duotone = { colors: [c1, c2] };
    }
  }
  if (effects.grayscale) {
    (result as { grayscale?: boolean }).grayscale = true;
  }
  if (effects.hsl) {
    (result as { hsl?: { hue: number; saturation: number; luminance: number } }).hsl = {
      hue: effects.hsl.hue,
      saturation: effects.hsl.saturation,
      luminance: effects.hsl.luminance,
    };
  }
  if (effects.luminance) {
    (result as { luminance?: { brightness: number; contrast: number } }).luminance = {
      brightness: effects.luminance.brightness,
      contrast: effects.luminance.contrast,
    };
  }
  if (effects.tint) {
    (result as { tint?: { hue: number; amount: number } }).tint = {
      hue: effects.tint.hue,
      amount: effects.tint.amount,
    };
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function serializeFill(fill: Fill | undefined): FillJson | undefined {
  if (!fill) {
    return undefined;
  }
  switch (fill.type) {
    case "solidFill":
      return { type: "solid", color: getColorValue(fill.color) };
    case "gradientFill":
      return { type: "gradient" };
    case "patternFill":
      return { type: "pattern" };
    case "blipFill":
      return { type: "blip", resourceId: fill.resourceId };
    case "groupFill":
      return { type: "group" };
    case "noFill":
      return { type: "none" };
    default:
      return { type: "unknown" };
  }
}

function serializeLine(line: Line | undefined): LineJson | undefined {
  if (!line) {
    return undefined;
  }
  const result: { width?: number; color?: string; dashStyle?: string; compound?: string } = {};
  if (line.width !== undefined) {
    result.width = line.width;
  }
  if (line.fill?.type === "solidFill") {
    const colorValue = getColorValue(line.fill.color);
    if (colorValue) {
      result.color = colorValue;
    }
  }
  if (line.dash !== undefined && typeof line.dash === "string") {
    result.dashStyle = line.dash;
  }
  if (line.compound !== undefined && line.compound !== "sng") {
    result.compound = line.compound;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function serializeStyle(style: ShapeStyle | undefined): StyleReferenceJson | undefined {
  if (!style) {
    return undefined;
  }
  const result: { lineRef?: number; fillRef?: number; effectRef?: number; fontRef?: string } = {};
  if (style.lineReference?.index !== undefined) {
    result.lineRef = style.lineReference.index;
  }
  if (style.fillReference?.index !== undefined) {
    result.fillRef = style.fillReference.index;
  }
  if (style.effectReference?.index !== undefined) {
    result.effectRef = style.effectReference.index;
  }
  if (style.fontReference?.index !== undefined) {
    result.fontRef = style.fontReference.index;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function serializeEffects(effects: Effects | undefined): EffectsJson | undefined {
  if (!effects) {
    return undefined;
  }
  const result: EffectsJson = {};

  if (effects.shadow) {
    (result as { shadow?: EffectsJson["shadow"] }).shadow = {
      type: effects.shadow.type,
      color: getColorValue(effects.shadow.color),
      blur: effects.shadow.blurRadius,
      distance: effects.shadow.distance,
      direction: effects.shadow.direction,
    };
  }

  if (effects.glow) {
    (result as { glow?: EffectsJson["glow"] }).glow = {
      color: getColorValue(effects.glow.color),
      radius: effects.glow.radius,
    };
  }

  if (effects.softEdge) {
    (result as { softEdge?: EffectsJson["softEdge"] }).softEdge = {
      radius: effects.softEdge.radius,
    };
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function serializeShape3d(shape3d: Shape3d | undefined): Shape3dJson | undefined {
  if (!shape3d) {
    return undefined;
  }
  const result: Shape3dJson = {};

  if (shape3d.bevelTop) {
    (result as { bevelTop?: BevelJson }).bevelTop = {
      preset: shape3d.bevelTop.preset,
      width: shape3d.bevelTop.width,
      height: shape3d.bevelTop.height,
    };
  }

  if (shape3d.bevelBottom) {
    (result as { bevelBottom?: BevelJson }).bevelBottom = {
      preset: shape3d.bevelBottom.preset,
      width: shape3d.bevelBottom.width,
      height: shape3d.bevelBottom.height,
    };
  }

  if (shape3d.preset) {
    (result as { material?: string }).material = shape3d.preset;
  }

  if (shape3d.extrusionHeight !== undefined && shape3d.extrusionHeight > 0) {
    (result as { extrusionHeight?: number }).extrusionHeight = shape3d.extrusionHeight;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function serializeTableCell(cell: TableCell): TableCellJson {
  const text = cell.textBody ? extractTextFromBody(cell.textBody) : "";
  const result: { text: string; rowSpan?: number; colSpan?: number } = { text };
  if (cell.properties.rowSpan && cell.properties.rowSpan > 1) {
    result.rowSpan = cell.properties.rowSpan;
  }
  if (cell.properties.colSpan && cell.properties.colSpan > 1) {
    result.colSpan = cell.properties.colSpan;
  }
  return result;
}

function serializeTableRow(row: TableRow): TableRowJson {
  return {
    height: row.height,
    cells: row.cells.map(serializeTableCell),
  };
}

function serializeTable(tableRef: TableReference): TableJson {
  const table = tableRef.table;
  return {
    rows: table.rows.length,
    cols: table.grid.columns.length,
    data: table.rows.map(serializeTableRow),
    styleId: table.properties.tableStyleId,
  };
}

function serializeChart(chartRef: ChartReference): ChartJson {
  return {
    resourceId: chartRef.resourceId,
  };
}

function serializeDiagram(diagramRef: DiagramReference): DiagramJson {
  return {
    dataResourceId: diagramRef.dataResourceId,
    layoutResourceId: diagramRef.layoutResourceId,
    styleResourceId: diagramRef.styleResourceId,
    colorResourceId: diagramRef.colorResourceId,
  };
}

function serializeGraphicContent(content: GraphicContent): GraphicContentJson {
  switch (content.type) {
    case "table":
      return { type: "table", table: serializeTable(content.data) };
    case "chart":
      return { type: "chart", chart: serializeChart(content.data) };
    case "diagram":
      return { type: "diagram", diagram: serializeDiagram(content.data) };
    case "oleObject":
      return { type: "oleObject", progId: content.data.progId };
    case "unknown":
      return { type: "unknown", uri: content.uri };
  }
}

function serializeShapeProperties(props: ShapeProperties): {
  geometry?: GeometryJson;
  fill?: FillJson;
  line?: LineJson;
  effects?: EffectsJson;
  shape3d?: Shape3dJson;
} {
  return {
    geometry: serializeGeometry(props.geometry),
    fill: serializeFill(props.fill),
    line: serializeLine(props.line),
    effects: serializeEffects(props.effects),
    shape3d: serializeShape3d(props.shape3d),
  };
}

/**
 * Serialize a Shape to JSON-friendly format
 */
export function serializeShape(shape: Shape): ShapeJson {
  switch (shape.type) {
    case "sp": {
      const text = extractTextFromShape(shape);
      const { geometry, fill, line, effects, shape3d } = serializeShapeProperties(shape.properties);
      const transform = shape.properties.transform;
      return {
        id: shape.nonVisual.id,
        name: shape.nonVisual.name,
        type: shape.type,
        placeholder: serializePlaceholder(shape.placeholder),
        bounds: serializeBounds(transform),
        rotation: transform?.rotation !== 0 ? transform?.rotation : undefined,
        flipH: transform?.flipH || undefined,
        flipV: transform?.flipV || undefined,
        text: text || undefined,
        paragraphs: shape.textBody?.paragraphs.map(serializeParagraph),
        geometry,
        fill,
        line,
        effects,
        shape3d,
        style: serializeStyle(shape.style),
      };
    }
    case "pic": {
      const { fill, line } = serializeShapeProperties(shape.properties);
      const transform = shape.properties.transform;
      return {
        id: shape.nonVisual.id,
        name: shape.nonVisual.name,
        type: shape.type,
        bounds: serializeBounds(transform),
        rotation: transform?.rotation !== 0 ? transform?.rotation : undefined,
        flipH: transform?.flipH || undefined,
        flipV: transform?.flipV || undefined,
        resourceId: shape.blipFill.resourceId,
        blipEffects: serializeBlipEffects(shape.blipFill.blipEffects),
        mediaType: shape.mediaType,
        media: serializeMedia(shape.media),
        fill,
        line,
        style: serializeStyle(shape.style),
      };
    }
    case "grpSp": {
      return {
        id: shape.nonVisual.id,
        name: shape.nonVisual.name,
        type: shape.type,
        children: shape.children.map(serializeShape),
      };
    }
    case "cxnSp": {
      const { geometry, fill, line } = serializeShapeProperties(shape.properties);
      const transform = shape.properties.transform;
      return {
        id: shape.nonVisual.id,
        name: shape.nonVisual.name,
        type: shape.type,
        bounds: serializeBounds(transform),
        rotation: transform?.rotation !== 0 ? transform?.rotation : undefined,
        geometry,
        fill,
        line,
        style: serializeStyle(shape.style),
        connection: {
          startShapeId: shape.nonVisual.startConnection?.shapeId,
          endShapeId: shape.nonVisual.endConnection?.shapeId,
        },
      };
    }
    case "graphicFrame": {
      return {
        id: shape.nonVisual.id,
        name: shape.nonVisual.name,
        type: shape.type,
        bounds: serializeBounds(shape.transform),
        rotation: shape.transform?.rotation !== 0 ? shape.transform?.rotation : undefined,
        content: serializeGraphicContent(shape.content),
      };
    }
    case "contentPart": {
      return {
        id: "contentPart",
        name: "contentPart",
        type: shape.type,
      };
    }
  }
}
