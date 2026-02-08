/**
 * @file PPT domain model types
 */

/** Slide size in EMU (English Metric Units, 1 inch = 914400 EMU) */
export type PptSlideSize = {
  readonly widthEmu: number;
  readonly heightEmu: number;
};

/** A color in RRGGBB hex (e.g. "FF0000" for red) */
export type PptColor = string;

export type PptSolidFill = {
  readonly type: "solid";
  readonly color: PptColor;
};

export type PptGradientStop = {
  readonly position: number;
  readonly color: PptColor;
};

export type PptGradientFill = {
  readonly type: "gradient";
  readonly stops: readonly PptGradientStop[];
  readonly angle: number;
};

export type PptNoFill = { readonly type: "none" };

export type PptFill = PptSolidFill | PptGradientFill | PptNoFill;

export type PptLine = {
  readonly widthEmu: number;
  readonly color?: PptColor;
  readonly dashStyle?: "solid" | "dash" | "dot" | "dashDot" | "dashDotDot";
};

export type PptTransform = {
  readonly xEmu: number;
  readonly yEmu: number;
  readonly widthEmu: number;
  readonly heightEmu: number;
  readonly rotation: number;
  readonly flipH: boolean;
  readonly flipV: boolean;
};

export type PptTextRunProperties = {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly strikethrough?: boolean;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly color?: PptColor;
  readonly hyperlink?: string;
};

export type PptTextRun = {
  readonly text: string;
  readonly properties: PptTextRunProperties;
};

export type PptBullet = {
  readonly type: "char" | "autoNumber" | "none";
  readonly char?: string;
  readonly startAt?: number;
};

export type PptTextParagraph = {
  readonly runs: readonly PptTextRun[];
  readonly alignment?: "left" | "center" | "right" | "justify";
  readonly level?: number;
  readonly bullet?: PptBullet;
  readonly lineSpacing?: number;
  readonly spaceBefore?: number;
  readonly spaceAfter?: number;
};

export type PptTextBody = {
  readonly paragraphs: readonly PptTextParagraph[];
  readonly anchor?: "top" | "middle" | "bottom";
  readonly wordWrap?: boolean;
  readonly rotation?: number;
};

export type PptPresetShape =
  | "rect" | "ellipse" | "roundRect" | "triangle"
  | "diamond" | "pentagon" | "hexagon"
  | "rightArrow" | "leftArrow" | "upArrow" | "downArrow"
  | "freeform" | "line" | "connector";

export type PptPicture = {
  readonly pictureIndex: number;
  readonly cropLeft?: number;
  readonly cropTop?: number;
  readonly cropRight?: number;
  readonly cropBottom?: number;
};

export type PptTableCell = {
  readonly text?: PptTextBody;
  readonly fill?: PptFill;
  readonly colSpan?: number;
  readonly rowSpan?: number;
};

export type PptTableRow = {
  readonly heightEmu: number;
  readonly cells: readonly PptTableCell[];
};

export type PptTable = {
  readonly columnWidthsEmu: readonly number[];
  readonly rows: readonly PptTableRow[];
};

export type PptShape = {
  readonly type: "shape" | "picture" | "group" | "table" | "connector" | "placeholder";
  readonly transform: PptTransform;
  readonly presetShape?: PptPresetShape;
  readonly fill?: PptFill;
  readonly line?: PptLine;
  readonly textBody?: PptTextBody;
  readonly picture?: PptPicture;
  readonly table?: PptTable;
  readonly children?: readonly PptShape[];
  readonly placeholderType?: string;
  readonly name?: string;
};

export type PptSlide = {
  readonly shapes: readonly PptShape[];
  readonly background?: PptFill;
  readonly notes?: string;
};

export type PptEmbeddedImage = {
  readonly index: number;
  readonly contentType: string;
  readonly data: Uint8Array;
};

export type PptPresentation = {
  readonly slideSize: PptSlideSize;
  readonly slides: readonly PptSlide[];
  readonly images: readonly PptEmbeddedImage[];
};
