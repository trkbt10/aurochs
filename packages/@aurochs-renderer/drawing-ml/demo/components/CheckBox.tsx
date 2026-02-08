/**
 * @file CheckBox component for test coverage indication
 */

import type { CheckItem } from "../types";

/**
 * Checkbox indicator for test coverage
 */
export function CheckBox({ status }: { status: CheckItem["status"] }) {
  const colors = {
    pass: "#10b981",
    partial: "#f59e0b",
    pending: "#6b7280",
  };
  const icons = {
    pass: "✓",
    partial: "◐",
    pending: "○",
  };
  return (
    <span style={{ color: colors[status], marginRight: 8, fontFamily: "monospace" }}>
      {icons[status]}
    </span>
  );
}
