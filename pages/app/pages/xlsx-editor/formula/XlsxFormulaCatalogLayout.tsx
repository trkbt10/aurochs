/**
 * @file XLSX formula function catalog (Outlet-based)
 */

import { useMemo, useState, type CSSProperties } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  getFunctionsByCategory,
  listFunctionCategories,
  type FormulaFunctionDefinition,
} from "@aurochs-office/xlsx/formula/functionRegistry";
import { Input } from "@aurochs-ui/ui-components/primitives";

type NavItem = {
  readonly path: string;
  readonly label: string;
};

type NavSection = {
  readonly title: string;
  readonly items: readonly NavItem[];
  readonly collapsible?: boolean;
};

const layoutStyle: CSSProperties = {
  height: "100%",
  minHeight: 0,
  display: "flex",
  gap: 12,
};

const sidebarStyle: CSSProperties = {
  width: 320,
  minWidth: 240,
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  background: "var(--bg-secondary)",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minHeight: 0,
};

const contentStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  background: "var(--bg-secondary)",
  padding: 16,
  overflow: "auto",
};

function buildFunctionNavSections(): readonly NavSection[] {
  const categories = listFunctionCategories();
  return categories.map((category) => {
    const functions = getFunctionsByCategory(category);
    return {
      title: category,
      collapsible: true,
      items: functions.map(
        (fn): NavItem => ({
          path: `/xlsx-editor/formula/${category}/${fn.name.toLowerCase()}`,
          label: fn.name,
        }),
      ),
    };
  });
}

function matchesQuery(fn: FormulaFunctionDefinition, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return true;
  }
  const name = fn.name.toLowerCase();
  const category = (fn.category ?? "").toLowerCase();
  const en = (fn.description?.en ?? "").toLowerCase();
  const ja = (fn.description?.ja ?? "").toLowerCase();
  return name.includes(q) || category.includes(q) || en.includes(q) || ja.includes(q);
}

/**
 * Formula catalog page with a searchable sidebar (categories/functions) and an `Outlet`.
 */
export function XlsxFormulaCatalogLayout() {
  const location = useLocation();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState<string>("");

  const sections = useMemo(() => buildFunctionNavSections(), []);

  const filteredSections = useMemo(() => {
    if (query.trim().length === 0) {
      return sections;
    }
    const next: NavSection[] = [];
    for (const section of sections) {
      const functions = getFunctionsByCategory(section.title).filter((fn) => matchesQuery(fn, query));
      if (functions.length === 0) {
        continue;
      }
      next.push({
        ...section,
        items: functions.map((fn) => ({
          path: `/xlsx-editor/formula/${section.title}/${fn.name.toLowerCase()}`,
          label: fn.name,
        })),
      });
    }
    return next;
  }, [query, sections]);

  const toggle = (title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  return (
    <div style={layoutStyle}>
      <aside style={sidebarStyle}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Formula Functions</div>
        <Input value={query} onChange={(v) => setQuery(String(v))} placeholder="Search (name/category/desc)" />

        <nav style={{ overflow: "auto", minHeight: 0, paddingRight: 4 }}>
          {filteredSections.map((section) => {
            const isCollapsed = collapsedSections.has(section.title);
            return (
              <div key={section.title} style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => toggle(section.title)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 8px",
                    fontSize: 12,
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ opacity: 0.8 }}>{isCollapsed ? "▶" : "▼"}</span>
                  <span style={{ fontWeight: 600 }}>{section.title}</span>
                  <span style={{ opacity: 0.6, marginLeft: "auto" }}>{section.items.length}</span>
                </button>

                {!isCollapsed && (
                  <ul style={{ listStyle: "none", padding: "8px 0 0 0", margin: 0 }}>
                    {section.items.map((item) => (
                      <li key={item.path} style={{ margin: "2px 0" }}>
                        <Link
                          to={item.path}
                          style={{
                            display: "block",
                            padding: "6px 8px",
                            borderRadius: 8,
                            textDecoration: "none",
                            border: "1px solid transparent",
                            color: location.pathname === item.path ? "var(--text-primary)" : "var(--text-tertiary)",
                            background: location.pathname === item.path ? "var(--bg-tertiary)" : "transparent",
                          }}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <main style={contentStyle}>
        <Outlet />
      </main>
    </div>
  );
}
