/**
 * @file Standalone entry point for the XLSX Editor preview.
 *
 * Host requirements (derived from XlsxEditorLayout and child components):
 * - injectCSSVariables(): provides --bg-primary, --text-primary, --border-subtle, etc.
 * - HashRouter: dev pages use NavLink, Outlet, useNavigate, useParams
 * - body { margin: 0 }: XlsxEditorLayout uses height:100vh
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import {
  XlsxEditorLayout,
  XlsxEditorIndexPage,
  XlsxWorkbookPage,
  XlsxFormulaCatalogLayout,
  XlsxFormulaCatalogIndexPage,
  XlsxFormulaFunctionPage,
} from "@aurochs-ui/xlsx-editor/dev";

injectCSSVariables();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<XlsxEditorLayout onBack={() => window.history.back()} />}>
          <Route index element={<XlsxEditorIndexPage />} />
          <Route path="workbook" element={<XlsxWorkbookPage />} />
          <Route path="formula" element={<XlsxFormulaCatalogLayout />}>
            <Route index element={<XlsxFormulaCatalogIndexPage />} />
            <Route path=":functionName" element={<XlsxFormulaFunctionPage />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);
