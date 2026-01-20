/**
 * @file XLSX Editor section layout (Outlet-based)
 */

import { type CSSProperties } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@lib/office-editor-components/primitives";

export type XlsxEditorLayoutProps = {
  readonly onBack: () => void;
};

const pageStyle: CSSProperties = {
  height: "100vh",
  minHeight: 0,
  backgroundColor: "var(--bg-primary)",
  color: "var(--text-primary)",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: 16,
  borderBottom: "1px solid var(--border-subtle)",
  gap: 12,
};

const titleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const navStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

function NavItem({ to, label }: { readonly to: string; readonly label: string }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid var(--border-subtle)",
        textDecoration: "none",
        color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
        background: isActive ? "var(--bg-tertiary)" : "transparent",
      })}
      end={to === "."}
    >
      {label}
    </NavLink>
  );
}

export function XlsxEditorLayout({ onBack }: XlsxEditorLayoutProps) {
  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={titleStyle}>XLSX Editor</div>
          <div style={navStyle}>
            <NavItem to="." label="Home" />
            <NavItem to="workbook" label="Workbook" />
            <NavItem to="formula" label="Functions" />
          </div>
        </div>
        <Button onClick={onBack}>Back</Button>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}
