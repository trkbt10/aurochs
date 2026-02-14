/**
 * @file Line Numbers Component
 *
 * Displays line numbers in the gutter.
 */

import type { CSSProperties, ReactNode } from "react";
import styles from "./VbaCodeEditor.module.css";

export type LineNumbersProps = {
  readonly lineCount: number;
  readonly style?: CSSProperties;
};

/**
 * Line numbers gutter component.
 */
export function LineNumbers({ lineCount, style }: LineNumbersProps): ReactNode {
  const lines = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className={styles.lineNumbers} style={style}>
      {lines.map((num) => (
        <div key={num} className={styles.lineNumber}>
          {num}
        </div>
      ))}
    </div>
  );
}
