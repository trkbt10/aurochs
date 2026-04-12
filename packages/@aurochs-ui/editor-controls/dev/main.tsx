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
  RibbonMenuPreviewPage,
  EditorShellPage,
} from "../src/dev";

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
          <Route path="shell" element={<EditorShellPage />} />
        </Route>
        <Route path="ribbon" element={<RibbonMenuPreviewPage />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
