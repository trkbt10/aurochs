/**
 * @file Chart demo app - Catalog viewer
 *
 * Displays sample charts from the catalog without requiring file upload.
 */

import { useState, useMemo } from "react";
import { chartCatalog, type ChartCatalogItem } from "./fixtures";
import { ChartCard } from "./components/ChartCard";

type CategoryFilter = "all" | "bar" | "line" | "pie" | "scatter";

const styles = {
  app: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
  },
  header: {
    padding: "20px",
    borderBottom: "1px solid #333",
    background: "#16213e",
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: "24px",
    fontWeight: 600,
  },
  subtitle: {
    fontSize: "14px",
    color: "#94a3b8",
    marginTop: "4px",
  },
  filters: {
    display: "flex",
    gap: "8px",
  },
  filterButton: {
    padding: "8px 16px",
    fontSize: "13px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    background: "rgba(255, 255, 255, 0.1)",
    color: "#94a3b8",
    transition: "all 0.15s",
  },
  filterButtonActive: {
    background: "#6366f1",
    color: "#fff",
  },
  main: {
    flex: 1,
    padding: "24px",
    overflowY: "auto" as const,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
    gap: "24px",
  },
  stats: {
    display: "flex",
    gap: "16px",
    marginBottom: "20px",
  },
  stat: {
    padding: "8px 16px",
    background: "rgba(99, 102, 241, 0.1)",
    borderRadius: "8px",
    fontSize: "14px",
  },
};

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "bar", label: "Bar" },
  { id: "line", label: "Line" },
  { id: "pie", label: "Pie" },
  { id: "scatter", label: "Scatter" },
];

export function App() {
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [selectedChart, setSelectedChart] = useState<string | null>(null);

  const filteredCharts = useMemo(() => {
    if (filter === "all") {
      return chartCatalog;
    }
    return chartCatalog.filter((item) => item.category === filter);
  }, [filter]);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>Chart Catalog</h1>
            <p style={styles.subtitle}>ECMA-376 DrawingML Chart Rendering Demo</p>
          </div>
          <div style={styles.filters}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                style={{
                  ...styles.filterButton,
                  ...(filter === cat.id ? styles.filterButtonActive : {}),
                }}
                onClick={() => setFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.stats}>
          <div style={styles.stat}>
            <strong>{filteredCharts.length}</strong> charts
          </div>
        </div>

        <div style={styles.grid}>
          {filteredCharts.map((item) => (
            <ChartCard
              key={item.id}
              item={item}
              isSelected={selectedChart === item.id}
              onClick={() => setSelectedChart(selectedChart === item.id ? null : item.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
