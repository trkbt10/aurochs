/**
 * @file Main entry for the pages demo app.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { EditorConfigProvider } from "@oxen-ui/pptx-editor";
import { App } from "./App";
import { createPagesFontCatalog } from "./fonts/pages-font-catalog";
import "./styles/globals.css";

const fontCatalog = createPagesFontCatalog();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <EditorConfigProvider config={{ locale: "en-US", fontCatalog }}>
        <App />
      </EditorConfigProvider>
    </HashRouter>
  </StrictMode>
);
