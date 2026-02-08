/**
 * @file XLSX formula catalog index page
 */

import type { CSSProperties } from "react";

const boxStyle: CSSProperties = {
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  padding: 16,
  background: "var(--bg-primary)",
};

/**
 * Index page for the formula catalog (instructions / entry text).
 */
export function XlsxFormulaCatalogIndexPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>Functions</div>
      <div style={boxStyle}>
        <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>
          左のリストから関数を選ぶと、説明・例・サンプル入力に対する実際の評価結果（Actual）が確認できます。
        </div>
      </div>
    </div>
  );
}
