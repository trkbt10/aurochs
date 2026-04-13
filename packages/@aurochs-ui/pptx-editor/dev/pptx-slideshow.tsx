/** @file Development entry point for the PPTX slideshow preview. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { PptxSlideshowPreviewPage } from "../src/dev/PptxSlideshowPreviewPage";

injectCSSVariables();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PptxSlideshowPreviewPage />
  </StrictMode>,
);
