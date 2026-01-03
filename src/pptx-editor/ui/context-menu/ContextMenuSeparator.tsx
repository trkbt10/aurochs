/**
 * @file Context menu separator component
 */

import type { CSSProperties } from "react";

const separatorStyle: CSSProperties = {
  height: "1px",
  backgroundColor: "var(--border-subtle, #333)",
  margin: "4px 0",
};

export function ContextMenuSeparator() {
  return <div style={separatorStyle} />;
}
