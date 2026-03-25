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
} from "../src/dev";

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
