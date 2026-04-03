import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { getRouterMode, setupNativeApp } from "./mobile/capacitor";

const Router = getRouterMode() === "hash" ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);

void setupNativeApp();

window.requestAnimationFrame(() => {
  document.documentElement.dataset.appReady = "true";
  document.getElementById("app-boot")?.remove();
});
