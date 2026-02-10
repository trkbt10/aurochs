/**
 * @file Standalone entry point for the Editor Controls preview.
 *
 * Host requirements:
 * - injectCSSVariables(): provides --bg-primary, --text-primary, --border-subtle, etc.
 * - HashRouter: dev pages use NavLink, Outlet, useNavigate
 * - body { margin: 0 }: EditorControlsLayout uses height:100vh
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import {
  EditorControlsLayout,
  EditorControlsIndexPage,
  TextEditorsPage,
  SurfaceEditorsPage,
  TableEditorsPage,
} from "@aurochs-ui/editor-controls/dev";

injectCSSVariables();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<EditorControlsLayout onBack={() => window.history.back()} />}>
          <Route index element={<EditorControlsIndexPage />} />
          <Route path="text" element={<TextEditorsPage />} />
          <Route path="surface" element={<SurfaceEditorsPage />} />
          <Route path="table" element={<TableEditorsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);
