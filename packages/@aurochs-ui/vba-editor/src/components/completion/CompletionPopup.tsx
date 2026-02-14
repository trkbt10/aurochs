/**
 * @file Completion Popup Component
 *
 * Displays completion suggestions in a popup.
 */

import { useRef, useEffect, type ReactNode, type CSSProperties } from "react";
import type { CompletionItem, CompletionItemKind } from "../../completion/types";
import styles from "./CompletionPopup.module.css";

// =============================================================================
// Icons
// =============================================================================

const KIND_ICONS: Record<CompletionItemKind, { label: string; className: string }> = {
  keyword: { label: "K", className: styles.iconKeyword },
  type: { label: "T", className: styles.iconType },
  builtin: { label: "F", className: styles.iconBuiltin },
  variable: { label: "V", className: styles.iconVariable },
  procedure: { label: "S", className: styles.iconProcedure },
  property: { label: "P", className: styles.iconProperty },
  constant: { label: "C", className: styles.iconConstant },
  module: { label: "M", className: styles.iconModule },
};

// =============================================================================
// Types
// =============================================================================

export type CompletionPopupProps = {
  /** Completion items to display */
  readonly items: readonly CompletionItem[];
  /** Currently highlighted item index */
  readonly highlightedIndex: number;
  /** Position of popup (relative to code editor) */
  readonly position: { x: number; y: number };
  /** Callback when item is selected */
  readonly onSelect: (index: number) => void;
  /** Callback when popup should be dismissed */
  readonly onDismiss: () => void;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Completion Popup component.
 *
 * Displays a list of completion suggestions.
 */
export function CompletionPopup({
  items,
  highlightedIndex,
  position,
  onSelect,
}: CompletionPopupProps): ReactNode {
  const listRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLDivElement>(null);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedRef.current && listRef.current) {
      const list = listRef.current;
      const item = highlightedRef.current;

      const listRect = list.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      if (itemRect.top < listRect.top) {
        item.scrollIntoView({ block: "start" });
      } else if (itemRect.bottom > listRect.bottom) {
        item.scrollIntoView({ block: "end" });
      }
    }
  }, [highlightedIndex]);

  if (items.length === 0) {
    return null;
  }

  const popupStyle: CSSProperties = {
    left: position.x,
    top: position.y,
  };

  return (
    <div className={styles.container} style={popupStyle}>
      <div ref={listRef} className={styles.list}>
        {items.slice(0, 50).map((item, index) => {
          const isHighlighted = index === highlightedIndex;
          const icon = KIND_ICONS[item.kind];

          return (
            <div
              key={`${item.kind}-${item.label}`}
              ref={isHighlighted ? highlightedRef : undefined}
              className={`${styles.item} ${isHighlighted ? styles.highlighted : ""}`}
              onClick={() => onSelect(index)}
              onMouseEnter={() => onSelect(index)}
            >
              <span className={`${styles.icon} ${icon.className}`}>
                {icon.label}
              </span>
              <span className={styles.label}>{item.label}</span>
              {item.detail && (
                <span className={styles.detail}>{item.detail}</span>
              )}
            </div>
          );
        })}
      </div>
      {items.length > 50 && (
        <div className={styles.overflow}>
          +{items.length - 50} more
        </div>
      )}
    </div>
  );
}
