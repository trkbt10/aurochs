/**
 * @file DrawingML Test Page
 *
 * Schema-driven test page for DrawingML rendering features.
 * Uses nested routes for navigation between categories and features.
 *
 * @see ECMA-376 Part 1, Section 20.1 - DrawingML
 */

import { Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { RenderProvider } from "@lib/pptx/render/react/context";
import { SvgDefsProvider } from "@lib/pptx/render/react/hooks/useSvgDefs";
import { testSlideSize, testColorContext } from "./drawing-ml-tests";
import { categories, findCategory, findFeature, getDefaultRoute } from "./drawing-ml-tests/routes";
import "./DrawingMLTestPage.css";

// =============================================================================
// Types
// =============================================================================

type DrawingMLTestPageProps = {
  readonly onBack: () => void;
};

const basePath = "/drawing-ml";

// =============================================================================
// Layout Component
// =============================================================================

function TestLayout({ onBack }: { onBack: () => void }) {
  const { category: categoryId, feature: featureId } = useParams<{ category: string; feature: string }>();
  const navigate = useNavigate();

  const category = findCategory(categoryId ?? "");
  const feature = findFeature(categoryId ?? "", featureId ?? "");

  if (!category || !feature) {
    const def = getDefaultRoute();
    return <Navigate to={`${basePath}/${def.category}/${def.feature}`} replace />;
  }

  const FeatureComponent = feature.component;

  return (
    <div className="drawingml-test-page">
      {/* Header */}
      <header className="test-header">
        <button className="back-button" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="header-info">
          <h1 className="test-title">DrawingML Test</h1>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="test-navbar">
        {/* Category Tabs (left) */}
        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`category-tab ${cat.id === categoryId ? "active" : ""}`}
              onClick={() => navigate(`${basePath}/${cat.id}/${cat.features[0].id}`)}
            >
              <span className="category-icon">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Feature Tabs (right) */}
        <div className="feature-tabs">
          {category.features.map((feat) => (
            <button
              key={feat.id}
              className={`feature-tab ${feat.id === featureId ? "active" : ""}`}
              onClick={() => navigate(`${basePath}/${categoryId}/${feat.id}`)}
            >
              {feat.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="test-content">
        <FeatureComponent />
      </main>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DrawingMLTestPage({ onBack }: DrawingMLTestPageProps) {
  const defaultRoute = getDefaultRoute();

  return (
    <RenderProvider slideSize={testSlideSize} colorContext={testColorContext}>
      <SvgDefsProvider>
        <Routes>
          <Route path=":category/:feature" element={<TestLayout onBack={onBack} />} />
          <Route path="*" element={<Navigate to={`${basePath}/${defaultRoute.category}/${defaultRoute.feature}`} replace />} />
        </Routes>
      </SvgDefsProvider>
    </RenderProvider>
  );
}
