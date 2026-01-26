/**
 * @file XLS STYLE → XLSX cellStyles mapping
 */

import type { XlsxCellStyle } from "../../xlsx/domain/style/types";
import type { XlsWorkbook } from "../domain/types";
import type { XlsParseContext } from "../parse-context";
import { warnOrThrow } from "../parse-context";

// eslint-disable-next-line no-control-regex -- required to strip XML 1.0 invalid control characters
const XML10_INVALID_CONTROL_CHARS = new RegExp("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "g");

function sanitizeCellStyleName(name: string): string {
  // XML 1.0 disallows most ASCII control chars, including NUL.
  return name.replace(XML10_INVALID_CONTROL_CHARS, "");
}

function uniqCellStyleName(name: string, used: ReadonlySet<string>): string {
  if (!used.has(name)) {
    return name;
  }
  for (let i = 2; i < 10000; i++) {
    const candidate = `${name} (${i})`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Failed to uniquify cell style name: ${name}`);
}

function warnIfPossible(ctx: XlsParseContext, warning: Parameters<NonNullable<XlsParseContext["warn"]>>[0]): void {
  ctx.warn?.(warning);
}

function mapBuiltInStyleName(styleId: number, outlineLevel: number | undefined): string {
  switch (styleId) {
    case 0x00:
      return "Normal";
    case 0x01: {
      const n = (outlineLevel ?? 0) + 1;
      return `RowLevel_${n}`;
    }
    case 0x02: {
      const n = (outlineLevel ?? 0) + 1;
      return `ColLevel_${n}`;
    }
    case 0x03:
      return "Comma";
    case 0x04:
      return "Currency";
    case 0x05:
      return "Percent";
    case 0x06:
      return "Comma[0]";
    case 0x07:
      return "Currency[0]";
    default:
      return `BuiltIn_${styleId}`;
  }
}

/** Convert XLS STYLE records into XLSX `cellStyles` entries. */
export function convertXlsStylesToXlsxCellStyles(
  xls: Pick<XlsWorkbook, "styles">,
  styleXfIndexToCellStyleXfId: ReadonlyMap<number, number>,
  ctx: XlsParseContext = { mode: "strict" },
): readonly XlsxCellStyle[] {
  if (!xls) {
    throw new Error("convertXlsStylesToXlsxCellStyles: xls must be provided");
  }

  const names = new Set<string>();
  const out: XlsxCellStyle[] = [];

  for (const style of xls.styles) {
    const xfId = styleXfIndexToCellStyleXfId.get(style.styleXfIndex);
    if (xfId === undefined) {
      try {
        throw new Error(`STYLE: styleXfIndex not found in style XFs: ${style.styleXfIndex}`);
      } catch (err) {
        warnOrThrow(
          ctx,
          {
            code: "STYLE_MISSING_STYLE_XF",
            where: "STYLE",
            message: `STYLE refers to a missing style XF; skipping: ${style.styleXfIndex}`,
            meta: { styleXfIndex: style.styleXfIndex },
          },
          err instanceof Error ? err : new Error(String(err)),
        );
      }
      continue;
    }

    if (style.kind === "builtIn") {
      const builtInStyleId = style.builtInStyleId ?? 0;
      const baseName = sanitizeCellStyleName(mapBuiltInStyleName(builtInStyleId, style.outlineLevel));
      const name = uniqCellStyleName(baseName, names);
      if (name !== baseName) {
        warnIfPossible(ctx, { code: "STYLE_DUPLICATE_NAME", where: "STYLE", message: `Duplicate cell style name; renamed: ${baseName} -> ${name}` });
      }
      names.add(name);
      out.push({ name, xfId, builtinId: builtInStyleId });
      continue;
    }

    const baseName = sanitizeCellStyleName(style.name ?? "").trim();
    if (!baseName) {
      const generatedBaseName = `Style_${style.styleXfIndex}`;
      const name = uniqCellStyleName(generatedBaseName, names);
      warnIfPossible(ctx, { code: "STYLE_EMPTY_NAME", where: "STYLE", message: `User-defined STYLE has an empty name; using generated name: ${name}` });
      names.add(name);
      out.push({ name, xfId });
      continue;
    }
    const name = uniqCellStyleName(baseName, names);
    if (name !== baseName) {
      warnIfPossible(ctx, { code: "STYLE_DUPLICATE_NAME", where: "STYLE", message: `Duplicate cell style name; renamed: ${baseName} -> ${name}` });
    }
    names.add(name);
    out.push({ name, xfId });
  }

  return out;
}
