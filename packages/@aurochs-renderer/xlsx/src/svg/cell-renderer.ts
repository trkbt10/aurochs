/**
 * @file Cell rendering for XLSX SVG output
 *
 * Renders individual cells including:
 * - Background fill
 * - Text content with formatting
 * - Alignment
 */

import type { Cell, CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import type { XlsxAlignment } from "@aurochs-office/xlsx/domain/style/types";
import { formatNumberByCode } from "@aurochs-office/xlsx/domain/style/format-value";
import { dateToSerial } from "@aurochs-office/xlsx/domain/date-serial";
import type { XlsxSvgRenderContext, CellLayout, ResolvedCellStyle, ResolvedFill } from "./types";

// =============================================================================
// Text Formatting
// =============================================================================

type FormatCellValueParams = {
  readonly cell: Cell;
  readonly style: ResolvedCellStyle;
  readonly ctx: XlsxSvgRenderContext;
};

/**
 * Format cell value as display text.
 */
export function formatCellValue(params: FormatCellValueParams): string {
  const { cell, style, ctx } = params;
  const { value, formula } = cell;

  if (ctx.options.formulaMode === "formula" && formula) {
    return `=${formula.expression}`;
  }

  return formatValueByType({ value, style, ctx });
}

type FormatValueParams = {
  readonly value: CellValue;
  readonly style: ResolvedCellStyle;
  readonly ctx: XlsxSvgRenderContext;
};

function formatValueByType(params: FormatValueParams): string {
  const { value, style, ctx } = params;
  switch (value.type) {
    case "string":
      return value.value;

    case "number":
      return formatNumberValue({ num: value.value, style, ctx });

    case "boolean":
      return value.value ? "TRUE" : "FALSE";

    case "error":
      return value.value;

    case "date":
      return formatDateValue({ date: value.value, style, ctx });

    case "empty":
      return "";

    default:
      return "";
  }
}

type FormatNumberParams = {
  readonly num: number;
  readonly style: ResolvedCellStyle;
  readonly ctx: XlsxSvgRenderContext;
};

function formatNumberValue(params: FormatNumberParams): string {
  const { num, style, ctx } = params;
  const formatCode = style.numberFormat;
  if (formatCode === "General") {
    return formatGeneralNumber(num);
  }

  try {
    return formatNumberByCode(num, formatCode, { dateSystem: ctx.sheet.dateSystem });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    ctx.warnings.add(`Unsupported number format "${formatCode}": ${errorMessage}`);
    return formatGeneralNumber(num);
  }
}

type FormatDateParams = {
  readonly date: Date;
  readonly style: ResolvedCellStyle;
  readonly ctx: XlsxSvgRenderContext;
};

function formatDateValue(params: FormatDateParams): string {
  const { date, style, ctx } = params;
  const formatCode = style.numberFormat;

  if (formatCode === "General") {
    return date.toLocaleDateString();
  }

  // Convert Date to Excel serial number and format using domain function
  try {
    const serial = dateToSerial(date, ctx.sheet.dateSystem);
    return formatNumberByCode(serial, formatCode, { dateSystem: ctx.sheet.dateSystem });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    ctx.warnings.add(`Unsupported date format "${formatCode}": ${errorMessage}`);
    return date.toLocaleDateString();
  }
}

function formatGeneralNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  const absValue = Math.abs(value);
  if (absValue >= 1e10 || (absValue < 1e-4 && absValue !== 0)) {
    return value.toExponential(2);
  }

  const str = value.toString();
  if (str.length > 11) {
    return Number(value.toPrecision(9)).toString();
  }
  return str;
}

// =============================================================================
// SVG Escaping
// =============================================================================

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// =============================================================================
// Fill Rendering
// =============================================================================

type RenderCellFillParams = {
  readonly layout: CellLayout;
  readonly fill: ResolvedFill;
  readonly ctx: XlsxSvgRenderContext;
};

/**
 * Render cell background fill.
 */
export function renderCellFill(params: RenderCellFillParams): string {
  const { layout, fill, ctx } = params;

  if (fill.type === "none") {
    return "";
  }

  if (fill.type === "solid") {
    return `<rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" fill="${fill.color}"/>`;
  }

  if (fill.type === "gradient") {
    return renderGradientFill({ layout, fill, ctx });
  }

  return "";
}

type RenderGradientFillParams = {
  readonly layout: CellLayout;
  readonly fill: Extract<ResolvedFill, { type: "gradient" }>;
  readonly ctx: XlsxSvgRenderContext;
};

function renderGradientFill(params: RenderGradientFillParams): string {
  const { layout, fill, ctx } = params;
  const gradientId = ctx.defs.generateId("grad");
  const { gradientType, degree, stops } = fill;

  if (gradientType === "linear") {
    const gradientDef = createLinearGradientDef({ id: gradientId, degree: degree ?? 0, stops });
    ctx.defs.add(gradientDef);
  } else {
    const gradientDef = createRadialGradientDef(gradientId, stops);
    ctx.defs.add(gradientDef);
  }

  return `<rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" fill="url(#${gradientId})"/>`;
}

type LinearGradientDefParams = {
  readonly id: string;
  readonly degree: number;
  readonly stops: readonly { position: number; color: string }[];
};

function createLinearGradientDef(params: LinearGradientDefParams): string {
  const { id, degree, stops } = params;
  const angle = (degree * Math.PI) / 180;
  const x1 = 50 - Math.sin(angle) * 50;
  const y1 = 50 + Math.cos(angle) * 50;
  const x2 = 50 + Math.sin(angle) * 50;
  const y2 = 50 - Math.cos(angle) * 50;

  const stopsStr = stops.map((s) => `<stop offset="${s.position * 100}%" stop-color="${s.color}"/>`).join("");

  return `<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stopsStr}</linearGradient>`;
}

function createRadialGradientDef(id: string, stops: readonly { position: number; color: string }[]): string {
  const stopsStr = stops.map((s) => `<stop offset="${s.position * 100}%" stop-color="${s.color}"/>`).join("");

  return `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">${stopsStr}</radialGradient>`;
}

// =============================================================================
// Text Rendering
// =============================================================================

type TextPosition = {
  readonly x: number;
  readonly y: number;
  readonly anchor: string;
  readonly baseline: string;
};

type CalculateTextPositionParams = {
  readonly layout: CellLayout;
  readonly alignment: XlsxAlignment | undefined;
  readonly fontSize: number;
};

function calculateTextPosition(params: CalculateTextPositionParams): TextPosition {
  const { layout, alignment, fontSize } = params;
  const padding = 2;
  const horizontal = alignment?.horizontal ?? "general";
  const vertical = alignment?.vertical ?? "bottom";

  const { x, anchor } = computeHorizontalPosition({ layout, horizontal, padding });
  const { y, baseline } = computeVerticalPosition({ layout, vertical, fontSize, padding });

  return { x, y, anchor, baseline };
}

type HorizontalPositionParams = {
  readonly layout: CellLayout;
  readonly horizontal: string;
  readonly padding: number;
};

function computeHorizontalPosition(params: HorizontalPositionParams): { x: number; anchor: string } {
  const { layout, horizontal, padding } = params;
  switch (horizontal) {
    case "center":
    case "centerContinuous":
      return { x: layout.x + layout.width / 2, anchor: "middle" };
    case "right":
      return { x: layout.x + layout.width - padding, anchor: "end" };
    default:
      return { x: layout.x + padding, anchor: "start" };
  }
}

type VerticalPositionParams = {
  readonly layout: CellLayout;
  readonly vertical: string;
  readonly fontSize: number;
  readonly padding: number;
};

function computeVerticalPosition(params: VerticalPositionParams): { y: number; baseline: string } {
  const { layout, vertical, fontSize, padding } = params;
  switch (vertical) {
    case "top":
      return { y: layout.y + fontSize + padding, baseline: "hanging" };
    case "center":
      return { y: layout.y + layout.height / 2, baseline: "middle" };
    default:
      return { y: layout.y + layout.height - padding, baseline: "alphabetic" };
  }
}

type RenderCellTextParams = {
  readonly cell: Cell;
  readonly layout: CellLayout;
  readonly style: ResolvedCellStyle;
  readonly ctx: XlsxSvgRenderContext;
};

/**
 * Render cell text content.
 */
export function renderCellText(params: RenderCellTextParams): string {
  const { cell, layout, style, ctx } = params;
  const text = formatCellValue({ cell, style, ctx });
  if (!text) {
    return "";
  }

  const { font, alignment } = style;
  const { x, y, anchor, baseline } = calculateTextPosition({ layout, alignment, fontSize: font.size });
  const styleStr = buildFontStyleString(font);

  if (alignment?.wrapText && layout.width > 0) {
    return renderWrappedText({ text, x, y, layout, fontSize: font.size, anchor, style: styleStr });
  }

  const clipId = ctx.defs.generateId("clip");
  ctx.defs.add(`<clipPath id="${clipId}"><rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}"/></clipPath>`);

  return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="${baseline}" style="${styleStr}" clip-path="url(#${clipId})">${escapeXml(text)}</text>`;
}

type FontStyleParams = {
  readonly name: string;
  readonly size: number;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly color?: string;
  readonly underline?: boolean;
  readonly strikethrough?: boolean;
};

function buildFontStyleString(font: FontStyleParams): string {
  const styleAttrs: string[] = [];
  styleAttrs.push(`font-family: "${font.name}", sans-serif`);
  styleAttrs.push(`font-size: ${font.size}pt`);

  if (font.bold) {
    styleAttrs.push("font-weight: bold");
  }
  if (font.italic) {
    styleAttrs.push("font-style: italic");
  }
  if (font.color) {
    styleAttrs.push(`fill: ${font.color}`);
  }

  const decorations = buildTextDecorations(font);
  if (decorations) {
    styleAttrs.push(`text-decoration: ${decorations}`);
  }

  return styleAttrs.join("; ");
}

function buildTextDecorations(font: { underline?: boolean; strikethrough?: boolean }): string {
  const parts: string[] = [];
  if (font.underline) {
    parts.push("underline");
  }
  if (font.strikethrough) {
    parts.push("line-through");
  }
  return parts.join(" ");
}

type WrappedTextParams = {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly layout: CellLayout;
  readonly fontSize: number;
  readonly anchor: string;
  readonly style: string;
};

function renderWrappedText(params: WrappedTextParams): string {
  const { text, x, layout, fontSize, anchor, style } = params;
  const lineHeight = fontSize * 1.2;
  const maxLines = Math.floor(layout.height / lineHeight);
  const lines = wrapText({ text, width: layout.width, fontSize, maxLines });

  const tspans = lines
    .map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  return `<text text-anchor="${anchor}" style="${style}">${tspans}</text>`;
}

type WrapTextParams = {
  readonly text: string;
  readonly width: number;
  readonly fontSize: number;
  readonly maxLines: number;
};

function wrapText(params: WrapTextParams): string[] {
  const { text, width, fontSize, maxLines } = params;
  const avgCharWidth = fontSize * 0.6;
  const charsPerLine = Math.floor(width / avgCharWidth);
  const words = text.split(/\s+/);

  return buildWrappedLines({ words, charsPerLine, maxLines });
}

type BuildLinesParams = {
  readonly words: readonly string[];
  readonly charsPerLine: number;
  readonly maxLines: number;
};

type WrapState = {
  readonly lines: readonly string[];
  readonly currentLine: string;
};

function buildWrappedLines(params: BuildLinesParams): string[] {
  const { words, charsPerLine, maxLines } = params;

  const finalState = words.reduce<WrapState>(
    (state, word) => {
      if (state.lines.length >= maxLines) {
        return state;
      }
      return processWord({ state, word, charsPerLine, maxLines });
    },
    { lines: [], currentLine: "" },
  );

  if (finalState.currentLine && finalState.lines.length < maxLines) {
    return [...finalState.lines, finalState.currentLine];
  }

  return [...finalState.lines];
}

type ProcessWordParams = {
  readonly state: WrapState;
  readonly word: string;
  readonly charsPerLine: number;
  readonly maxLines: number;
};

function processWord(params: ProcessWordParams): WrapState {
  const { state, word, charsPerLine, maxLines } = params;
  const testLine = state.currentLine ? `${state.currentLine} ${word}` : word;

  if (testLine.length > charsPerLine && state.currentLine) {
    const newLines = [...state.lines, state.currentLine];
    if (newLines.length >= maxLines) {
      return { lines: newLines, currentLine: "" };
    }
    return { lines: newLines, currentLine: word };
  }

  return { lines: state.lines, currentLine: testLine };
}

// =============================================================================
// Complete Cell Rendering
// =============================================================================

type RenderCellParams = {
  readonly cell: Cell;
  readonly layout: CellLayout;
  readonly style: ResolvedCellStyle;
  readonly ctx: XlsxSvgRenderContext;
};

/**
 * Render a complete cell (background + text).
 */
export function renderCell(params: RenderCellParams): string {
  const { cell, layout, style, ctx } = params;

  if (layout.isHiddenByMerge || layout.width === 0 || layout.height === 0) {
    return "";
  }

  const parts: string[] = [];

  const fillSvg = renderCellFill({ layout, fill: style.fill, ctx });
  if (fillSvg) {
    parts.push(fillSvg);
  }

  const textSvg = renderCellText({ cell, layout, style, ctx });
  if (textSvg) {
    parts.push(textSvg);
  }

  return parts.join("");
}
