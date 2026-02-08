/**
 * @file Build progress overlay component
 */

import type { ReactElement } from "react";
import { tokens } from "@aurochs-ui/ui-components";

type BuildProgressProps = {
  readonly message: string;
};

/** Loading spinner overlay for build operations */
export function BuildProgress({ message }: BuildProgressProps): ReactElement {
  const { color, spacing, radius, font } = tokens;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "rgba(0, 0, 0, 0.9)",
        padding: `${spacing.lg} ${spacing.xl}`,
        borderRadius: radius.lg,
        display: "flex",
        alignItems: "center",
        gap: spacing.md,
      }}
    >
      <div
        style={{
          width: "20px",
          height: "20px",
          border: `2px solid ${color.border.strong}`,
          borderTopColor: color.selection.primary,
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <span style={{ fontSize: font.size.lg, color: color.text.primary }}>{message}</span>
      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
