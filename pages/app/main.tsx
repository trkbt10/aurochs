/**
 * @file Main entry for the pages demo app.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { EditorConfigProvider } from "@aurochs-ui/pptx-editor";
import { FontCatalogProvider } from "@aurochs-ui/editor-controls/font";
import { App } from "./App";
import { createPagesFontCatalog } from "./fonts/pages-font-catalog";
import "./styles/globals.css";

const fontCatalog = createPagesFontCatalog();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <FontCatalogProvider fontCatalog={fontCatalog}>
        <EditorConfigProvider config={{ locale: "en-US" }}>
          <App />
        </EditorConfigProvider>
      </FontCatalogProvider>
    </HashRouter>
  </StrictMode>,
);
