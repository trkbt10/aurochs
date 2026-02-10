/**
 * @file Editor Controls section index page
 */

import { useCallback, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@aurochs-ui/ui-components/primitives";

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

/** Navigation index page for editor controls preview. */
export function EditorControlsIndexPage() {
  const navigate = useNavigate();

  const goText = useCallback(() => navigate("text"), [navigate]);
  const goSurface = useCallback(() => navigate("surface"), [navigate]);
  const goTable = useCallback(() => navigate("table"), [navigate]);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Pages</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={goText}>Text</Button>
          <Button onClick={goSurface}>Surface</Button>
          <Button onClick={goTable}>Table</Button>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          各カテゴリの共通フォーマットエディタをプレビューします。
        </div>
      </div>
    </div>
  );
}
