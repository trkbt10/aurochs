/**
 * @file VBA Output Log Component
 *
 * Displays VBA execution output and errors.
 */

import type { ReactNode, CSSProperties } from "react";
import type { ExecutionResult } from "../../vba";

// =============================================================================
// Types
// =============================================================================

export type VbaOutputLogProps = {
  /** Last execution result */
  readonly result: ExecutionResult | undefined;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  fontFamily: "monospace",
  fontSize: "12px",
  backgroundColor: "var(--background-secondary, #f5f5f5)",
  padding: "8px",
  borderRadius: "4px",
  maxHeight: "100px",
  overflow: "auto",
  whiteSpace: "pre-wrap",
};

const errorStyle: CSSProperties = {
  color: "var(--danger, #d32f2f)",
};

const successStyle: CSSProperties = {
  color: "var(--success, #388e3c)",
};

// =============================================================================
// Component
// =============================================================================

/**
 * VBA output log component.
 */
export function VbaOutputLog({ result }: VbaOutputLogProps): ReactNode {
  if (!result) {
    return null;
  }

  return (
    <div style={containerStyle}>
      {result.ok ? (
        <>
          <div style={successStyle}>
            Executed successfully in {result.durationMs.toFixed(1)}ms
          </div>
          {result.mutations.length > 0 && (
            <div>Applied {result.mutations.length} cell change(s)</div>
          )}
          {result.output.length > 0 && (
            <div>
              Output:
              {result.output.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={errorStyle}>
          Error: {result.message}
          {result.stackTrace && (
            <div style={{ marginTop: 4, opacity: 0.8 }}>{result.stackTrace}</div>
          )}
        </div>
      )}
    </div>
  );
}
