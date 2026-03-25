import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { XlsxViewerPreviewPage } from "../src/dev/XlsxViewerPreviewPage";

injectCSSVariables();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <XlsxViewerPreviewPage />
  </StrictMode>,
);
