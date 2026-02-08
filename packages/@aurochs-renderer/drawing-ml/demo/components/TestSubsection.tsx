/**
 * @file TestSubsection component for organizing test sections
 */

import type { ReactNode } from "react";
import type { CheckItem } from "../types";
import { CheckBox } from "./CheckBox";

/**
 * Subsection with checklist header
 */
export function TestSubsection({
  title,
  items,
  children,
}: {
  title: string;
  items: CheckItem[];
  children: ReactNode;
}) {
  const passCount = items.filter((i) => i.status === "pass").length;
  return (
    <div className="test-subsection">
      <h4>
        {title}
        <span className="check-count">
          ({passCount}/{items.length})
        </span>
      </h4>
      <div className="check-list">
        {items.map((item, i) => (
          <div key={i} className="check-item">
            <CheckBox status={item.status} />
            <span>{item.label}</span>
            {item.notes && <span className="check-notes">({item.notes})</span>}
          </div>
        ))}
      </div>
      <div className="test-examples">{children}</div>
    </div>
  );
}
