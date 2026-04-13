/** @file Development entry point for the DOCX viewer application. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { DocxViewerPreviewPage } from "../src/dev/DocxViewerPreviewPage";

injectCSSVariables();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DocxViewerPreviewPage />
  </StrictMode>,
);
