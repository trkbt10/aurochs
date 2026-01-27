/**
 * @file XLSX Editor section index page
 */

import { useCallback, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@oxen-ui/ui-components/primitives";

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  height: "100%",
  minHeight: 0,
};

const cardStyle: CSSProperties = {
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  padding: 16,
  background: "var(--bg-secondary)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

/**
 * XLSX editor entry page that links to the workbook editor and formula catalog.
 */
export function XlsxEditorIndexPage() {
  const navigate = useNavigate();

  const goWorkbook = useCallback(() => {
    navigate("workbook");
  }, [navigate]);

  const goFormula = useCallback(() => {
    navigate("formula");
  }, [navigate]);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Pages</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={goWorkbook}>Workbook</Button>
          <Button onClick={goFormula}>Functions</Button>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Functions は関数一覧とサンプル評価結果（Actual）を確認するための小ページです。
        </div>
      </div>
    </div>
  );
}
