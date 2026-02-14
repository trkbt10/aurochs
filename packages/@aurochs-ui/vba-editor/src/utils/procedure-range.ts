/**
 * @file Procedure Range Utilities
 *
 * Calculate procedure boundaries from VBA source code.
 */

/**
 * Procedure range with line numbers.
 */
export type ProcedureRange = {
  readonly name: string;
  readonly type: "sub" | "function";
  readonly startLine: number;
  readonly endLine: number;
};

/**
 * Find all procedure ranges in VBA source code.
 *
 * @param source - VBA source code
 * @returns Array of procedure ranges
 */
export function findProcedureRanges(source: string): ProcedureRange[] {
  const ranges: ProcedureRange[] = [];
  const lines = source.split("\n");

  let currentProc: {
    name: string;
    type: "sub" | "function";
    startLine: number;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Detect Sub/Function start
    const startMatch = line.match(
      /^(Public\s+|Private\s+)?(Sub|Function)\s+(\w+)/i
    );
    if (startMatch) {
      currentProc = {
        name: startMatch[3],
        type: startMatch[2].toLowerCase() as "sub" | "function",
        startLine: lineNum,
      };
    }

    // Detect End Sub/Function
    if (currentProc && /^End\s+(Sub|Function)/i.test(line)) {
      ranges.push({ ...currentProc, endLine: lineNum });
      currentProc = null;
    }
  }

  return ranges;
}

/**
 * Get the procedure at a specific cursor line.
 *
 * @param source - VBA source code
 * @param cursorLine - Current cursor line (1-based)
 * @returns Procedure range if cursor is inside a procedure, null otherwise
 */
export function getProcedureAtLine(
  source: string,
  cursorLine: number
): ProcedureRange | null {
  const ranges = findProcedureRanges(source);
  return (
    ranges.find((r) => cursorLine >= r.startLine && cursorLine <= r.endLine) ??
    null
  );
}
