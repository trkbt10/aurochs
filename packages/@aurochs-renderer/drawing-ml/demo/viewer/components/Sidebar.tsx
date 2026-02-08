/**
 * @file Sidebar navigation component
 */

import type { CategoryRoute, Category } from "../../types";

type Props = {
  readonly categories: readonly CategoryRoute[];
  readonly activeCategory: Category;
  readonly activeFeature: string;
  readonly onNavigate: (category: Category, feature: string) => void;
};

const styles = {
  sidebar: {
    width: "240px",
    background: "#16213e",
    borderRight: "1px solid #333",
    overflowY: "auto" as const,
    padding: "16px 0",
  },
  category: {
    marginBottom: "16px",
  },
  categoryHeader: {
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  categoryIcon: {
    fontSize: "16px",
  },
  categoryLabel: {
    fontSize: "14px",
    fontWeight: 600,
  },
  categoryDesc: {
    fontSize: "11px",
    color: "#64748b",
    marginLeft: "auto",
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  featureItem: {
    padding: "8px 16px 8px 40px",
    fontSize: "13px",
    color: "#94a3b8",
    cursor: "pointer",
    transition: "all 0.15s",
    borderLeft: "3px solid transparent",
  },
  featureItemActive: {
    color: "#fff",
    background: "rgba(99, 102, 241, 0.15)",
    borderLeftColor: "#6366f1",
  },
  featureItemHover: {
    background: "rgba(255, 255, 255, 0.05)",
  },
};

export function Sidebar({ categories, activeCategory, activeFeature, onNavigate }: Props) {
  return (
    <aside style={styles.sidebar}>
      {categories.map((category) => (
        <div key={category.id} style={styles.category}>
          <div style={styles.categoryHeader}>
            <span style={styles.categoryIcon}>{category.icon}</span>
            <span style={{ ...styles.categoryLabel, color: category.color }}>
              {category.label}
            </span>
            <span style={styles.categoryDesc}>{category.description}</span>
          </div>
          <ul style={styles.featureList}>
            {category.features.map((feature) => {
              const isActive =
                activeCategory === category.id && activeFeature === feature.id;
              return (
                <li
                  key={feature.id}
                  style={{
                    ...styles.featureItem,
                    ...(isActive ? styles.featureItemActive : {}),
                  }}
                  onClick={() => onNavigate(category.id, feature.id)}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      Object.assign(e.currentTarget.style, styles.featureItemHover);
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {feature.label}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
