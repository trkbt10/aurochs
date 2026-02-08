/**
 * @file DrawingML Demo App
 *
 * Main application component with sidebar navigation.
 */

import { useState, useCallback } from "react";
import { DrawingMLProvider } from "../../src/react/context";
import { categories, getDefaultRoute, findFeature } from "../routes";
import { testColorContext } from "../fixtures";
import { Sidebar } from "./components/Sidebar";
import { FeatureView } from "./components/FeatureView";
import type { Category } from "../types";

const styles = {
  app: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
  },
  header: {
    padding: "16px 24px",
    borderBottom: "1px solid #333",
    background: "#16213e",
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  title: {
    fontSize: "20px",
    fontWeight: 600,
  },
  subtitle: {
    fontSize: "14px",
    color: "#94a3b8",
  },
  main: {
    flex: 1,
    display: "flex",
  },
  content: {
    flex: 1,
    padding: "24px",
    overflowY: "auto" as const,
    background: "#1e1e2e",
  },
};

export function App() {
  const defaultRoute = getDefaultRoute();
  const [activeCategory, setActiveCategory] = useState<Category>(defaultRoute.category);
  const [activeFeature, setActiveFeature] = useState<string>(defaultRoute.feature);

  const handleNavigate = useCallback((category: Category, feature: string) => {
    setActiveCategory(category);
    setActiveFeature(feature);
  }, []);

  const feature = findFeature(activeCategory, activeFeature);
  const FeatureComponent = feature?.component;

  return (
    <DrawingMLProvider colorContext={testColorContext}>
      <div style={styles.app}>
        <header style={styles.header}>
          <h1 style={styles.title}>DrawingML Viewer</h1>
          <span style={styles.subtitle}>ECMA-376 DrawingML Rendering Tests</span>
        </header>

        <main style={styles.main}>
          <Sidebar
            categories={categories}
            activeCategory={activeCategory}
            activeFeature={activeFeature}
            onNavigate={handleNavigate}
          />
          <div style={styles.content}>
            <FeatureView
              feature={feature}
              FeatureComponent={FeatureComponent}
            />
          </div>
        </main>
      </div>
    </DrawingMLProvider>
  );
}
