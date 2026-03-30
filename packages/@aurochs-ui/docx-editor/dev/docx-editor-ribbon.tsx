import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { DocxEditorPreviewPage } from "../src/dev/DocxEditorPreviewPage";

injectCSSVariables();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DocxEditorPreviewPage toolbarPanel="ribbon" />
  </StrictMode>,
);
