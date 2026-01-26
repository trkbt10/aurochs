/**
 * @file BIFF8 parsed expression (RPN tokens) → formula text
 *
 * Converts BIFF formula token bytes (rgce) into an XLSX formula expression string.
 * This is a best-effort converter: unsupported tokens will throw, and callers can
 * decide whether to omit formulas when conversion fails.
 */

import { colIdx, rowIdx } from "../../xlsx/domain/types";
import { indexToColumnLetter } from "../../xlsx/domain/cell/address";
import type { XlsParseContext } from "../parse-context";
import { warnOrThrow } from "../parse-context";

export type BiffFormulaContext = {
  /** Formula cell row (0-based) */
  readonly baseRow: number;
  /** Formula cell col (0-based) */
  readonly baseCol: number;
};

const PTG = {
  ISECT: 0x0f,
  UNION: 0x10,
  RANGE: 0x11,
  UPLUS: 0x12,
  UMINUS: 0x13,
  PERCENT: 0x14,
  PAREN: 0x15,
  STR: 0x17,
  ERR: 0x1c,
  BOOL: 0x1d,
  INT: 0x1e,
  NUM: 0x1f,
  ADD: 0x03,
  SUB: 0x04,
  MUL: 0x05,
  DIV: 0x06,
  POWER: 0x07,
  CONCAT: 0x08,
  LT: 0x09,
  LE: 0x0a,
  EQ: 0x0b,
  GE: 0x0c,
  GT: 0x0d,
  NE: 0x0e,
  REF: 0x24,
  AREA: 0x25,
} as const;

const BINARY_OP_BY_PTG: Record<number, string> = {
  [PTG.ADD]: "+",
  [PTG.SUB]: "-",
  [PTG.MUL]: "*",
  [PTG.DIV]: "/",
  [PTG.POWER]: "^",
  [PTG.CONCAT]: "&",
  [PTG.LT]: "<",
  [PTG.LE]: "<=",
  [PTG.EQ]: "=",
  [PTG.GE]: ">=",
  [PTG.GT]: ">",
  [PTG.NE]: "<>",
  [PTG.ISECT]: " ",
  [PTG.UNION]: ",",
  [PTG.RANGE]: ":",
};

function signExtend14(value: number): number {
  const masked = value & 0x3fff;
  return (masked & 0x2000) !== 0 ? masked - 0x4000 : masked;
}

function toCellRefString(args: {
  readonly row0: number;
  readonly col0: number;
  readonly rowAbsolute: boolean;
  readonly colAbsolute: boolean;
}): string {
  const row1 = args.row0 + 1;
  const col1 = args.col0 + 1;
  if (!Number.isInteger(row1) || row1 <= 0) {
    throw new Error(`Invalid row in cell ref: ${args.row0}`);
  }
  if (!Number.isInteger(col1) || col1 <= 0) {
    throw new Error(`Invalid col in cell ref: ${args.col0}`);
  }

  const colPrefix = args.colAbsolute ? "$" : "";
  const rowPrefix = args.rowAbsolute ? "$" : "";
  return `${colPrefix}${indexToColumnLetter(colIdx(col1))}${rowPrefix}${rowIdx(row1)}`;
}

function escapeFormulaString(value: string): string {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function unwrapOnce(expr: string): string {
  if (!expr.startsWith("(") || !expr.endsWith(")")) {
    return expr;
  }
  for (let i = 0, depth = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "(") {
      depth += 1;
    }
    if (ch === ")") {
      depth -= 1;
    }
    if (depth === 0 && i !== expr.length - 1) {
      return expr;
    }
  }
  return expr.slice(1, -1);
}

function mapFormulaErrorCode(code: number): string {
  switch (code) {
    case 0x00:
      return "#NULL!";
    case 0x07:
      return "#DIV/0!";
    case 0x0f:
      return "#VALUE!";
    case 0x17:
      return "#REF!";
    case 0x1d:
      return "#NAME?";
    case 0x24:
      return "#NUM!";
    case 0x2a:
      return "#N/A";
    default:
      throw new Error(`ptgErr: unknown error code: 0x${code.toString(16)}`);
  }
}

function requireInt16(view: DataView, offset: number, where: string): number {
  if (offset + 2 > view.byteLength) {
    throw new Error(`${where}: unexpected end of token payload`);
  }
  return view.getInt16(offset, true);
}

function requireUint16(view: DataView, offset: number, where: string): number {
  if (offset + 2 > view.byteLength) {
    throw new Error(`${where}: unexpected end of token payload`);
  }
  return view.getUint16(offset, true);
}

function requireFloat64(view: DataView, offset: number, where: string): number {
  if (offset + 8 > view.byteLength) {
    throw new Error(`${where}: unexpected end of token payload`);
  }
  return view.getFloat64(offset, true);
}

function parsePtgRef(bytes: Uint8Array, offset: number, ctx: BiffFormulaContext): { readonly expr: string; readonly next: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rw = requireInt16(view, offset, "ptgRef");
  const grbitCol = requireUint16(view, offset + 2, "ptgRef");
  const fRwRel = (grbitCol & 0x8000) !== 0;
  const fColRel = (grbitCol & 0x4000) !== 0;
  const colBits = grbitCol & 0x3fff;

  const row0 = fRwRel ? ctx.baseRow + rw : rw;
  const col0 = fColRel ? ctx.baseCol + signExtend14(colBits) : colBits;

  return {
    expr: toCellRefString({ row0, col0, rowAbsolute: !fRwRel, colAbsolute: !fColRel }),
    next: offset + 4,
  };
}

function parsePtgArea(bytes: Uint8Array, offset: number, ctx: BiffFormulaContext): { readonly expr: string; readonly next: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rwFirst = requireInt16(view, offset, "ptgArea.rwFirst");
  const rwLast = requireInt16(view, offset + 2, "ptgArea.rwLast");
  const grbitColFirst = requireUint16(view, offset + 4, "ptgArea.grbitColFirst");
  const grbitColLast = requireUint16(view, offset + 6, "ptgArea.grbitColLast");

  const fRwRelFirst = (grbitColFirst & 0x8000) !== 0;
  const fColRelFirst = (grbitColFirst & 0x4000) !== 0;
  const colFirstBits = grbitColFirst & 0x3fff;

  const fRwRelLast = (grbitColLast & 0x8000) !== 0;
  const fColRelLast = (grbitColLast & 0x4000) !== 0;
  const colLastBits = grbitColLast & 0x3fff;

  const first = toCellRefString({
    row0: fRwRelFirst ? ctx.baseRow + rwFirst : rwFirst,
    col0: fColRelFirst ? ctx.baseCol + signExtend14(colFirstBits) : colFirstBits,
    rowAbsolute: !fRwRelFirst,
    colAbsolute: !fColRelFirst,
  });
  const last = toCellRefString({
    row0: fRwRelLast ? ctx.baseRow + rwLast : rwLast,
    col0: fColRelLast ? ctx.baseCol + signExtend14(colLastBits) : colLastBits,
    rowAbsolute: !fRwRelLast,
    colAbsolute: !fColRelLast,
  });

  return { expr: `${first}:${last}`, next: offset + 8 };
}

/**
 * Convert BIFF parsed expression bytes (rgce) to formula text.
 *
 * Returns an expression without the leading '=' (as required by XLSX <f>).
 */
export function convertBiffRpnToFormulaExpression(tokens: Uint8Array, ctx: BiffFormulaContext): string {
  if (!tokens) {
    throw new Error("convertBiffRpnToFormulaExpression: tokens must be provided");
  }
  if (!ctx) {
    throw new Error("convertBiffRpnToFormulaExpression: ctx must be provided");
  }

  const view = new DataView(tokens.buffer, tokens.byteOffset, tokens.byteLength);
  const stack: string[] = [];

  for (let offset = 0; offset < tokens.length; ) {
    const ptg = tokens[offset];
    if (ptg === undefined) {
      throw new Error("convertBiffRpnToFormulaExpression: unexpected end of tokens");
    }
    offset += 1;

    switch (ptg) {
      case PTG.INT: {
        const value = requireUint16(view, offset, "ptgInt");
        stack.push(String(value));
        offset += 2;
        break;
      }
      case PTG.NUM: {
        const value = requireFloat64(view, offset, "ptgNum");
        if (!Number.isFinite(value)) {
          throw new Error(`ptgNum: invalid number: ${value}`);
        }
        stack.push(String(value));
        offset += 8;
        break;
      }
      case PTG.BOOL: {
        const b = tokens[offset];
        if (b !== 0 && b !== 1) {
          throw new Error(`ptgBool: invalid value: ${String(b)}`);
        }
        stack.push(b === 1 ? "TRUE" : "FALSE");
        offset += 1;
        break;
      }
      case PTG.ERR: {
        const err = tokens[offset];
        if (err === undefined) {
          throw new Error("ptgErr: unexpected end of token payload");
        }
        stack.push(mapFormulaErrorCode(err));
        offset += 1;
        break;
      }
      case PTG.STR: {
        const cch = tokens[offset];
        if (cch === undefined) {
          throw new Error("ptgStr: unexpected end of token payload");
        }
        offset += 1;
        const end = offset + cch;
        if (end > tokens.length) {
          throw new Error("ptgStr: unexpected end of token payload");
        }
        const raw = tokens.subarray(offset, end);
        const str = String.fromCharCode(...raw);
        stack.push(escapeFormulaString(str));
        offset = end;
        break;
      }
      case PTG.REF: {
        const parsed = parsePtgRef(tokens, offset, ctx);
        stack.push(parsed.expr);
        offset = parsed.next;
        break;
      }
      case PTG.AREA: {
        const parsed = parsePtgArea(tokens, offset, ctx);
        stack.push(parsed.expr);
        offset = parsed.next;
        break;
      }
      case PTG.UPLUS:
      case PTG.UMINUS:
      case PTG.PERCENT:
      case PTG.PAREN: {
        const a = stack.pop();
        if (!a) {
          throw new Error(`ptg ${ptg.toString(16)}: stack underflow`);
        }
        if (ptg === PTG.UPLUS) {
          stack.push(`(+${a})`);
        }
        if (ptg === PTG.UMINUS) {
          stack.push(`(-${a})`);
        }
        if (ptg === PTG.PERCENT) {
          stack.push(`(${a}%)`);
        }
        if (ptg === PTG.PAREN) {
          stack.push(`(${a})`);
        }
        break;
      }
      case PTG.ADD:
      case PTG.SUB:
      case PTG.MUL:
      case PTG.DIV:
      case PTG.POWER:
      case PTG.CONCAT:
      case PTG.LT:
      case PTG.LE:
      case PTG.EQ:
      case PTG.GE:
      case PTG.GT:
      case PTG.NE:
      case PTG.ISECT:
      case PTG.UNION:
      case PTG.RANGE: {
        const b = stack.pop();
        const a = stack.pop();
        if (!a || !b) {
          throw new Error(`ptg ${ptg.toString(16)}: stack underflow`);
        }
        const op = BINARY_OP_BY_PTG[ptg];
        if (!op) {
          throw new Error(`Unsupported operator ptg: 0x${ptg.toString(16)}`);
        }
        stack.push(`(${a}${op}${b})`);
        break;
      }
      default:
        throw new Error(`Unsupported formula ptg: 0x${ptg.toString(16).padStart(2, "0")}`);
    }
  }

  if (stack.length !== 1) {
    throw new Error(`convertBiffRpnToFormulaExpression: invalid stack size: ${stack.length}`);
  }

  return unwrapOnce(stack[0] ?? "");
}

/**
 * Convert BIFF formula tokens to an XLSX `<f>` expression, returning `undefined` on conversion failure.
 *
 * When `xlsCtx` is provided, failures are reported as warnings (and may throw in strict mode).
 */
export function tryConvertBiffRpnToFormulaExpression(
  tokens: Uint8Array,
  ctx: BiffFormulaContext,
  xlsCtx?: XlsParseContext,
): string | undefined {
  try {
    return convertBiffRpnToFormulaExpression(tokens, ctx);
  } catch (err) {
    if (xlsCtx) {
      const msg = err instanceof Error ? err.message : String(err);
      const warning = {
        code: "FORMULA_CONVERSION_FAILED" as const,
        where: "Formula",
        message: `Failed to convert BIFF formula tokens to expression; omitting formula and keeping cached value: ${msg}`,
        meta: { baseRow: ctx.baseRow, baseCol: ctx.baseCol, tokensLength: tokens.length },
      };
      if (xlsCtx.mode === "strict") {
        xlsCtx.warn?.(warning);
      } else {
        warnOrThrow(xlsCtx, warning, new Error(`Failed to convert BIFF formula tokens at r=${ctx.baseRow} c=${ctx.baseCol}: ${msg}`));
      }
    }
    return undefined;
  }
}
