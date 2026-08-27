import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import AuthGate from "./components/AuthGate";
import "./index.css";

import {
  registerSectionAMigrationCommand,
} from "./migrations/historical/sectionA.command";

registerSectionAMigrationCommand();

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    'React root element "#root" was not found.'
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>
);
