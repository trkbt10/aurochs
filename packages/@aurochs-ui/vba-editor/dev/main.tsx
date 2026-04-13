/** @file Development entry point for the VBA editor application. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { VbaEditorPreviewPage } from "../src/dev/VbaEditorPreviewPage";

injectCSSVariables();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VbaEditorPreviewPage />
  </StrictMode>,
);
