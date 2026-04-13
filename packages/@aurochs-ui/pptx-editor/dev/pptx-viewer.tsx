/** @file Development entry point for the PPTX viewer application. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { PptxViewerPreviewPage } from "../src/dev/PptxViewerPreviewPage";

injectCSSVariables();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PptxViewerPreviewPage />
  </StrictMode>,
);
